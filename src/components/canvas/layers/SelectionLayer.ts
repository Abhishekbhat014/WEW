import type * as fabric from 'fabric';
import { setupCustomControls, setupRubberbandSelection } from '../../../utils/customControls';

export class SelectionLayer {
  /**
   * Initializes global object selection visual properties, 8 circular handles, rotation control, and rubberband selection.
   */
  static initSelectionVisuals(canvas?: fabric.Canvas) {
    setupCustomControls();
    if (canvas) {
      setupRubberbandSelection(canvas);
    }
  }
}
