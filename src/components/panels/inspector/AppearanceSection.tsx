import React from "react";
import {
  useInspectorObject,
  type InspectorObjectCallbacks,
} from "../../../hooks/useInspectorObject";
import { ColorPickerButton } from "../../ui/inspector/ColorPickerButton";
import { SliderControl } from "../../ui/inspector/SliderControl";
import { InspectorDropdown } from "../../ui/inspector/InspectorDropdown";
import { NumberInput } from "../../ui/inspector/NumberInput";
import { HighlightText } from "../../ui/inspector/HighlightText";
import type { StrokeStyle } from "../../../types/canvas";

import { useCanvasContext } from "../../../store/CanvasContext";

interface AppearanceSectionProps extends InspectorObjectCallbacks {
  showFill?: boolean;
  showColors?: boolean;
  showStroke?: boolean;
  showStrokeStyle?: boolean;
  isText?: boolean;
  searchQuery?: string;
}

export const AppearanceSection: React.FC<AppearanceSectionProps> = ({
  showFill = true,
  showColors = true,
  showStroke = true,
  showStrokeStyle = true,
  isText = false,
  searchQuery = "",
  ...callbacks
}) => {
  const { activeTool } = useCanvasContext();
  const {
    strokeColor,
    fillColor,
    strokeWidth,
    strokeStyle,
    opacity,
    updateProperty,
    selectedObject,
  } = useInspectorObject(callbacks);

  const isLinearOrPathToolOrObject = (tool: string, obj: any): boolean => {
    const linearTools = ["line", "arrow", "pencil", "marker", "pen"];
    if (!obj) return linearTools.includes(tool);
    const shapeType = obj.shapeType || obj.type;
    return (
      linearTools.includes(shapeType) ||
      shapeType === "freehand" ||
      shapeType === "path" ||
      !!obj.isMarker ||
      linearTools.includes(tool)
    );
  };

  const effectiveShowFill = showFill && !isLinearOrPathToolOrObject(activeTool, selectedObject);

  const isPenObject = selectedObject
    ? (selectedObject as any).shapeType === "pen" || (selectedObject as any).type === "pen"
    : false;
  const isMarkerObject = selectedObject
    ? !!(selectedObject as any).isMarker || (selectedObject as any).shapeType === "marker"
    : false;

  const effectiveShowStrokeStyle =
    showStrokeStyle &&
    activeTool !== "pen" &&
    !isPenObject &&
    activeTool !== "marker" &&
    !isMarkerObject;

  const fontColor = (selectedObject as any)?.fill ?? strokeColor;
  const strokePresets = [1, 2, 4, 8, 12];

  const strokeStyles = [
    { id: "solid", label: "Solid" },
    { id: "dashed", label: "Dashed" },
    { id: "dotted", label: "Dotted" },
  ];

  if (isText) {
    return (
      <div className="flex flex-col gap-3.5">
        <ColorPickerButton
          label={<HighlightText text="Font Color" query={searchQuery} />}
          color={fontColor}
          onChange={(c) => updateProperty("fontColor", c)}
        />
        <div className="flex flex-col gap-2 pt-3">
          <SliderControl
            label={<HighlightText text="Opacity" query={searchQuery} />}
            value={Math.round(opacity * 100)}
            min={5}
            max={100}
            step={5}
            unit="%"
            onChange={(val) => updateProperty("opacity", val / 100)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {/* Stroke & Fill Color */}
      {showColors && (
        <div className="flex flex-col gap-3">
          {showStroke && (
            <ColorPickerButton
              label={<HighlightText text="Stroke Color" query={searchQuery} />}
              color={strokeColor}
              onChange={(c) => updateProperty("stroke", c)}
            />
          )}

          {effectiveShowFill && (
            <ColorPickerButton
              label={<HighlightText text="Fill Color" query={searchQuery} />}
              color={fillColor}
              onChange={(c) => updateProperty("fill", c)}
            />
          )}
        </div>
      )}

      {showStroke && (
        <>
          {/* Stroke Width */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-primary">
                <HighlightText text="Stroke Width" query={searchQuery} />
              </span>
              <NumberInput
                value={strokeWidth}
                min={1}
                max={30}
                unit="px"
                onChange={(val) => updateProperty("strokeWidth", val)}
                className="w-20"
              />
            </div>

            <SliderControl
              label=""
              value={strokeWidth}
              min={1}
              max={30}
              onChange={(val) => updateProperty("strokeWidth", val)}
            />

            <div className="flex items-center gap-1.5">
              {strokePresets.map((preset) => {
                const isSelected = strokeWidth === preset;
                return (
                  <button
                    key={preset}
                    onClick={() => updateProperty("strokeWidth", preset)}
                    className={`flex-1 rounded-lg py-1 text-xs font-mono font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-surface-active text-foreground border-border-strong shadow-xs"
                        : "bg-surface text-text-primary hover:bg-surface-hover border-border"
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stroke Style */}
          {effectiveShowStrokeStyle && (
            <div className="pt-1">
              <InspectorDropdown
                label={
                  <HighlightText text="Stroke Style" query={searchQuery} />
                }
                value={strokeStyle}
                options={strokeStyles}
                onChange={(v) =>
                  updateProperty("strokeStyle", v as StrokeStyle)
                }
              />
            </div>
          )}
        </>
      )}

      {/* Opacity */}
      <div className="pt-3">
        <SliderControl
          label={<HighlightText text="Opacity" query={searchQuery} />}
          value={Math.round(opacity * 100)}
          min={5}
          max={100}
          step={5}
          unit="%"
          onChange={(val) => updateProperty("opacity", val / 100)}
        />
      </div>
    </div>
  );
};
