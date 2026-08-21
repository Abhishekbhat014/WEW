import React, { useState, useEffect } from 'react';
import {
  Layers as LayersIcon,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Check,
  Edit2,
  X,
  GripVertical,
  AlertTriangle,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { useCanvasContext } from '../../store/CanvasContext';
import { getValidatedObjectInfo } from '../../utils/objectRegistry';

interface LayersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onGetLayerObjectCount?: (layerId: string) => number;
  onDeleteLayerObjects?: (layerId: string) => void;
  onGetCanvasObjects?: () => any[];
  onMoveCanvasObject?: (sourceId: string, targetId: string, position: 'inside' | 'before' | 'after' | 'layer', targetLayerId?: string) => void;
  onSelectObject?: (id: string) => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = React.memo(({
  isOpen,
  onClose,
  onGetLayerObjectCount,
  onDeleteLayerObjects,
  onGetCanvasObjects,
  onMoveCanvasObject,
  onSelectObject,
}) => {
  const {
    layers,
    activeLayerId,
    setActiveLayerId,
    addLayer,
    removeLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    renameLayer,
    reorderLayers,
  } = useCanvasContext();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  
  // Drag state for layers
  const [draggedLayerIndex, setDraggedLayerIndex] = useState<number | null>(null);
  
  // Drag state for objects
  const [draggedObjectId, setDraggedObjectId] = useState<string | null>(null);
  const [dragOverObjectId, setDragOverObjectId] = useState<{ id: string, position: 'inside' | 'before' | 'after' } | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string; count: number } | null>(null);

  const [canvasObjects, setCanvasObjects] = useState<any[]>([]);
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    const fetchObjects = () => {
      if (onGetCanvasObjects) {
         setCanvasObjects(onGetCanvasObjects());
      }
    };
    fetchObjects();
    window.addEventListener('app:canvas-changed', fetchObjects);
    return () => window.removeEventListener('app:canvas-changed', fetchObjects);
  }, [isOpen, onGetCanvasObjects]);

  // Auto-expand active layer when opened
  useEffect(() => {
    if (isOpen && activeLayerId) {
      setExpandedLayers(prev => new Set(prev).add(activeLayerId));
    }
  }, [isOpen, activeLayerId]);

  if (!isOpen) return null;

  const startRename = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const saveRename = (id: string) => {
    if (editingName.trim()) {
      renameLayer(id, editingName.trim());
    }
    setEditingId(null);
  };

  // --- Layer Drag & Drop ---
  const handleLayerDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedLayerIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleLayerDragOver = (e: React.DragEvent, layerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedObjectId) {
      setDragOverLayerId(layerId);
      e.dataTransfer.dropEffect = 'move';
    } else {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleLayerDrop = (e: React.DragEvent, targetIndex: number, layerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedObjectId) {
      onMoveCanvasObject?.(draggedObjectId, '', 'layer', layerId);
      setDraggedObjectId(null);
      setDragOverLayerId(null);
    } else if (draggedLayerIndex !== null && draggedLayerIndex !== targetIndex) {
      reorderLayers(draggedLayerIndex, targetIndex);
      setDraggedLayerIndex(null);
    }
  };

  const handleLayerDragLeave = () => {
    setDragOverLayerId(null);
  };

  // --- Object Drag & Drop ---
  const handleObjectDragStart = (e: React.DragEvent, objId: string) => {
    e.stopPropagation();
    setDraggedObjectId(objId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleObjectDragOver = (e: React.DragEvent, targetId: string, isGroup: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedObjectId || draggedObjectId === targetId) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    let position: 'inside' | 'before' | 'after' = 'after';
    
    if (isGroup) {
      if (y < rect.height * 0.25) position = 'before';
      else if (y > rect.height * 0.75) position = 'after';
      else position = 'inside';
    } else {
      if (y < rect.height / 2) position = 'before';
      else position = 'after';
    }

    setDragOverObjectId({ id: targetId, position });
  };

  const handleObjectDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedObjectId && dragOverObjectId && draggedObjectId !== targetId) {
      onMoveCanvasObject?.(draggedObjectId, targetId, dragOverObjectId.position);
    }
    setDraggedObjectId(null);
    setDragOverObjectId(null);
  };

  const handleObjectDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDragOverObjectId(null);
  };

  const handleDeleteClick = (id: string, name: string) => {
    const count = onGetLayerObjectCount ? onGetLayerObjectCount(id) : 0;
    if (count > 0) {
      setConfirmDelete({ id, name, count });
    } else {
      onDeleteLayerObjects?.(id);
      removeLayer(id);
    }
  };

  const confirmAndRemoveLayer = () => {
    if (!confirmDelete) return;
    onDeleteLayerObjects?.(confirmDelete.id);
    removeLayer(confirmDelete.id);
    setConfirmDelete(null);
  };

  const toggleLayerExpand = (id: string) => {
    setExpandedLayers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroupExpand = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };



  const renderObjectTree = (objects: any[], depth = 0) => {
    // Reverse so top-most objects appear at the top of the layer list
    return [...objects].reverse().map((obj, idx) => {
      const objId = obj.id || `obj-${idx}`;
      const objInfo = getValidatedObjectInfo(obj);
      const isGroup = objInfo.shapeType === 'group';
      const isExpanded = expandedGroups.has(objId);
      
      const isDragOver = dragOverObjectId?.id === objId;
      const dropPosition = isDragOver && dragOverObjectId ? dragOverObjectId.position : null;
      
      return (
        <div key={objId} className="flex flex-col">
          {isDragOver && dropPosition === 'before' && (
            <div className="h-0.5 bg-indigo-500 rounded-full mx-2 my-0.5" />
          )}
          
          <div 
            draggable
            onClick={() => onSelectObject?.(objId)}
            onDragStart={(e) => handleObjectDragStart(e, objId)}
            onDragOver={(e) => handleObjectDragOver(e, objId, isGroup)}
            onDrop={(e) => handleObjectDrop(e, objId)}
            onDragLeave={handleObjectDragLeave}
            className={`flex items-center gap-1.5 py-1 px-2 rounded-lg cursor-pointer transition-colors
              ${depth > 0 ? 'ml-4 border-l-2 border-border/40 pl-2' : 'ml-2'}
              ${obj.isActive ? 'bg-surface-active border border-border-strong text-foreground font-semibold shadow-2xs' : 'hover:bg-surface-hover border border-transparent text-text-primary'}
              ${isDragOver && dropPosition === 'inside' ? 'bg-surface-active ring-1 ring-border-strong' : ''}
              ${draggedObjectId === objId ? 'opacity-40' : ''}
            `}
          >
            {isGroup ? (
              <button 
                onClick={(e) => { e.stopPropagation(); toggleGroupExpand(objId); }}
                className="text-icon-muted hover:text-foreground w-4 flex justify-center shrink-0 transition-colors"
              >
                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            ) : (
              <div className="w-4" />
            )}
            <div className={obj.isActive ? "text-foreground" : "text-icon"}>
              {objInfo.icon}
            </div>
            <span className={`text-[11px] truncate flex-1 ${obj.isActive ? 'text-foreground font-bold' : 'text-text-primary font-medium'}`}>{objInfo.displayName}</span>
          </div>

          {isDragOver && dropPosition === 'after' && (
            <div className="h-0.5 bg-indigo-500 rounded-full mx-2 my-0.5" />
          )}

          {isGroup && isExpanded && obj.objects && (
            <div className="flex flex-col mt-0.5">
              {renderObjectTree(obj.objects, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <>
      <aside
        data-canvas-ui="true"
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="absolute right-4 top-20 z-30 pointer-events-auto flex w-72 flex-col gap-3 rounded-2xl bg-surface/97 p-4 shadow-2xl backdrop-blur-xl border border-border text-xs text-text-primary select-none animate-in fade-in slide-in-from-right-3 duration-200"
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-surface-active text-text-primary border border-border">
              <LayersIcon className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-foreground text-xs tracking-tight">Layers</span>
            <span className="rounded-full bg-surface-active px-2 py-0.5 text-[10px] font-bold text-text-primary border border-border">
              {layers.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => addLayer()}
              className="flex h-7 items-center gap-1 rounded-xl bg-accent px-2.5 font-bold text-white shadow-xs hover:bg-accent-hover active:scale-95 transition-all text-[11px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-xl text-icon hover:bg-surface-hover hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Layer List Container */}
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-0.5 custom-scrollbar pb-2">
          {layers.map((layer, index) => {
            const isActive = layer.id === activeLayerId;
            const layerObjects = canvasObjects.filter(o => (o.layerId === layer.id) || (!o.layerId && layer.id === 'layer-default'));
            const isLayerExpanded = expandedLayers.has(layer.id);
            const isLayerDragOver = dragOverLayerId === layer.id;

            return (
              <div key={layer.id} className="flex flex-col gap-1">
                <div
                  draggable={!draggedObjectId}
                  onDragStart={(e) => handleLayerDragStart(e, index)}
                  onDragOver={(e) => handleLayerDragOver(e, layer.id)}
                  onDragLeave={handleLayerDragLeave}
                  onDrop={(e) => handleLayerDrop(e, index, layer.id)}
                  onClick={() => setActiveLayerId(layer.id)}
                  className={`group flex items-center justify-between rounded-xl p-2.5 cursor-pointer transition-all border ${
                    isActive
                      ? 'bg-surface-active border-border-strong text-foreground shadow-2xs font-semibold'
                      : 'bg-surface border-border hover:bg-surface-hover hover:border-border-strong'
                  } ${draggedLayerIndex === index ? 'opacity-40 scale-95' : ''} ${
                    isLayerDragOver ? 'ring-2 ring-border-strong bg-surface-active' : ''
                  }`}
                >
                  {/* Left Side: Expand, Drag Grip & Name */}
                  <div className="flex items-center gap-1 overflow-hidden flex-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleLayerExpand(layer.id); }}
                      className="text-icon-muted hover:text-foreground w-4 flex justify-center shrink-0 transition-colors"
                    >
                      {isLayerExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                    
                    <div className="cursor-grab text-icon-muted hover:text-icon shrink-0 transition-colors">
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLayerVisibility(layer.id);
                      }}
                      className="text-icon-muted hover:text-foreground transition-colors shrink-0 mx-1"
                      title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                    >
                      {layer.visible ? (
                        <Eye className="w-3.5 h-3.5 text-text-primary" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-icon-muted" />
                      )}
                    </button>

                    {editingId === layer.id ? (
                      <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveRename(layer.id)}
                          className="w-full rounded-lg border border-border-strong px-2 py-0.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 bg-input-background"
                          autoFocus
                        />
                        <button onClick={() => saveRename(layer.id)} className="text-success p-1 hover:bg-success/10 rounded-md shrink-0 transition-colors">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span
                        onDoubleClick={() => startRename(layer.id, layer.name)}
                        className={`font-semibold truncate text-[12px] flex-1 ${
                          isActive ? 'text-foreground font-bold' : 'text-text-primary'
                        } ${!layer.visible ? 'line-through opacity-50' : ''}`}
                      >
                        {layer.name}
                      </span>
                    )}
                  </div>

                  {/* Right Side Action Buttons */}
                  <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity shrink-0 ml-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => startRename(layer.id, layer.name)}
                      className="p-1 rounded-lg text-icon-muted hover:bg-surface-active hover:text-foreground transition-colors"
                      title="Rename Layer"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => toggleLayerLock(layer.id)}
                      className="p-1 rounded-lg text-icon-muted hover:bg-surface-active hover:text-foreground transition-colors"
                      title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                    >
                      {layer.locked ? <Lock className="w-3 h-3 text-warning" /> : <Unlock className="w-3 h-3" />}
                    </button>
                    {layers.length > 1 && (
                      <button
                        onClick={() => handleDeleteClick(layer.id, layer.name)}
                        className="p-1 rounded-lg text-icon-muted hover:bg-danger/10 hover:text-danger transition-colors"
                        title="Delete Layer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Layer Objects Tree */}
                {isLayerExpanded && layerObjects.length > 0 && (
                  <div className="flex flex-col gap-0.5 mt-1 bg-surface-active/30 rounded-xl p-1.5 border border-border">
                    {renderObjectTree(layerObjects)}
                  </div>
                )}
                {isLayerExpanded && layerObjects.length === 0 && (
                  <div className="ml-8 my-1 text-[10px] text-icon-muted italic">No objects</div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Confirmation Modal when deleting non-empty layer */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-150 pointer-events-auto select-none">
          <div
            className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-2xl border border-border flex flex-col gap-4 text-foreground animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger/10 text-danger border border-danger/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Delete Layer</h3>
                <p className="text-[11px] text-text-muted font-medium">Layer contains drawing objects</p>
              </div>
            </div>

            <p className="text-xs text-text-primary leading-relaxed">
              Layer <strong className="text-foreground">"{confirmDelete.name}"</strong> contains{' '}
              <span className="font-bold text-accent">{confirmDelete.count}</span> object{confirmDelete.count > 1 ? 's' : ''}. Deleting this layer will permanently remove all of its objects from the canvas.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-xl border border-border px-3.5 py-1.5 text-xs font-semibold text-text-primary hover:bg-surface-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndRemoveLayer}
                className="rounded-xl bg-danger px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-danger/90 active:scale-95 transition-all"
              >
                Delete Layer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
