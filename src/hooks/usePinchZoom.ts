import { useEffect, useRef } from 'react';

export function usePinchZoom(
  elementRef: React.RefObject<HTMLElement | null>,
  onZoomChange: (zoomFactor: number, centerX: number, centerY: number) => void
) {
  const initialDistance = useRef<number | null>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialDistance.current = Math.hypot(dx, dy);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDistance.current !== null) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDistance = Math.hypot(dx, dy);
        
        // Prevent division by zero
        if (initialDistance.current === 0) return;

        const zoomFactor = currentDistance / initialDistance.current;
        
        // Calculate the center point of the pinch relative to the element
        const rect = el.getBoundingClientRect();
        const centerX = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
        const centerY = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;

        onZoomChange(zoomFactor, centerX, centerY);
        
        initialDistance.current = currentDistance;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialDistance.current = null;
      }
    };

    // Need non-passive listeners to prevent default zooming/scrolling behavior
    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef, onZoomChange]);
}
