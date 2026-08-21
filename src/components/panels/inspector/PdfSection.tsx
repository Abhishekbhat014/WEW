import React, { useState, useEffect } from 'react';
import { useInspectorObject, type InspectorObjectCallbacks } from '../../../hooks/useInspectorObject';
import { NumberInput } from '../../ui/inspector/NumberInput';
import { HighlightText } from '../../ui/inspector/HighlightText';
import { Lock, Unlock, ExternalLink } from 'lucide-react';

interface PdfSectionProps extends InspectorObjectCallbacks {
  searchQuery?: string;
  onOpenPdfDocumentMode?: () => void;
  onSetPdfPage?: (page: number) => void;
  onToggleLock?: () => void;
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export const PdfGeneralSection: React.FC<PdfSectionProps> = ({
  searchQuery = '',
  onSetPdfPage,
  ...callbacks
}) => {
  const { selectedObject, updateProperty } = useInspectorObject(callbacks);
  const [name, setName] = useState('');

  useEffect(() => {
    if (selectedObject) {
      setName(selectedObject.name || 'PDF Document');
    }
  }, [selectedObject]);

  if (!selectedObject) return null;

  const currentPage = selectedObject.currentPage || 1;
  const numPages = selectedObject.numPages || 1;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold text-text-primary px-0.5">
          <HighlightText text="Name" query={searchQuery} />
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => updateProperty('name', name)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            }
          }}
          className="w-full h-8 rounded-lg border border-border bg-surface px-2.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all shadow-2xs"
          placeholder="Document Name"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-2.5">
        <NumberInput
          label={<HighlightText text="Current Page" query={searchQuery} />}
          value={currentPage}
          min={1}
          max={numPages}
          onChange={(val) => {
            if (onSetPdfPage) onSetPdfPage(val);
          }}
        />
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-text-primary px-0.5">
            <HighlightText text="Total Pages" query={searchQuery} />
          </span>
          <div className="flex h-8 items-center justify-center rounded-lg border border-border bg-surface-hover px-2.5 text-xs font-mono font-medium text-text-muted shadow-2xs">
            {numPages}
          </div>
        </div>
      </div>
    </div>
  );
};

export const PdfInteractionSection: React.FC<PdfSectionProps> = ({
  searchQuery = '',
  onToggleLock,
  ...callbacks
}) => {
  const { selectedObject } = useInspectorObject(callbacks);

  if (!selectedObject) return null;

  const isLocked = selectedObject.locked || false;

  return (
    <div className="grid grid-cols-1 gap-1.5">
      <button
        onClick={onToggleLock}
        className={`flex flex-col items-center justify-center gap-1 rounded-lg border py-1.5 transition-all shadow-2xs cursor-pointer ${
          isLocked
            ? 'border-amber-500/40 bg-amber-500/15 text-amber-500 font-medium'
            : 'border-border bg-surface text-text-primary hover:border-border-strong hover:bg-surface-hover'
        }`}
        title={isLocked ? 'Unlock PDF' : 'Lock PDF'}
      >
        {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
        <span className="text-[10px] font-normal">
          <HighlightText text={isLocked ? 'Unlock PDF' : 'Lock PDF'} query={searchQuery} />
        </span>
      </button>
    </div>
  );
};

export const PdfActionSection: React.FC<PdfSectionProps> = ({
  searchQuery = '',
  onOpenPdfDocumentMode,
}) => {
  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={onOpenPdfDocumentMode}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-accent/30 bg-accent/10 py-2 hover:bg-accent/20 transition-all text-text-primary font-medium shadow-2xs cursor-pointer"
      >
        <ExternalLink className="w-4 h-4" />
        <span className="text-xs">
          <HighlightText text="Open PDF Doc Mode" query={searchQuery} />
        </span>
      </button>
    </div>
  );
};

export const PdfInfoSection: React.FC<PdfSectionProps> = ({
  searchQuery = '',
  ...callbacks
}) => {
  const { selectedObject } = useInspectorObject(callbacks);

  if (!selectedObject) return null;

  const fileName = selectedObject.name || 'Unknown Document';
  const numPages = selectedObject.numPages || 1;
  const fileSize = selectedObject.pdfFileSize ? formatBytes(selectedObject.pdfFileSize) : 'Unknown Size';

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-2.5">
      <div className="flex justify-between items-center text-xs">
        <span className="text-text-muted font-medium"><HighlightText text="File Name" query={searchQuery} /></span>
        <span className="text-text-primary font-mono truncate max-w-30" title={fileName}>{fileName}</span>
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-text-muted font-medium"><HighlightText text="Total Pages" query={searchQuery} /></span>
        <span className="text-text-primary font-mono">{numPages}</span>
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-text-muted font-medium"><HighlightText text="File Size" query={searchQuery} /></span>
        <span className="text-text-primary font-mono">{fileSize}</span>
      </div>
    </div>
  );
};
