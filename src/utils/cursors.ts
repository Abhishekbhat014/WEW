import type { ToolType } from '../types/canvas';

export const getGrabCursor = () => {
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M18 11V6a1.5 1.5 0 0 0-3 0v4.5M15 10.5V4a1.5 1.5 0 0 0-3 0v6.5M12 10.5V5a1.5 1.5 0 0 0-3 0v7.5M9 12.5V8.5a1.5 1.5 0 0 0-3 0v6.5c0 4 3 6.5 7 6.5s7-2.5 7-6.5V11z' fill='%23ffffff' stroke='%23000000' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 12 12, grab`;
};

export const getGrabbingCursor = () => {
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M18 11.5v2c0 4-3 6.5-7 6.5s-7-2.5-7-6.5v-3a1.5 1.5 0 0 1 3 0v.5M9 11v-1a1.5 1.5 0 0 1 3 0v1M12 11v-1a1.5 1.5 0 0 1 3 0v1M15 11v.5' fill='%23ffffff' stroke='%23000000' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 12 12, grabbing`;
};

const getCrosshairCursor = (isDark: boolean) => {
  const stroke = isDark ? '%2394A3B8' : '%23475569'; // neutral-400 : neutral-600
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='${stroke}' stroke-width='1.5'%3E%3Cline x1='12' y1='4' x2='12' y2='20'/%3E%3Cline x1='4' y1='12' x2='20' y2='12'/%3E%3Ccircle cx='12' cy='12' r='2' fill='%236366f1'/%3E%3C/svg%3E") 12 12, crosshair`;
};

const getLaserCursor = () => {
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='5' fill='none' stroke='%23ef4444' stroke-width='1.5'/%3E%3Ccircle cx='12' cy='12' r='2.5' fill='%23ef4444'/%3E%3C/svg%3E") 12 12, auto`;
};

const getPencilCursor = (isDark: boolean) => {
  const stroke = isDark ? '%23CBD5E1' : '%23334155'; // neutral-300 : neutral-700
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='${stroke}' stroke-width='1.5'%3E%3Cpath d='M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z'/%3E%3C/svg%3E") 2 22, crosshair`;
};

/**
 * Return standard browser or custom SVG cursor types matching professional design software.
 */
export function getToolCursor(tool: ToolType, isSpacePressed: boolean, isTextEditing: boolean = false): string {
  if (isSpacePressed) return getGrabCursor();
  if (isTextEditing) return 'default';

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  switch (tool) {
    case 'select':
      return 'default';
    case 'text':
      return 'text';
    case 'pencil':
    case 'pen':
      return getPencilCursor(isDark);
    case 'marker':
      return getCrosshairCursor(isDark);
    case 'eraser':
      return 'none';
    case 'laser':
      return getLaserCursor();
    case 'line':
    case 'arrow':
    case 'rectangle':
    case 'rounded-rect':
    case 'circle':
    case 'ellipse':
    case 'triangle':
    case 'polygon':
    case 'star':
    case 'diamond':
      return getCrosshairCursor(isDark);
    default:
      return 'default';
  }
}
