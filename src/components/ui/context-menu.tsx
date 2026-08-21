import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

/* ─── Context ───────────────────────────────────────────────────────── */

interface ContextMenuContextType {
  isOpen: boolean;
  position: { x: number; y: number };
  openMenu: (e: React.MouseEvent | MouseEvent, data?: any) => void;
  closeMenu: () => void;
  targetData: any;
}

const ContextMenuContext = createContext<ContextMenuContextType | null>(null);

export const useContextMenu = () => {
  const context = useContext(ContextMenuContext);
  if (!context) {
    throw new Error('useContextMenu must be used within a ContextMenu');
  }
  return context;
};

/* ─── Root Provider ─────────────────────────────────────────────────── */

interface ContextMenuProps {
  children: ReactNode;
  onOpenChange?: (open: boolean) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ children, onOpenChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [targetData, setTargetData] = useState<any>(null);

  const openMenu = useCallback(
    (e: React.MouseEvent | MouseEvent, data?: any) => {
      e.preventDefault();
      e.stopPropagation();

      const x = e.clientX;
      const y = e.clientY;

      setPosition({ x, y });
      setTargetData(data ?? null);
      setIsOpen(true);
      onOpenChange?.(true);
    },
    [onOpenChange]
  );

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  useEffect(() => {
    const handleCustomOpen = (e: any) => {
      const detail = e.detail;
      if (detail && typeof detail.x === 'number' && typeof detail.y === 'number') {
        setPosition({ x: detail.x, y: detail.y });
        setTargetData(detail.data ?? null);
        setIsOpen(true);
        onOpenChange?.(true);
      }
    };

    window.addEventListener('app:open-context-menu', handleCustomOpen as any);
    return () => {
      window.removeEventListener('app:open-context-menu', handleCustomOpen as any);
    };
  }, [onOpenChange]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    };

    const handleScroll = () => {
      closeMenu();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen, closeMenu]);

  return (
    <ContextMenuContext.Provider
      value={{
        isOpen,
        position,
        openMenu,
        closeMenu,
        targetData,
      }}
    >
      {children}
    </ContextMenuContext.Provider>
  );
};

/* ─── Trigger ───────────────────────────────────────────────────────── */

interface ContextMenuTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  data?: any;
  disabled?: boolean;
}

export const ContextMenuTrigger: React.FC<ContextMenuTriggerProps> = ({
  children,
  className,
  data,
  disabled = false,
  onContextMenu,
  ...props
}) => {
  const { openMenu } = useContextMenu();

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || e.altKey) return;
    e.preventDefault();
    onContextMenu?.(e);
    openMenu(e, data);
  };

  return (
    <div
      className={cn('select-none', className)}
      onContextMenu={handleContextMenu}
      {...props}
    >
      {children}
    </div>
  );
};

/* ─── Content ───────────────────────────────────────────────────────── */

interface ContextMenuContentProps {
  children: ReactNode;
  className?: string;
  width?: number | string;
}

export const ContextMenuContent: React.FC<ContextMenuContentProps> = ({
  children,
  className,
  width = 220,
}) => {
  const { isOpen, position, closeMenu } = useContextMenu();
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState({ x: position.x, y: position.y });

  useEffect(() => {
    if (!isOpen) return;

    // Adjust position so menu doesn't overflow screen boundaries
    const menuEl = menuRef.current;
    const menuWidth = menuEl ? menuEl.offsetWidth : 230;
    const menuHeight = menuEl ? menuEl.offsetHeight : 300;

    let x = position.x;
    let y = position.y;

    const padding = 8;

    if (x + menuWidth > window.innerWidth - padding) {
      x = Math.max(padding, window.innerWidth - menuWidth - padding);
    }

    if (y + menuHeight > window.innerHeight - padding) {
      y = Math.max(padding, window.innerHeight - menuHeight - padding);
    }

    setAdjustedPos({ x, y });
  }, [isOpen, position]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (e: MouseEvent | PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    // Close on any click outside
    window.addEventListener('pointerdown', handlePointerDownOutside, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDownOutside, true);
    };
  }, [isOpen, closeMenu]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.94, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -4 }}
            transition={{ type: 'spring', damping: 26, stiffness: 420, mass: 0.4 }}
            style={{
              position: 'fixed',
              left: `${adjustedPos.x}px`,
              top: `${adjustedPos.y}px`,
              width: typeof width === 'number' ? `${width}px` : width,
            }}
            className={cn(
              'pointer-events-auto flex flex-col rounded-2xl bg-surface/95 p-1.5 shadow-2xl backdrop-blur-md border border-border/90 text-text-primary select-none focus:outline-none',
              className
            )}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

/* ─── Submenu ───────────────────────────────────────────────────────── */

interface ContextMenuSubProps {
  children: ReactNode;
}

/**
 * Wrapper for a submenu. Contains a ContextMenuSubTrigger and ContextMenuSubContent.
 */
export const ContextMenuSub: React.FC<ContextMenuSubProps> = ({ children }) => {
  const [isSubOpen, setIsSubOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const openSub = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsSubOpen(true);
  }, []);

  const closeSub = useCallback(() => {
    setIsSubOpen(false);
  }, []);

  const scheduleClose = useCallback(() => {
    closeTimerRef.current = setTimeout(() => {
      setIsSubOpen(false);
    }, 150);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  return (
    <SubMenuContext.Provider
      value={{ isSubOpen, openSub, closeSub, scheduleClose, cancelClose, triggerRef }}
    >
      {children}
    </SubMenuContext.Provider>
  );
};

interface SubMenuContextType {
  isSubOpen: boolean;
  openSub: () => void;
  closeSub: () => void;
  scheduleClose: () => void;
  cancelClose: () => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}

const SubMenuContext = createContext<SubMenuContextType | null>(null);

const useSubMenu = () => {
  const ctx = useContext(SubMenuContext);
  if (!ctx) throw new Error('useSubMenu must be inside ContextMenuSub');
  return ctx;
};

interface ContextMenuSubTriggerProps {
  children: ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

/**
 * The trigger item that opens the submenu on hover / arrow-right.
 */
export const ContextMenuSubTrigger: React.FC<ContextMenuSubTriggerProps> = ({
  children,
  className,
  icon,
}) => {
  const { isSubOpen, openSub, scheduleClose, cancelClose, triggerRef } = useSubMenu();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openSub();
    }
  };

  return (
    <div
      ref={triggerRef}
      role="menuitem"
      aria-haspopup="true"
      aria-expanded={isSubOpen}
      tabIndex={0}
      onMouseEnter={() => {
        cancelClose();
        openSub();
      }}
      onMouseLeave={scheduleClose}
      onFocus={() => {
        cancelClose();
        openSub();
      }}
      onKeyDown={handleKeyDown}
      className={cn(
        'group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-all text-left cursor-pointer outline-none select-none',
        '[&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0',
        'text-text-primary hover:bg-surface-hover hover:text-text-primary active:scale-[0.99]',
        '[&>svg]:text-icon-muted group-hover:[&>svg]:text-text-primary',
        isSubOpen && 'bg-surface-active font-semibold',
        className
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
      <svg className="ml-auto h-3.5 w-3.5 text-icon-muted group-hover:text-text-primary transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  );
};

interface ContextMenuSubContentProps {
  children: ReactNode;
  className?: string;
  width?: number | string;
}

/**
 * The submenu content panel positioned adjacent to the trigger.
 */
export const ContextMenuSubContent: React.FC<ContextMenuSubContentProps> = ({
  children,
  className,
  width = 200,
}) => {
  const { isSubOpen, cancelClose, scheduleClose, closeSub, triggerRef } = useSubMenu();
  const subRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isSubOpen || !triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const subWidth = typeof width === 'number' ? width : 200;
    const subHeight = subRef.current?.offsetHeight || 200;
    const padding = 8;

    // Position to the right of the trigger by default
    let x = triggerRect.right + 4;
    let y = triggerRect.top;

    // Flip left if overflowing right viewport edge
    if (x + subWidth > window.innerWidth - padding) {
      x = triggerRect.left - subWidth - 4;
      // If flipping left also causes overflow (common on mobile), align to the right edge of the screen
      if (x < padding) {
        x = window.innerWidth - subWidth - padding;
      }
    }

    // Shift up if overflowing bottom viewport edge
    if (y + subHeight > window.innerHeight - padding) {
      y = Math.max(padding, window.innerHeight - subHeight - padding);
    }

    setPos({ x, y });
  }, [isSubOpen, triggerRef, width]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeSub();
      // Return focus to trigger
      triggerRef.current?.focus();
    }
  };

  if (!isSubOpen || typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      ref={subRef}
      initial={{ opacity: 0, x: -4, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -4, scale: 0.96 }}
      transition={{ type: 'spring', damping: 28, stiffness: 450, mass: 0.35 }}
      role="menu"
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
      onKeyDown={handleKeyDown}
      style={{
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: typeof width === 'number' ? `${width}px` : width,
        zIndex: 51,
      }}
      className={cn(
        'pointer-events-auto flex flex-col rounded-2xl bg-surface/95 p-1.5 shadow-2xl backdrop-blur-md border border-border/90 text-text-primary select-none focus:outline-none',
        className
      )}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {children}
    </motion.div>,
    document.body
  );
};

/* ─── Standard Primitives ───────────────────────────────────────────── */

export const ContextMenuGroup: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  return <div className={cn('flex flex-col gap-0.5', className)}>{children}</div>;
};

interface ContextMenuItemProps {
  children: ReactNode;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  icon?: React.ReactNode;
}

export const ContextMenuItem: React.FC<ContextMenuItemProps> = ({
  children,
  variant = 'default',
  disabled = false,
  onClick,
  className,
  icon,
}) => {
  const { closeMenu } = useContextMenu();

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
    closeMenu();
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-all text-left cursor-pointer outline-none select-none',
        '[&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0',
        variant === 'default' && [
          'text-text-primary hover:bg-surface-hover hover:text-text-primary active:scale-[0.99]',
          '[&>svg]:text-icon-muted group-hover:[&>svg]:text-text-primary',
        ],
        variant === 'destructive' && [
          'text-danger hover:bg-danger/10 hover:text-danger active:scale-[0.99]',
          '[&>svg]:text-danger group-hover:[&>svg]:text-danger',
        ],
        disabled && 'opacity-40 pointer-events-none cursor-not-allowed bg-transparent text-icon-muted hover:bg-transparent',
        className
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

export const ContextMenuSeparator: React.FC<{ className?: string }> = ({ className }) => {
  return <div className={cn('my-1 h-px bg-border', className)} />;
};

export const ContextMenuLabel: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  return (
    <div className={cn('px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-icon-muted', className)}>
      {children}
    </div>
  );
};

export const ContextMenuShortcut: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  return (
    <span className={cn('ml-auto text-[10px] font-mono font-semibold tracking-wider text-icon-muted group-hover:text-text-secondary transition-colors', className)}>
      {children}
    </span>
  );
};
