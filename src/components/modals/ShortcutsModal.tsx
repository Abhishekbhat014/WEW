import React, { useState } from 'react';
import { X, Keyboard, Search, Sparkles } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  label: string;
  keys: string[];
  category: 'graph' | 'tools' | 'editing' | 'navigation' | 'layers';
}

const SHORTCUTS_DATA: ShortcutItem[] = [
  // Graph & Diagram System
  { label: 'Grow / Navigate Right', keys: ['Alt', '→'], category: 'graph' },
  { label: 'Grow / Navigate Left', keys: ['Alt', '←'], category: 'graph' },
  { label: 'Grow / Navigate Up', keys: ['Alt', '↑'], category: 'graph' },
  { label: 'Grow / Navigate Down', keys: ['Alt', '↓'], category: 'graph' },
  { label: 'Move Subtree & Branches', keys: ['Drag Node'], category: 'graph' },
  { label: 'Nudge Subtree & Branches', keys: ['Arrow Keys'], category: 'graph' },

  // Tools & Modes
  { label: 'Selection Tool', keys: ['V'], category: 'tools' },
  { label: 'Rectangle', keys: ['R', 'or', '1'], category: 'tools' },
  { label: 'Diamond', keys: ['2'], category: 'tools' },
  { label: 'Circle / Ellipse', keys: ['C', 'or', '3'], category: 'tools' },
  { label: 'Arrow / Connector', keys: ['A', 'or', '4'], category: 'tools' },
  { label: 'Line', keys: ['U', 'or', '5'], category: 'tools' },
  { label: 'Pencil (Freehand)', keys: ['P', 'or', '6'], category: 'tools' },
  { label: 'Highlighter / Marker', keys: ['M', 'or', '7'], category: 'tools' },
  { label: 'Speed Pen', keys: ['B'], category: 'tools' },
  { label: 'Laser Pointer', keys: ['L', 'or', '8'], category: 'tools' },
  { label: 'Text Tool', keys: ['T', 'or', '9'], category: 'tools' },
  { label: 'Eraser', keys: ['E', 'or', '0'], category: 'tools' },
  { label: 'Import Image', keys: ['I'], category: 'tools' },
  { label: 'Lock Selected Tool', keys: ['Q'], category: 'tools' },
  { label: 'Draw to Shape Mode', keys: ['S'], category: 'tools' },
  { label: 'Zen Mode Toggle', keys: ['Alt', 'Z'], category: 'tools' },
  { label: 'Fullscreen Toggle', keys: ['Alt', 'F'], category: 'tools' },

  // Editing & Actions
  { label: 'Copy Selected', keys: ['Ctrl', 'C'], category: 'editing' },
  { label: 'Cut Selected', keys: ['Ctrl', 'X'], category: 'editing' },
  { label: 'Paste Clipboard', keys: ['Ctrl', 'V'], category: 'editing' },
  { label: 'Duplicate Selected', keys: ['Ctrl', 'D'], category: 'editing' },
  { label: 'Delete Selected', keys: ['Del'], category: 'editing' },
  { label: 'Select All', keys: ['Ctrl', 'A'], category: 'editing' },
  { label: 'Group Selection', keys: ['Ctrl', 'G'], category: 'editing' },
  { label: 'Ungroup Selection', keys: ['Ctrl', 'Shift', 'G'], category: 'editing' },
  { label: 'Undo', keys: ['Ctrl', 'Z'], category: 'editing' },
  { label: 'Redo', keys: ['Ctrl', 'Y'], category: 'editing' },
  { label: 'Save Project (.webdraw)', keys: ['Ctrl', 'S'], category: 'editing' },
  { label: 'Export Project (PNG/SVG)', keys: ['Ctrl', 'Shift', 'E'], category: 'editing' },
  { label: 'Bold Text', keys: ['Ctrl', 'B'], category: 'editing' },
  { label: 'Italic Text', keys: ['Ctrl', 'I'], category: 'editing' },
  { label: 'Underline Text', keys: ['Ctrl', 'U'], category: 'editing' },
  { label: 'Strikethrough Text', keys: ['Ctrl', 'Shift', 'S'], category: 'editing' },
  { label: 'Canvas Context Menu', keys: ['Right Click'], category: 'editing' },
  { label: 'Quick Temporary Eraser', keys: ['Alt', 'Right Click'], category: 'editing' },
  { label: 'Deselect All / Exit', keys: ['Esc'], category: 'editing' },

  // Navigation & Grid
  { label: 'Toggle Grid Show / Hide', keys: ['Ctrl', "'"], category: 'navigation' },
  { label: 'Toggle Snap to Grid', keys: ['Ctrl', 'Shift', "'"], category: 'navigation' },
  { label: 'Increase Grid Size (+5px)', keys: [']'], category: 'navigation' },
  { label: 'Decrease Grid Size (-5px)', keys: ['['], category: 'navigation' },
  { label: '2D Canvas Pan', keys: ['Space', 'Drag'], category: 'navigation' },
  { label: 'Horizontal Pan', keys: ['Shift', 'Wheel'], category: 'navigation' },
  { label: 'Smooth Zoom In / Out', keys: ['Ctrl', 'Wheel'], category: 'navigation' },
  { label: 'Reset Zoom (100%)', keys: ['Ctrl', '0'], category: 'navigation' },
  { label: 'Controlled Refresh', keys: ['F5', 'or', 'Ctrl+R'], category: 'navigation' },

  // Layers & Arrange
  { label: 'Toggle Lock Shape', keys: ['Ctrl', 'L'], category: 'layers' },
  { label: 'Toggle Hide Shape', keys: ['Ctrl', 'H'], category: 'layers' },
  { label: 'Nudge Selection (1px)', keys: ['Arrow Keys'], category: 'layers' },
  { label: 'Nudge Selection (10px)', keys: ['Shift', 'Arrows'], category: 'layers' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'graph' | 'tools' | 'editing' | 'navigation' | 'layers'>('all');

  if (!isOpen) return null;

  const filteredShortcuts = SHORTCUTS_DATA.filter((item) => {
    const matchesTab = activeTab === 'all' || item.category === activeTab;
    const matchesSearch = item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keys.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="relative flex w-full max-w-2xl flex-col rounded-2xl bg-surface shadow-2xl border border-border overflow-hidden text-text-primary animate-in zoom-in-95 duration-200 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface">
          <div className="flex items-center gap-2.5 font-bold text-text-primary">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-active text-text-primary border border-border">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-foreground">Keyboard Shortcuts</h3>
              <p className="text-[11px] font-normal text-text-muted">Quick key bindings to speed up your workflow</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-icon hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-3 bg-surface">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-icon-muted" />
            <input
              type="text"
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-surface-active pl-8 pr-3 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 border border-border transition-all"
            />
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-surface-active p-1 rounded-xl text-[11px] font-medium border border-border/40">
            {(['all', 'graph', 'tools', 'editing', 'navigation', 'layers'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-2.5 py-1 capitalize transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-surface text-foreground font-bold shadow-2xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {tab === 'graph' ? 'Diagram' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="max-h-96 overflow-y-auto p-6 grid grid-cols-2 gap-3 custom-scrollbar">
          {filteredShortcuts.length > 0 ? (
            filteredShortcuts.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl bg-surface-active/30 px-3.5 py-2.5 border border-border hover:bg-surface-active hover:border-border-strong transition-all"
              >
                <span className="text-xs font-medium text-text-primary">{item.label}</span>
                <div className="flex items-center gap-1">
                  {item.keys.map((k, kIdx) => (
                    <kbd
                      key={kIdx}
                      className="min-w-5 h-5 px-1.5 flex items-center justify-center rounded-md bg-surface border border-border text-[10px] font-mono font-bold text-foreground shadow-2xs"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 py-8 text-center text-xs text-icon-muted">
              No shortcuts found matching &quot;{searchQuery}&quot;
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-3 bg-surface text-[11px] text-text-muted">
          <div className="flex items-center gap-1.5 text-text-primary font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-icon" />
            <span>Tip: Press V for Selection or 1-0 for drawing tools anytime</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-accent px-4 py-1.5 text-xs font-bold text-white hover:bg-accent-hover transition-colors shadow-2xs active:scale-95 cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
