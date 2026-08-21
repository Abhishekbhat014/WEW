import React, { useEffect, useState } from 'react';
import * as fabric from 'fabric';
import { FolderOpen, HelpCircle } from 'lucide-react';
import logoUrl from '../../assets/logo.svg';
import { useCanvasContext } from '../../store/CanvasContext';

interface BlankCanvasOverlayProps {
  fabricCanvasRef: React.MutableRefObject<fabric.Canvas | null>;
  onOpen: () => void;
  onHelp: () => void;
}

export const BlankCanvasOverlay: React.FC<BlankCanvasOverlayProps> = ({
  fabricCanvasRef,
  onOpen,
  onHelp,
}) => {
  const [isEmpty, setIsEmpty] = useState(true);
  const { activeTool } = useCanvasContext();

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let activeCanvas: fabric.Canvas | null = null;
    
    const updateState = () => {
      if (activeCanvas) {
        setIsEmpty(activeCanvas.getObjects().length === 0);
      }
    };
    
    const checkCanvas = () => {
      if (fabricCanvasRef.current) {
        clearInterval(interval);
        activeCanvas = fabricCanvasRef.current;
        
        // Initial check
        updateState();
        
        // Subscribe to events
        activeCanvas.on('object:added', updateState);
        activeCanvas.on('object:removed', updateState);
        activeCanvas.on('path:created', updateState);
        // Excalidraw clears the screen immediately when drawing starts. WebDraw might emit path:created later.
        activeCanvas.on('mouse:down', () => {
          if (activeCanvas?.isDrawingMode) {
             setIsEmpty(false);
          }
        });
      }
    };
    
    interval = setInterval(checkCanvas, 100);
    
    return () => {
      clearInterval(interval);
      if (activeCanvas) {
        activeCanvas.off('object:added', updateState);
        activeCanvas.off('object:removed', updateState);
        activeCanvas.off('path:created', updateState);
      }
    };
  }, [fabricCanvasRef]);

  if (!isEmpty || activeTool !== 'select') return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-50 hidden sm:flex items-center justify-center">
      <div className="flex flex-col items-center justify-center pointer-events-auto max-w-lg text-center animate-in fade-in zoom-in-95 duration-500">
        
        <div className="flex items-center gap-3 mb-8 select-none opacity-90">
          <img src={logoUrl} alt="WebDraw Logo" className="w-12 h-12" />
          <h1 className="text-[2.5rem] font-black tracking-tight text-text-primary" style={{ fontFamily: 'Virgil, "Comic Sans MS", cursive' }}>
            WEBDRAW
          </h1>
        </div>

        <div className="mb-14 text-[17px] leading-snug text-text-muted select-none font-medium" style={{ fontFamily: 'Virgil, "Comic Sans MS", cursive' }}>
          <p>Your drawings are saved in your browser's storage.</p>
          <p>Browser storage can be cleared unexpectedly.</p>
          <p>Save your work to a file regularly to avoid losing it.</p>
        </div>

        <div className="flex flex-col w-65 mx-auto gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-surface-active text-text-primary transition-colors cursor-pointer group pointer-events-auto"
          >
            <div className="flex items-center gap-3">
              <FolderOpen className="w-4.5 h-4.5 text-icon-muted group-hover:text-text-primary transition-colors stroke-[2.5]" />
              <span className="text-[13px] font-medium" style={{ fontFamily: 'Virgil, "Comic Sans MS", cursive' }}>Open</span>
            </div>
            <span className="text-[11px] text-text-disabled" style={{ fontFamily: 'Virgil, "Comic Sans MS", cursive' }}>Ctrl+O</span>
          </button>
          
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onHelp(); }}
            className="flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-surface-active text-text-primary transition-colors cursor-pointer group pointer-events-auto"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-4.5 h-4.5 text-icon-muted group-hover:text-text-primary transition-colors stroke-[2.5]" />
              <span className="text-[13px] font-medium" style={{ fontFamily: 'Virgil, "Comic Sans MS", cursive' }}>Help</span>
            </div>
            <span className="text-[11px] text-text-disabled" style={{ fontFamily: 'Virgil, "Comic Sans MS", cursive' }}>?</span>
          </button>
        </div>
        
      </div>
    </div>
  );
};
