import type { PdfPageRenderResult } from '../types/pdf';

// ------------------------------------------------------------------
// Diagnostics Tracking (Dev-only)
// ------------------------------------------------------------------
export const pdfDiagnostics = {
  activePdfDocuments: 0,
  cachedPdfCanvasCount: 0,
  cachedPdfCanvasBytes: 0,
  activePdfRenderTasks: 0,
  activePdfPreloads: 0,
  pendingPdfRegistrations: 0,
  pdfLifecycleGenerations: 0,
};
let pdfjsLibPromise: Promise<any> | null = null;
async function getPdfJsLib() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import('pdfjs-dist').then((pdfjs) => {
      if (typeof window !== 'undefined') {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version || '4.10.38'}/build/pdf.worker.min.mjs`;
      }
      return pdfjs;
    });
  }
  return pdfjsLibPromise;
}

// ------------------------------------------------------------------
// 1. Centralized PDF Registry & Lifecycle Management
// ------------------------------------------------------------------

interface PdfRegistryEntry {
  arrayBuffer: ArrayBuffer;
  loadingTask: any;
  pdfDoc: any;
  numPages: number;
  generation: number;
}

const pdfRegistry = new Map<string, PdfRegistryEntry>();
const pdfGenerations = new Map<string, number>();
const pendingRegistrations = new Map<string, Promise<{ numPages: number }>>();
export const pdfLifecycleControllers = new Map<string, AbortController>();
let pdfGenerationCounter = 0;

interface RenderOperation {
  operationId: number;
  pdfId: string;
  generation: number;
  cacheKey: string;
  renderTask: any;
}
const activeRenderTasks = new Map<number, RenderOperation>();
let renderOperationCounter = 0;

export async function registerPdf(pdfId: string, arrayBuffer: ArrayBuffer): Promise<{ numPages: number }> {
  if (pdfRegistry.has(pdfId)) {
    return { numPages: pdfRegistry.get(pdfId)!.numPages };
  }

  if (pendingRegistrations.has(pdfId)) {
    return pendingRegistrations.get(pdfId)!;
  }

  const generation = ++pdfGenerationCounter;
  pdfGenerations.set(pdfId, generation);
  pdfDiagnostics.pdfLifecycleGenerations++;

  const controller = new AbortController();
  pdfLifecycleControllers.set(pdfId, controller);

  let registrationPromise: Promise<{ numPages: number }>;
  
  registrationPromise = (async () => {
    try {
      const pdfjsLib = await getPdfJsLib();
      
      // Async boundary validation
      if (pdfGenerations.get(pdfId) !== generation) return { numPages: 0 };

      // We use the arrayBuffer directly as a view. PDF.js does not detach it in modern versions unless transferred.
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdfDoc = await loadingTask.promise;
      
      // Handle race: if another unregister/register happened while loading
      if (pdfGenerations.get(pdfId) !== generation) {
        pdfDoc.destroy();
        loadingTask.destroy();
        return { numPages: 0 };
      }
      
      pdfRegistry.set(pdfId, {
        arrayBuffer,
        loadingTask,
        pdfDoc,
        numPages: pdfDoc.numPages,
        generation
      });
      
      pdfDiagnostics.activePdfDocuments = pdfRegistry.size;
      return { numPages: pdfDoc.numPages };
    } finally {
      // Ensure we clean up the pending queue whether successful or failed, but ONLY if we are still the current generation
      if (
        pdfGenerations.get(pdfId) === generation &&
        // @ts-ignore\n        registrationPromise && 
        pendingRegistrations.get(pdfId) === registrationPromise
      ) {
        pendingRegistrations.delete(pdfId);
        pdfDiagnostics.pendingPdfRegistrations = pendingRegistrations.size;
      }
    }
  })();

  pendingRegistrations.set(pdfId, registrationPromise);
  pdfDiagnostics.pendingPdfRegistrations = pendingRegistrations.size;
  
  return registrationPromise;
}

export function unregisterPdf(pdfId: string) {
  // 0. Immediately invalidate generation so any resolving promises fail validation
  const newGeneration = ++pdfGenerationCounter;
  pdfGenerations.set(pdfId, newGeneration);

  // Abort active controller
  const controller = pdfLifecycleControllers.get(pdfId);
  if (controller) {
    controller.abort();
    pdfLifecycleControllers.delete(pdfId);
  }

  const entry = pdfRegistry.get(pdfId);
  if (entry) {
    // 1. Destroy document and workers (only if they belong to this stale generation)
    // entry is statically the old one, but we are just calling destroy on it
    if (typeof entry.pdfDoc.destroy === 'function') {
      entry.pdfDoc.destroy();
    }
    if (typeof entry.loadingTask.destroy === 'function') {
      entry.loadingTask.destroy();
    }
    
    // 2. Cancel active render tasks for this pdf
    for (const [opId, op] of Array.from(activeRenderTasks.entries())) {
      if (op.pdfId === pdfId) {
        if (op.renderTask && typeof op.renderTask.cancel === 'function') {
          op.renderTask.cancel();
        }
        activeRenderTasks.delete(opId);
      }
    }
    pdfDiagnostics.activePdfRenderTasks = activeRenderTasks.size;
    
    // 3. Remove from registry
    pdfRegistry.delete(pdfId);
    pdfDiagnostics.activePdfDocuments = pdfRegistry.size;

    // 4. Clear from LRU cache
    const keysToRemove = Array.from(pageRenderCache.keys()).filter(k => k.startsWith(`${pdfId}_`));
    for (const key of keysToRemove) {
      evictPageCacheEntry(key);
    }
  }
}

export function getPdfArrayBuffer(pdfId: string): ArrayBuffer | null {
  return pdfRegistry.get(pdfId)?.arrayBuffer || null;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return window.btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// ------------------------------------------------------------------
// 2. LRU Cache for Rendered Pages (HTMLCanvasElement)
// ------------------------------------------------------------------

interface CacheEntry {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  estimatedBytes: number;
}

const MAX_CACHE_SIZE = 20;
const MAX_CACHE_BYTES = 200 * 1024 * 1024; // 200MB
const pageRenderCache = new Map<string, CacheEntry>();

function getCacheKey(pdfId: string, pageNum: number, scale: number): string {
  return `${pdfId}_p${pageNum}_s${scale.toFixed(2)}`;
}

export function evictPageCacheEntry(key: string) {
  const entry = pageRenderCache.get(key);
  if (entry) {
    pdfDiagnostics.cachedPdfCanvasBytes -= entry.estimatedBytes;
    
    // Zero backing storage since these cached canvases are transient source canvases
    // and not retained permanently by the UI after eviction.
    entry.canvas.width = 0;
    entry.canvas.height = 0;
    
    pageRenderCache.delete(key);
    pdfDiagnostics.cachedPdfCanvasCount = pageRenderCache.size;
  }
}

function getFromCache(key: string): CacheEntry | undefined {
  if (!pageRenderCache.has(key)) return undefined;
  // Move to end to mark as most recently used
  const entry = pageRenderCache.get(key)!;
  pageRenderCache.delete(key);
  pageRenderCache.set(key, entry);
  return entry;
}

function addToCache(key: string, entry: CacheEntry): boolean {
  if (entry.estimatedBytes > MAX_CACHE_BYTES) {
    // Oversized page: do not cache. Caller must assume ownership.
    return false;
  }

  if (pageRenderCache.has(key)) {
    evictPageCacheEntry(key);
  }
  
  // Evict until we are under max limits
  while (
    pageRenderCache.size > 0 &&
    (pageRenderCache.size >= MAX_CACHE_SIZE || pdfDiagnostics.cachedPdfCanvasBytes + entry.estimatedBytes > MAX_CACHE_BYTES)
  ) {
    // Map iterates in insertion order, so the first key is the LRU
    const firstKey = pageRenderCache.keys().next().value;
    if (firstKey) evictPageCacheEntry(firstKey);
  }
  
  pageRenderCache.set(key, entry);
  pdfDiagnostics.cachedPdfCanvasCount = pageRenderCache.size;
  pdfDiagnostics.cachedPdfCanvasBytes += entry.estimatedBytes;
  return true;
}

// ------------------------------------------------------------------
// 3. Render Page to Canvas (with cancellation)
// ------------------------------------------------------------------

export async function renderPdfPageToCanvas(
  pdfId: string,
  pageNum: number,
  scale = 1.5,
  abortSignal?: AbortSignal,
  _drawBadge = false
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number; cached: boolean }> {
  
  if (abortSignal?.aborted) throw new DOMException('Aborted', 'AbortError');

  // Compute high-definition raster scale (accounting for devicePixelRatio and zoom scale)
  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  const targetRenderScale = Math.max(2.0, Math.min(4.5, scale * dpr * 1.5));

  const cacheKey = getCacheKey(pdfId, pageNum, targetRenderScale);
  const cached = getFromCache(cacheKey);
  if (cached) {
    return { ...cached, cached: true };
  }

  const entry = pdfRegistry.get(pdfId);
  if (!entry) {
    throw new Error(`PDF ${pdfId} not found in registry`);
  }

  const page = await entry.pdfDoc.getPage(pageNum);
  
  if (abortSignal?.aborted) throw new DOMException('Aborted', 'AbortError');

  // Unscaled 1.0 viewport for layout dimension calculations
  const unscaledViewport = page.getViewport({ scale: 1.0 });
  const unscaledWidth = Math.round(unscaledViewport.width);
  const unscaledHeight = Math.round(unscaledViewport.height);

  // High-definition render viewport for razor-sharp canvas drawing
  const renderViewport = page.getViewport({ scale: targetRenderScale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  const width = Math.round(renderViewport.width);
  const height = Math.round(renderViewport.height);
  canvas.width = width;
  canvas.height = height;

  if (context) {
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, width, height);

    const renderTask = page.render({
      canvasContext: context,
      viewport: renderViewport,
    });
    
    const operationId = ++renderOperationCounter;
    const operation: RenderOperation = {
      operationId,
      pdfId,
      generation: entry.generation,
      cacheKey,
      renderTask
    };
    
    activeRenderTasks.set(operationId, operation);
    pdfDiagnostics.activePdfRenderTasks = activeRenderTasks.size;

    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        renderTask.cancel();
        activeRenderTasks.delete(operationId);
        pdfDiagnostics.activePdfRenderTasks = activeRenderTasks.size;
      }, { once: true });
    }

    try {
      await renderTask.promise;
    } catch (e: any) {
      if (e.name === 'RenderingCancelledException') {
        throw new DOMException('Aborted', 'AbortError');
      }
      throw e;
    } finally {
      activeRenderTasks.delete(operationId);
      pdfDiagnostics.activePdfRenderTasks = activeRenderTasks.size;
    }
    
    // Ensure generation is still valid after await
    if (pdfGenerations.get(pdfId) !== entry.generation) {
      throw new DOMException('Aborted (Generation Mismatch)', 'AbortError');
    }
  }

  const result = { canvas, width: unscaledWidth, height: unscaledHeight, estimatedBytes: width * height * 4 };
  const wasCached = addToCache(cacheKey, result);
  
  return { ...result, cached: wasCached };
}

// ------------------------------------------------------------------
// 4. Backward Compatibility / Helpers
// ------------------------------------------------------------------

export async function renderPdfPage(
  arrayBuffer: ArrayBuffer,
  pageNum: number,
  scale = 1.5,
  pdfId = 'doc'
): Promise<PdfPageRenderResult> {
  await registerPdf(pdfId, arrayBuffer);
  const { canvas, width, height, cached } = await renderPdfPageToCanvas(pdfId, pageNum, scale, undefined, false);
  const dataUrl = canvas.toDataURL('image/png');
  
  if (!cached) {
    canvas.width = 0;
    canvas.height = 0;
  }
  
  return {
    dataUrl,
    width,
    height
  };
}

export async function preloadAdjacentPages(
  arrayBuffer: ArrayBuffer,
  currentPage: number,
  numPages: number,
  scale = 1.5,
  pdfId = 'doc',
  abortSignal?: AbortSignal
) {
  pdfDiagnostics.activePdfPreloads++;
  try {
    if (abortSignal?.aborted) return;
    
    await registerPdf(pdfId, arrayBuffer);
    if (abortSignal?.aborted) return;
    
    const targetPages = [];
    if (currentPage > 1) targetPages.push(currentPage - 1);
    if (currentPage < numPages) targetPages.push(currentPage + 1);

    for (const p of targetPages) {
      if (abortSignal?.aborted) return;
      const key = getCacheKey(pdfId, p, scale);
      if (!pageRenderCache.has(key)) {
        await renderPdfPageToCanvas(pdfId, p, scale, abortSignal, false);
      }
    }
  } catch (_) {
  } finally {
    pdfDiagnostics.activePdfPreloads--;
  }
}

/**
 * Compiles original PDF pages + annotation overlay layers into an annotated PDF using jsPDF
 */
export async function exportAnnotatedPdf(
  arrayBuffer: ArrayBuffer,
  pageAnnotations: Record<number, string>,
  numPages: number,
  filename: string
): Promise<void> {
  const tempPdfId = `export_${Date.now()}`;
  try {
    await registerPdf(tempPdfId, arrayBuffer);
    const { default: jsPDF } = await import('jspdf');
    let pdf: any = null;

    for (let p = 1; p <= numPages; p++) {
      const { canvas, width: w, height: h, cached } = await renderPdfPageToCanvas(tempPdfId, p, 2.0, undefined, false);
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // Check if page has annotations overlay canvas data
        const annotationData = pageAnnotations[p];
        if (annotationData) {
          const overlayImg = new Image();
          overlayImg.src = annotationData;
          await new Promise((resolve) => {
            overlayImg.onload = resolve;
            overlayImg.onerror = resolve;
          });
          ctx.drawImage(overlayImg, 0, 0, w, h);
        }
      }

      const pageDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      
      if (!cached) {
        canvas.width = 0;
        canvas.height = 0;
      }
      const orientation = w > h ? 'landscape' : 'portrait';

      if (!pdf) {
        pdf = new jsPDF({ orientation, unit: 'px', format: [w, h] });
      } else {
        pdf.addPage([w, h], orientation);
      }
      pdf.addImage(pageDataUrl, 'JPEG', 0, 0, w, h);
    }

    if (pdf) {
      pdf.save(`${filename}_annotated.pdf`);
    }
  } catch (err) {
    console.error('Error exporting annotated PDF:', err);
    alert('Failed to export annotated PDF. Please try again.');
  } finally {
    unregisterPdf(tempPdfId);
  }
}

export function downloadOriginalPdf(arrayBuffer: ArrayBuffer, filename: string) {
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCurrentPagePng(
  pageDataUrl: string,
  annotationDataUrl: string | null,
  width: number,
  height: number,
  filename: string,
  pageNum: number
) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const bgImg = new Image();
  bgImg.src = pageDataUrl;
  bgImg.onload = () => {
    ctx.drawImage(bgImg, 0, 0, width, height);

    if (annotationDataUrl) {
      const annImg = new Image();
      annImg.src = annotationDataUrl;
      annImg.onload = () => {
        ctx.drawImage(annImg, 0, 0, width, height);
        saveCanvasAsPng(canvas, `${filename}_page_${pageNum}.png`);
      };
    } else {
      saveCanvasAsPng(canvas, `${filename}_page_${pageNum}.png`);
    }
  };
}

function saveCanvasAsPng(canvas: HTMLCanvasElement, name: string) {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = name;
  a.click();
}
