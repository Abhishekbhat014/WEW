import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { HighlightText } from '../../ui/inspector/HighlightText';

interface InspectorSectionProps {
  id: string;
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  /** Remove the bottom divider line (last section in panel) */
  noDivider?: boolean;
  searchQuery?: string;
  hasMatch?: boolean;
}

/**
 * Flat collapsible section header — no card wrapper, renders inline
 * inside the parent inspector panel. Supports auto-expansion and filtering when searching.
 */
export const InspectorSection: React.FC<InspectorSectionProps> = ({
  id,
  title,
  icon,
  defaultOpen = true,
  children,
  noDivider = false,
  searchQuery = '',
  hasMatch = true,
}) => {
  const key = `webdraw_section_${id}`;
  const [open, setOpen] = useState<boolean>(() => {
    const saved = sessionStorage.getItem(key);
    return saved !== null ? saved === 'true' : defaultOpen;
  });

  useEffect(() => {
    sessionStorage.setItem(key, String(open));
  }, [open, key]);

  const isSearching = searchQuery.trim().length > 0;

  // Hide section completely when user is searching and this section has no match
  if (isSearching && !hasMatch) {
    return null;
  }

  // When searching, auto-expand section if it has matches
  const effectiveOpen = isSearching ? true : open;

  return (
    <div className={noDivider ? 'border-0' : 'border-b border-border/40'}>
      {/* Section header row */}
      <button
        onClick={() => {
          if (!isSearching) setOpen(!open);
        }}
        className="group flex w-full items-center justify-between py-2.5 text-left cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          {icon && (
            <span className="text-accent transition-transform group-hover:scale-110">
              {icon}
            </span>
          )}
          <span className="text-[11px] font-semibold uppercase tracking-widest text-icon-muted group-hover:text-text-primary transition-colors">
            <HighlightText text={title} query={searchQuery} />
          </span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-icon-muted transition-transform duration-200 group-hover:text-text-primary ${
            effectiveOpen ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </button>

      {/* Section content */}
      {effectiveOpen && (
        <div className="pb-3 flex flex-col gap-3 animate-in fade-in duration-150">
          {children}
        </div>
      )}
    </div>
  );
};
