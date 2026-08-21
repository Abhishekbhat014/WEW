import React, { useEffect } from 'react';
import { AlertTriangle, Save, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RefreshWarningModalProps {
  isOpen: boolean;
  onSave: () => void;
  onReload: () => void;
  onCancel: () => void;
}

export const RefreshWarningModal: React.FC<RefreshWarningModalProps> = ({
  isOpen,
  onSave,
  onReload,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onCancel}
          />

          {/* Dialog Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="refresh-warning-dialog-title"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', damping: 26, stiffness: 420, mass: 0.4 }}
            className="relative z-10 flex w-full max-w-md flex-col rounded-2xl bg-surface p-6 shadow-2xl border border-border text-text-primary select-none focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onCancel}
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-lg text-icon-muted hover:bg-surface-hover hover:text-text-primary transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header / Icon */}
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-2xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-1 pr-6">
                <h3
                  id="refresh-warning-dialog-title"
                  className="text-base font-bold tracking-tight text-text-primary"
                >
                  Unsaved Changes
                </h3>
                <p className="text-xs font-normal leading-relaxed text-text-muted">
                  Reloading the page will reset the canvas and you will lose any unsaved changes. Would you like to save your work before reloading?
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-primary hover:bg-surface-hover hover:border-border-strong active:scale-95 transition-all cursor-pointer shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onReload}
                className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Without Saving</span>
              </button>
              <button
                type="button"
                onClick={onSave}
                className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent-hover active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
