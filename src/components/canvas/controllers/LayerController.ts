import type { HoverRect } from '../layers/InteractionLayer';
import type { GuideLine } from '../layers/GuideLayer';

export class LayerController {
  private hoverListeners: Array<(rect: HoverRect | null) => void> = [];
  private guideListeners: Array<(guides: GuideLine[]) => void> = [];

  onHoverChange(listener: (rect: HoverRect | null) => void) {
    this.hoverListeners.push(listener);
    return () => {
      this.hoverListeners = this.hoverListeners.filter((l) => l !== listener);
    };
  }

  onGuideChange(listener: (guides: GuideLine[]) => void) {
    this.guideListeners.push(listener);
    return () => {
      this.guideListeners = this.guideListeners.filter((l) => l !== listener);
    };
  }

  setHoverRect(rect: HoverRect | null) {
    this.hoverListeners.forEach((listener) => listener(rect));
  }

  setGuides(guides: GuideLine[]) {
    this.guideListeners.forEach((listener) => listener(guides));
  }
}

export const globalLayerController = new LayerController();
