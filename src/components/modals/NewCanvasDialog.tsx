import React, { useEffect } from 'react';
import { X, FilePlus, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NewCanvasDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const NewCanvasDialog: React.FC<NewCanvasDialogProps> = ({
  isOpen,
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Dialog Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-canvas-dialog-title"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', damping: 26, stiffness: 420, mass: 0.4 }}
            className="relative z-10 flex w-full max-w-md flex-col rounded-2xl bg-surface p-6 shadow-2xl border border-border text-text-primary select-none focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-lg text-icon-muted hover:bg-surface-hover hover:text-text-primary transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header / Icon */}
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent border border-accent/20 shadow-2xs">
                <FilePlus className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-1 pr-6">
                <h3
                  id="new-canvas-dialog-title"
                  className="text-base font-bold tracking-tight text-text-primary"
                >
                  Create New Whiteboard?
                </h3>
                <p className="text-xs font-normal leading-relaxed text-text-muted">
                  Creating a new whiteboard will clear all existing shapes, drawings, and text from the canvas. Any unsaved progress will be cleared.
                </p>
              </div>
            </div>

            {/* Warning Callout */}
            <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-xs text-warning">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium text-[11px] leading-tight">
                Make sure you have exported or saved your current file if you need it later.
              </span>
            </div>

            {/* Action Buttons: Negative (Cancel) and Positive (Confirm) */}
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-primary hover:bg-surface-hover hover:border-border-strong active:scale-95 transition-all cursor-pointer shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent-hover active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                Create New Whiteboard
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
