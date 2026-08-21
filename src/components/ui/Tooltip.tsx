'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  type Transition,
} from 'motion/react';
import { cn } from '../../utils/cn';

export type Side = 'top' | 'bottom' | 'left' | 'right';
export type Align = 'start' | 'center' | 'end';

export type TooltipData = {
  content: React.ReactNode;
  rect: DOMRect;
  side: Side;
  sideOffset: number;
  align: Align;
  alignOffset: number;
  id: string;
  arrow: boolean;
};

export type GlobalTooltipContextType = {
  showTooltip: (data: TooltipData) => void;
  hideTooltip: () => void;
  currentTooltip: TooltipData | null;
  transition: Transition;
  globalId: string;
};

const GlobalTooltipContext = React.createContext<
  GlobalTooltipContextType | undefined
>(undefined);

export const useGlobalTooltip = () => {
  const context = React.useContext(GlobalTooltipContext);
  if (!context) {
    throw new Error('useGlobalTooltip must be used within a TooltipProvider');
  }
  return context;
};

export type TooltipPosition = {
  x: number;
  y: number;
  transform: string;
  initial: { x?: number; y?: number };
};

export function getTooltipPosition({
  rect,
  side,
  sideOffset,
  align,
  alignOffset,
}: {
  rect: DOMRect;
  side: Side;
  sideOffset: number;
  align: Align;
  alignOffset: number;
}): TooltipPosition {
  switch (side) {
    case 'top':
      if (align === 'start') {
        return {
          x: rect.left + alignOffset,
          y: rect.top - sideOffset,
          transform: 'translate(0, -100%)',
          initial: { y: 15 },
        };
      } else if (align === 'end') {
        return {
          x: rect.right + alignOffset,
          y: rect.top - sideOffset,
          transform: 'translate(-100%, -100%)',
          initial: { y: 15 },
        };
      } else {
        // center
        return {
          x: rect.left + rect.width / 2,
          y: rect.top - sideOffset,
          transform: 'translate(-50%, -100%)',
          initial: { y: 15 },
        };
      }
    case 'bottom':
      if (align === 'start') {
        return {
          x: rect.left + alignOffset,
          y: rect.bottom + sideOffset,
          transform: 'translate(0, 0)',
          initial: { y: -15 },
        };
      } else if (align === 'end') {
        return {
          x: rect.right + alignOffset,
          y: rect.bottom + sideOffset,
          transform: 'translate(-100%, 0)',
          initial: { y: -15 },
        };
      } else {
        // center
        return {
          x: rect.left + rect.width / 2,
          y: rect.bottom + sideOffset,
          transform: 'translate(-50%, 0)',
          initial: { y: -15 },
        };
      }
    case 'left':
      if (align === 'start') {
        return {
          x: rect.left - sideOffset,
          y: rect.top + alignOffset,
          transform: 'translate(-100%, 0)',
          initial: { x: 15 },
        };
      } else if (align === 'end') {
        return {
          x: rect.left - sideOffset,
          y: rect.bottom + alignOffset,
          transform: 'translate(-100%, -100%)',
          initial: { x: 15 },
        };
      } else {
        // center
        return {
          x: rect.left - sideOffset,
          y: rect.top + rect.height / 2,
          transform: 'translate(-100%, -50%)',
          initial: { x: 15 },
        };
      }
    case 'right':
      if (align === 'start') {
        return {
          x: rect.right + sideOffset,
          y: rect.top + alignOffset,
          transform: 'translate(0, 0)',
          initial: { x: -15 },
        };
      } else if (align === 'end') {
        return {
          x: rect.right + sideOffset,
          y: rect.bottom + alignOffset,
          transform: 'translate(0, -100%)',
          initial: { x: -15 },
        };
      } else {
        // center
        return {
          x: rect.right + sideOffset,
          y: rect.top + rect.height / 2,
          transform: 'translate(0, -50%)',
          initial: { x: -15 },
        };
      }
  }
}

export type TooltipProviderProps = {
  children: React.ReactNode;
  openDelay?: number;
  closeDelay?: number;
  transition?: Transition;
};

export function TooltipProvider({
  children,
  openDelay = 400,
  closeDelay = 150,
  transition = { type: 'spring', stiffness: 350, damping: 28 },
}: TooltipProviderProps) {
  const globalId = React.useId();
  const [currentTooltip, setCurrentTooltip] = React.useState<TooltipData | null>(null);
  const timeoutRef = React.useRef<number | null>(null);
  const lastCloseTimeRef = React.useRef<number>(0);

  const showTooltip = React.useCallback(
    (data: TooltipData) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (currentTooltip !== null) {
        setCurrentTooltip(data);
        return;
      }
      const now = Date.now();
      const delay = now - lastCloseTimeRef.current < closeDelay ? 0 : openDelay;
      timeoutRef.current = window.setTimeout(
        () => setCurrentTooltip(data),
        delay
      );
    },
    [openDelay, closeDelay, currentTooltip]
  );

  const hideTooltip = React.useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setCurrentTooltip(null);
      lastCloseTimeRef.current = Date.now();
    }, closeDelay);
  }, [closeDelay]);

  const hideImmediate = React.useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setCurrentTooltip(null);
    lastCloseTimeRef.current = Date.now();
  }, []);

  React.useEffect(() => {
    window.addEventListener('scroll', hideImmediate, true);
    return () => window.removeEventListener('scroll', hideImmediate, true);
  }, [hideImmediate]);

  return (
    <GlobalTooltipContext.Provider
      value={{
        showTooltip,
        hideTooltip,
        currentTooltip,
        transition,
        globalId,
      }}
    >
      <LayoutGroup>{children}</LayoutGroup>
      <TooltipOverlay />
    </GlobalTooltipContext.Provider>
  );
}

export type TooltipArrowProps = {
  side: Side;
};

export function TooltipArrow({ side }: TooltipArrowProps) {
  return (
    <div
      className={cn(
        'absolute bg-surface-elevated border border-border z-50 size-2 rotate-45 rounded-[1px]',
        (side === 'top' || side === 'bottom') && 'left-1/2 -translate-x-1/2',
        (side === 'left' || side === 'right') && 'top-1/2 -translate-y-1/2',
        side === 'top' && '-bottom-1',
        side === 'bottom' && '-top-1',
        side === 'left' && '-right-1',
        side === 'right' && '-left-1'
      )}
    />
  );
}

export type TooltipPortalProps = {
  children: React.ReactNode;
};

export function TooltipPortal({ children }: TooltipPortalProps) {
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => setIsMounted(true), []);
  return isMounted ? createPortal(children, document.body) : null;
}

export function TooltipOverlay() {
  const { currentTooltip, transition, globalId } = useGlobalTooltip();

  const position = React.useMemo(() => {
    if (!currentTooltip) return null;
    return getTooltipPosition({
      rect: currentTooltip.rect,
      side: currentTooltip.side,
      sideOffset: currentTooltip.sideOffset,
      align: currentTooltip.align,
      alignOffset: currentTooltip.alignOffset,
    });
  }, [currentTooltip]);

  return (
    <AnimatePresence>
      {currentTooltip && currentTooltip.content && position && (
        <TooltipPortal>
          <motion.div
            data-slot="tooltip-overlay-container"
            className="fixed z-99999 pointer-events-none"
            style={{
              top: position.y,
              left: position.x,
              transform: position.transform,
            }}
          >
            <motion.div
              data-slot="tooltip-overlay"
              layoutId={`tooltip-overlay-${globalId}`}
              initial={{ opacity: 0, scale: 0.9, ...position.initial }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, ...position.initial }}
              transition={transition}
              className="relative rounded-lg bg-surface-elevated/95 backdrop-blur-md border border-border px-2.5 py-1 text-xs font-medium text-foreground shadow-2xl w-fit whitespace-nowrap flex items-center gap-1.5 select-none"
            >
              {currentTooltip.content}

              {currentTooltip.arrow && (
                <TooltipArrow side={currentTooltip.side} />
              )}
            </motion.div>
          </motion.div>
        </TooltipPortal>
      )}
    </AnimatePresence>
  );
}

export type TooltipContextType = {
  content: React.ReactNode;
  setContent: React.Dispatch<React.SetStateAction<React.ReactNode>>;
  arrow: boolean;
  setArrow: React.Dispatch<React.SetStateAction<boolean>>;
  side: Side;
  sideOffset: number;
  align: Align;
  alignOffset: number;
  id: string;
};

const TooltipContext = React.createContext<TooltipContextType | undefined>(
  undefined
);

export const useTooltip = () => {
  const context = React.useContext(TooltipContext);
  if (!context) {
    throw new Error('useTooltip must be used within a TooltipProvider');
  }
  return context;
};

export type TooltipProps = {
  children: React.ReactNode;
  side?: Side;
  sideOffset?: number;
  align?: Align;
  alignOffset?: number;
  label?: React.ReactNode;
  shortcut?: string;
  content?: React.ReactNode;
  arrow?: boolean;
};

export function Tooltip({
  children,
  side = 'top',
  sideOffset = 8,
  align = 'center',
  alignOffset = 0,
  label,
  shortcut,
  content: directContent,
  arrow = true,
}: TooltipProps) {
  const id = React.useId();
  
  // Calculate initial content if label/shortcut or directContent prop is provided
  const initialContent = React.useMemo(() => {
    if (label !== undefined) {
      return (
        <span className="flex items-center gap-1.5">
          <span>{label}</span>
          {shortcut && (
            <kbd className="hidden sm:inline-block rounded bg-surface border border-border px-1.5 py-0.2 text-[10px] font-mono font-semibold text-icon-muted">
              {shortcut}
            </kbd>
          )}
        </span>
      );
    }
    return directContent || null;
  }, [label, shortcut, directContent]);

  const [content, setContent] = React.useState<React.ReactNode>(initialContent);
  const [arrowState, setArrowState] = React.useState(arrow);

  React.useEffect(() => {
    if (initialContent !== null) {
      setContent(initialContent);
    }
  }, [initialContent]);

  React.useEffect(() => {
    setArrowState(arrow);
  }, [arrow]);

  // Check if children is a single element that should be wrapped as Trigger
  const isShorthand = (label !== undefined || directContent !== undefined) && React.isValidElement(children);

  return (
    <TooltipContext.Provider
      value={{
        content,
        setContent,
        arrow: arrowState,
        setArrow: setArrowState,
        side,
        sideOffset,
        align,
        alignOffset,
        id,
      }}
    >
      {isShorthand ? (
        <TooltipTrigger>{children}</TooltipTrigger>
      ) : (
        children
      )}
    </TooltipContext.Provider>
  );
}

export type TooltipContentProps = {
  children: React.ReactNode;
  arrow?: boolean;
};

export function TooltipContent({ children, arrow = true }: TooltipContentProps) {
  const { setContent, setArrow } = useTooltip();
  React.useEffect(() => {
    setContent(children);
    setArrow(arrow);
  }, [children, setContent, setArrow, arrow]);
  return null;
}

export type TooltipTriggerProps = {
  children: React.ReactElement;
};

export function TooltipTrigger({ children }: TooltipTriggerProps) {
  const { content, side, sideOffset, align, alignOffset, id, arrow } = useTooltip();
  const { showTooltip, hideTooltip, currentTooltip } = useGlobalTooltip();
  const triggerRef = React.useRef<HTMLElement>(null);

  const handleOpen = React.useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    showTooltip({
      content,
      rect,
      side,
      sideOffset,
      align,
      alignOffset,
      id,
      arrow,
    });
  }, [showTooltip, content, side, sideOffset, align, alignOffset, id, arrow]);

  const handleMouseEnter = React.useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      (children.props as React.HTMLAttributes<HTMLElement>)?.onMouseEnter?.(e);
      handleOpen();
    },
    [handleOpen, children.props]
  );

  const handleMouseLeave = React.useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      (children.props as React.HTMLAttributes<HTMLElement>)?.onMouseLeave?.(e);
      hideTooltip();
    },
    [hideTooltip, children.props]
  );

  const handleFocus = React.useCallback(
    (e: React.FocusEvent<HTMLElement>) => {
      (children.props as React.HTMLAttributes<HTMLElement>)?.onFocus?.(e);
      handleOpen();
    },
    [handleOpen, children.props]
  );

  const handleBlur = React.useCallback(
    (e: React.FocusEvent<HTMLElement>) => {
      (children.props as React.HTMLAttributes<HTMLElement>)?.onBlur?.(e);
      hideTooltip();
    },
    [hideTooltip, children.props]
  );

  React.useEffect(() => {
    if (currentTooltip?.id !== id) return;
    if (!triggerRef.current) return;

    if (currentTooltip.content === content && currentTooltip.arrow === arrow)
      return;

    const rect = triggerRef.current.getBoundingClientRect();
    showTooltip({
      content,
      rect,
      side,
      sideOffset,
      align,
      alignOffset,
      id,
      arrow,
    });
  }, [content, arrow, currentTooltip?.id, currentTooltip?.content, currentTooltip?.arrow, align, alignOffset, id, showTooltip, side, sideOffset]);

  const setRefs = React.useCallback(
    (node: HTMLElement | null) => {
      (triggerRef as React.MutableRefObject<HTMLElement | null>).current = node;
      const childRef = (children as any)?.ref;
      if (typeof childRef === 'function') {
        childRef(node);
      } else if (childRef && typeof childRef === 'object') {
        childRef.current = node;
      }
    },
    [children]
  );

  return React.cloneElement(children, {
    ref: setRefs,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
    'data-state': currentTooltip?.id === id ? 'open' : 'closed',
    'data-side': side,
    'data-align': align,
    'data-slot': 'tooltip-trigger',
  } as React.HTMLAttributes<HTMLElement>);
}
