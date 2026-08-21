import React from 'react';

interface RotationBadgeProps {
  angle: number | null;
  position: { x: number; y: number } | null;
}

export const RotationBadge: React.FC<RotationBadgeProps> = ({ angle, position }) => {
  if (angle === null || !position) return null;

  // Format angle between -180 and 180 degrees
  let normalized = Math.round(angle % 360);
  if (normalized > 180) normalized -= 360;
  if (normalized < -180) normalized += 360;

  const displayAngle = `${normalized}°`;

  return (
    <div
      className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-full mb-3 px-2.5 py-1 bg-neutral-900/90 text-white text-xs font-semibold rounded-md shadow-lg backdrop-blur-sm transition-opacity duration-150 ease-out border border-neutral-700/50 flex items-center justify-center gap-1 select-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <span>{displayAngle}</span>
    </div>
  );
};
