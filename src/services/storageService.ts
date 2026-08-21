import type { ProjectFile, GridConfig, Layer } from '../types/canvas';


export const storageService = {
  normalizeFilename(filename: string): string {
    const trimmed = filename.trim();
    if (!trimmed) return 'Untitled Drawing.webdraw';
    if (/\.(webdraw|json)$/i.test(trimmed)) {
      return trimmed;
    }
    return `${trimmed}.webdraw`;
  },

  /**
   * Save project file with normalized filename using native File System Access API or browser download fallback.
   * Returns true on successful save, false if user cancels OS picker or if save fails.
   */
  async saveProjectFile(project: ProjectFile, filename: string): Promise<boolean> {
    const normalizedName = this.normalizeFilename(filename);
    const cleanProjectName = normalizedName.replace(/\.(webdraw|json)$/i, '');

    const finalProject: ProjectFile = {
      ...project,
      metadata: {
        ...project.metadata,
        name: cleanProjectName,
        updatedAt: new Date().toISOString(),
      },
    };

    const jsonStr = JSON.stringify(finalProject, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });

    // Check if File System Access API is supported
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: normalizedName,
          types: [
            {
              description: 'WebDraw Project File (*.webdraw, *.json)',
              accept: {
                'application/json': ['.webdraw', '.json'],
              },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          // User explicitly cancelled the OS save picker: return false with zero state mutation or errors
          return false;
        }
        console.warn('Native showSaveFilePicker failed, using fallback download:', err);
      }
    }

    // Fallback: standard browser download link
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = normalizedName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (err) {
      console.error('Fallback save failed:', err);
      return false;
    }
  },

  /**
   * Export project file as downloadable .json
   */
  exportProjectJson(project: ProjectFile): void {
    const filename = `${project.metadata.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
    const jsonStr = JSON.stringify(project, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Read project file from uploaded JSON file
   */
  importProjectJson(file: File): Promise<ProjectFile> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content) as ProjectFile;
          if (!parsed.canvasData || !parsed.metadata) {
            throw new Error('Invalid project file structure');
          }
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  },

  /**
   * Create default project structure
   */
  createDefaultProject(name = 'Untitled Drawing'): ProjectFile {
    const defaultLayer: Layer = {
      id: 'layer-default',
      name: 'Layer 1',
      visible: true,
      locked: false,
      zIndex: 0,
    };

    const defaultGrid: GridConfig = {
      enabled: true,
      snapToGrid: false,
      size: 20,
      color: '#E2E8F0',
    };

    return {
      metadata: {
        id: `proj-${Date.now()}`,
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0',
      },
      grid: defaultGrid,
      layers: [defaultLayer],
      canvasData: JSON.stringify({ version: '5.3.0', objects: [] }),
    };
  },
};
