import React from "react";
import {
  Palette,
  Wand2,
  Move,
  Type as TypeIcon,
  Layers,
  FileText,
  MousePointer2,
  Info,
} from "lucide-react";
import { useCanvasContext } from "../../store/CanvasContext";
import { InspectorSection } from "./inspector/InspectorSection";
import { AppearanceSection } from "./inspector/AppearanceSection";
import { SketchSection } from "./inspector/SketchSection";
import { GeometrySection } from "./inspector/GeometrySection";
import { TypographySection } from "./inspector/TypographySection";
import { ArrangeSection } from "./inspector/ArrangeSection";
import { QuickActionsSection } from "./inspector/QuickActionsSection";
import { EraserSection } from "./inspector/EraserSection";
import {
  PdfGeneralSection,
  PdfInteractionSection,
  PdfActionSection,
  PdfInfoSection,
} from "./inspector/PdfSection";

export interface PropertiesInspectorPanelProps {
  onDelete: () => void;
  onDuplicate: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onUpdateGeometry: (props: {
    width?: number;
    height?: number;
    left?: number;
    top?: number;
    angle?: number;
  }) => void;
  onUpdateCornerRadius: (rx: number, ry: number) => void;
  onUpdateProperties?: (props: Record<string, any>) => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onResetRotation: () => void;
  onToggleLock: () => void;
  onToggleHide: () => void;
  onOpenPdfDocumentMode?: () => void;
  onSetPdfPage?: (page: number) => void;
}



export const PropertiesInspectorPanel: React.FC<PropertiesInspectorPanelProps> =
  React.memo(
    ({
      onDelete,
      onDuplicate,
      onBringForward,
      onSendBackward,
      onBringToFront,
      onSendToBack,
      onUpdateGeometry,
      onUpdateCornerRadius,
      onUpdateProperties,
      onFlipHorizontal,
      onFlipVertical,
      onResetRotation,
      onToggleLock,
      onToggleHide,
      onOpenPdfDocumentMode,
      onSetPdfPage,
    }) => {
      const { selectedObject, selectedCount, activeTool, isRightClickErasing } =
        useCanvasContext();

      const isNothingSelected = selectedCount === 0 && !selectedObject;
      const isNeutralSelectTool = activeTool === "select";
      const isShapeTool = [
        "rectangle",
        "rounded-rect",
        "circle",
        "ellipse",
        "triangle",
        "polygon",
        "star",
        "diamond",
        "line",
        "arrow",
      ].includes(activeTool);

      // REQUIREMENT: Do not show any properties for laser tool!
      // Also do not show shape properties card while selecting/drawing shape tools until mouse left button is released (inserting shape).
      // Hide properties card for neutral 'select' with nothing selected.
      // Hide completely if multiple objects are selected, or if a single group is selected (Group Actions Panel handles this)
      const isGroupSelected =
        selectedCount === 1 && selectedObject?.type === "group";

      if (
        isRightClickErasing ||
        activeTool === "laser" ||
        (isNothingSelected && (isNeutralSelectTool || isShapeTool)) ||
        selectedCount > 1 ||
        isGroupSelected
      ) {
        return null;
      }

      const isMultiSelected = selectedCount > 1;
      const isPdfSelected =
        !isNothingSelected &&
        !isMultiSelected &&
        (selectedObject?.isPdf ||
          selectedObject?.type === "pdf" ||
          selectedObject?.type === "image" ||
          selectedObject?.shapeType === "image");
      const isTextSelected =
        !isMultiSelected &&
        !isPdfSelected &&
        (activeTool === "text" ||
          (selectedObject !== null &&
            (selectedObject.type === "i-text" ||
              selectedObject.type === "text")));
      const isSingleShapeSelected =
        !isNothingSelected &&
        !isMultiSelected &&
        !isTextSelected &&
        !isPdfSelected;
      const isMarkerObject = selectedObject
        ? !!(selectedObject as any).isMarker || (selectedObject as any).shapeType === "marker"
        : false;
      const isPenObject = selectedObject
        ? (selectedObject as any).shapeType === "pen"
        : false;
      const isImageObject = selectedObject
        ? selectedObject.type === "image" ||
          (selectedObject as any).shapeType === "image"
        : false;

      const isFreehandOrMarkerOrPen =
        selectedObject &&
        (selectedObject.shapeType === "pencil" ||
          selectedObject.shapeType === "freehand" ||
          selectedObject.shapeType === "marker" ||
          selectedObject.shapeType === "pen" ||
          !!(selectedObject as any).isMarker ||
          selectedObject.type === "path" ||
          activeTool === "pencil" ||
          activeTool === "marker" ||
          activeTool === "pen");

      const callbacks = {
        onUpdateProperties,
        onUpdateGeometry,
        onUpdateCornerRadius,
      };

      return (
        <aside
          data-canvas-ui="true"
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="fixed top-16 right-3 sm:right-4 z-30 pointer-events-auto flex w-57.5 sm:w-72 flex-col rounded-xl bg-surface/97 px-3 pt-3 pb-2.5 sm:px-3.5 sm:pt-3.5 sm:pb-3 shadow-xl backdrop-blur-md border border-border text-xs text-text-primary select-none animate-in fade-in slide-in-from-right-3 duration-200 max-h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar scale-90 origin-top-right sm:scale-100"
        >
          {/* ─── Mode A: Tool Selected (No Object Selected) ─── */}
          {isNothingSelected && !isNeutralSelectTool && (
            <div className="flex flex-col gap-2">


              {activeTool === "eraser" ? (
                <EraserSection />
              ) : activeTool === "text" ? (
                <>
                  <TypographySection {...callbacks} />
                  <AppearanceSection
                    isText
                    showFill={false}
                    {...callbacks}
                  />
                </>
              ) : (
                <>
                  <AppearanceSection
                    showFill={
                      !["pencil", "marker", "line", "arrow", "pen"].includes(
                        activeTool,
                      )
                    }
                    showStrokeStyle={
  activeTool !== "marker" &&
  activeTool !== "pen" &&
  !isMarkerObject &&
  !isPenObject
}
                    {...callbacks}
                  />
                  {[
                    "rectangle",
                    "rounded-rect",
                    "circle",
                    "ellipse",
                    "triangle",
                    "polygon",
                    "star",
                    "diamond",
                    "line",
                    "arrow",
                  ].includes(activeTool) && (
                    <InspectorSection
                      id="sketch"
                      title="Drawing Style"
                      icon={<Wand2 className="w-3.5 h-3.5" />}
                      defaultOpen={false}
                    >
                      <SketchSection {...callbacks} />
                    </InspectorSection>
                  )}
                </>
              )}
            </div>
          )}

          {/* ─── Mode B: Object(s) Selected ─── */}
          {!isNothingSelected && (
            <>
              {/* Text Selected */}
              {isTextSelected && (
                <>
                  <QuickActionsSection
                    selectedObject={selectedObject}
                    selectedCount={1}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                    onFlipHorizontal={onFlipHorizontal}
                    onFlipVertical={onFlipVertical}
                    onResetRotation={onResetRotation}
                    onToggleLock={onToggleLock}
                    onToggleHide={onToggleHide}
                  />
                  <InspectorSection
                    id="typography"
                    title="Typography"
                    icon={<TypeIcon className="w-3.5 h-3.5" />}
                    defaultOpen
                  >
                    <TypographySection {...callbacks} />
                  </InspectorSection>
                  <InspectorSection
                    id="appearance"
                    title="Appearance"
                    icon={<Palette className="w-3.5 h-3.5" />}
                    defaultOpen
                  >
                    <AppearanceSection
                      isText
                      showFill={false}
                      showStrokeStyle={
  activeTool !== "marker" &&
  activeTool !== "pen" &&
  !isMarkerObject &&
  !isPenObject
}
                      {...callbacks}
                    />
                  </InspectorSection>
                  <InspectorSection
                    id="geometry"
                    title="Geometry"
                    icon={<Move className="w-3.5 h-3.5" />}
                    defaultOpen={false}
                  >
                    <GeometrySection {...callbacks} />
                  </InspectorSection>
                  <InspectorSection
                    id="arrange"
                    title="Arrange"
                    icon={<Layers className="w-3.5 h-3.5" />}
                    defaultOpen={false}
                  >
                    <ArrangeSection
                      selectedCount={1}
                      onBringForward={onBringForward}
                      onSendBackward={onSendBackward}
                      onBringToFront={onBringToFront}
                      onSendToBack={onSendToBack}
                    />
                  </InspectorSection>
                </>
              )}

              {/* PDF / Image Selected */}
              {isPdfSelected && (
                <>
                  <QuickActionsSection
                    selectedObject={selectedObject}
                    selectedCount={1}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                    onFlipHorizontal={onFlipHorizontal}
                    onFlipVertical={onFlipVertical}
                    onResetRotation={onResetRotation}
                    onToggleLock={
                      selectedObject?.isPdf ? undefined : onToggleLock
                    }
                    onToggleHide={onToggleHide}
                  />
                  <InspectorSection
                    id="appearance"
                    title="Appearance"
                    icon={<Palette className="w-3.5 h-3.5" />}
                    defaultOpen
                  >
                    <AppearanceSection
                      showColors={false}
                      showStroke={!selectedObject?.isPdf && !isImageObject}
                      showStrokeStyle={
  activeTool !== "marker" &&
  activeTool !== "pen" &&
  !isMarkerObject &&
  !isPenObject
}
                      {...callbacks}
                    />
                  </InspectorSection>
                  {selectedObject?.isPdf && (
                    <InspectorSection
                      id="general"
                      title="General"
                      icon={<FileText className="w-3.5 h-3.5" />}
                      defaultOpen
                    >
                      <PdfGeneralSection
                        onSetPdfPage={onSetPdfPage}
                        {...callbacks}
                      />
                    </InspectorSection>
                  )}
                  <InspectorSection
                    id="geometry"
                    title={selectedObject?.isPdf ? "Transform" : "Geometry"}
                    icon={<Move className="w-3.5 h-3.5" />}
                    defaultOpen
                  >
                    <GeometrySection
                      showDimensionsOnly={!selectedObject?.isPdf}
                      {...callbacks}
                    />
                  </InspectorSection>
                  {selectedObject?.isPdf && (
                    <>
                      <InspectorSection
                        id="interaction"
                        title="Interaction"
                        icon={<MousePointer2 className="w-3.5 h-3.5" />}
                        defaultOpen
                      >
                        <PdfInteractionSection
                          onToggleLock={onToggleLock}
                          {...callbacks}
                        />
                      </InspectorSection>
                      <InspectorSection
                        id="arrange"
                        title="Layer"
                        icon={<Layers className="w-3.5 h-3.5" />}
                        defaultOpen={false}
                      >
                        <ArrangeSection
                          selectedCount={1}
                          onBringForward={onBringForward}
                          onSendBackward={onSendBackward}
                          onBringToFront={onBringToFront}
                          onSendToBack={onSendToBack}
                        />
                      </InspectorSection>
                      <InspectorSection
                        id="pdf-actions"
                        title="PDF"
                        icon={<FileText className="w-3.5 h-3.5" />}
                        defaultOpen
                      >
                        <PdfActionSection
                          onOpenPdfDocumentMode={onOpenPdfDocumentMode}
                          {...callbacks}
                        />
                      </InspectorSection>
                      <InspectorSection
                        id="info"
                        title="Information"
                        icon={<Info className="w-3.5 h-3.5" />}
                        defaultOpen
                      >
                        <PdfInfoSection {...callbacks} />
                      </InspectorSection>
                    </>
                  )}
                </>
              )}

              {/* Single Shape Selected */}
              {isSingleShapeSelected && (
                <>
                  <QuickActionsSection
                    selectedObject={selectedObject}
                    selectedCount={1}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                    onFlipHorizontal={onFlipHorizontal}
                    onFlipVertical={onFlipVertical}
                    onResetRotation={onResetRotation}
                    onToggleLock={onToggleLock}
                    onToggleHide={onToggleHide}
                  />
                  <InspectorSection
                    id="appearance"
                    title="Appearance"
                    icon={<Palette className="w-3.5 h-3.5" />}
                    defaultOpen
                  >
                    <AppearanceSection
                      showFill
                      showStrokeStyle={
  activeTool !== "marker" &&
  activeTool !== "pen" &&
  !isMarkerObject &&
  !isPenObject
}
                      {...callbacks}
                    />
                  </InspectorSection>
                  <InspectorSection
                    id="geometry"
                    title="Geometry"
                    icon={<Move className="w-3.5 h-3.5" />}
                    defaultOpen
                  >
                    <GeometrySection {...callbacks} />
                  </InspectorSection>
                  {!isFreehandOrMarkerOrPen && (
                    <InspectorSection
                      id="sketch"
                      title="Drawing Style"
                      icon={<Wand2 className="w-3.5 h-3.5" />}
                      defaultOpen={false}
                    >
                      <SketchSection {...callbacks} />
                    </InspectorSection>
                  )}
                  <InspectorSection
                    id="arrange"
                    title="Arrange"
                    icon={<Layers className="w-3.5 h-3.5" />}
                    defaultOpen={false}
                  >
                    <ArrangeSection
                      selectedCount={1}
                      onBringForward={onBringForward}
                      onSendBackward={onSendBackward}
                      onBringToFront={onBringToFront}
                      onSendToBack={onSendToBack}
                    />
                  </InspectorSection>
                </>
              )}
            </>
          )}
        </aside>
      );
    },
  );
