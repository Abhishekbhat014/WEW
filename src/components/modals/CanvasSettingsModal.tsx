import React from 'react';
import { X, Sliders } from 'lucide-react';
import { CanvasPropertiesSection } from '../panels/inspector/CanvasPropertiesSection';

interface CanvasSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CanvasSettingsModal: React.FC<CanvasSettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-md flex-col rounded-2xl bg-surface shadow-2xl border border-border overflow-hidden text-text-primary animate-in zoom-in-95 duration-200 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-active text-text-primary border border-border shadow-2xs">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-foreground">Canvas Settings</h3>
              <p className="text-[11px] font-normal text-text-muted">Configure grid overlay, snap alignment, and canvas view</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-icon hover:bg-surface-hover hover:text-foreground transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <CanvasPropertiesSection />
        </div>

        {/* Clean Footer (without tips) */}
        <div className="flex items-center justify-end border-t border-border px-6 py-3.5 bg-surface">
          <button
            onClick={onClose}
            className="rounded-xl bg-accent px-5 py-2 text-xs font-bold text-white hover:bg-accent-hover active:scale-95 transition-all shadow-2xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
