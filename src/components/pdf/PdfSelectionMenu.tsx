import React, { useRef } from 'react';
import { Maximize, RefreshCw, Settings, Trash2, FileText } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

interface PdfSelectionMenuProps {
  currentPage: number;
  numPages: number;
  onOpenDocumentMode: () => void;
  onReplacePdf: (file: File) => void;
  onOpenProperties: () => void;
  onDelete: () => void;
}

export const PdfSelectionMenu: React.FC<PdfSelectionMenuProps> = ({
  currentPage,
  numPages,
  onOpenDocumentMode,
  onReplacePdf,
  onOpenProperties,
  onDelete,
}) => {
  const replaceInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex items-center gap-2 rounded-2xl bg-white/95 p-2 px-3 shadow-2xl backdrop-blur-md border border-neutral-200/90 text-xs font-semibold text-neutral-700 select-none animate-in fade-in slide-in-from-bottom-3 duration-200">
      {/* Badge & Page info */}
      <div className="flex items-center gap-1.5 text-indigo-600 font-bold border-r border-neutral-200 pr-3">
        <FileText className="w-4 h-4" />
        <span>PDF Page {currentPage} / {numPages}</span>
      </div>

      {/* Primary Action: Open Document Mode / Focus Mode */}
      <Tooltip label="Open Document Mode to read and annotate full PDF" side="top">
        <button
          onClick={onOpenDocumentMode}
          className="flex h-8 items-center gap-1.5 px-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-xs cursor-pointer"
        >
          <Maximize className="w-4 h-4" />
          <span>Open Document Mode</span>
        </button>
      </Tooltip>

      {/* Replace PDF */}
      <Tooltip label="Replace PDF File" side="top">
        <button
          onClick={() => replaceInputRef.current?.click()}
          className="flex h-8 items-center gap-1 px-2.5 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Replace</span>
        </button>
      </Tooltip>
      <input
        ref={replaceInputRef}
        type="file"
        accept=".pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onReplacePdf(file);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Properties */}
      <Tooltip label="PDF Properties" side="top">
        <button
          onClick={onOpenProperties}
          className="flex h-8 items-center gap-1 px-2.5 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Properties</span>
        </button>
      </Tooltip>

      {/* Delete */}
      <Tooltip label="Delete PDF Object" side="top">
        <button
          onClick={onDelete}
          className="flex h-8 items-center gap-1 px-2.5 rounded-xl border border-red-200 text-red-600 bg-red-50/50 hover:bg-red-100 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>
      </Tooltip>
    </div>
  );
};
