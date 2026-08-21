<div align="center">
  <img src="public/favicon.svg" alt="WebDraw Logo" width="120" height="120" />
  <h1>WebDraw</h1>
  <p>A modern, lightweight, and extensible whiteboard, diagramming, and PDF annotation workspace for the web.</p>

  <p>
    <a href="#-features"><strong>Features</strong></a> ·
    <a href="#-tech-stack"><strong>Tech Stack</strong></a> ·
    <a href="#-keyboard-shortcuts"><strong>Shortcuts</strong></a> ·
    <a href="#-getting-started"><strong>Getting Started</strong></a> ·
    <a href="#-architecture"><strong>Architecture</strong></a> ·
    <a href="#-license"><strong>License</strong></a>
  </p>
</div>

<br />

## ✨ Features

WebDraw combines the fluidity of a freehand sketching canvas with the precision of a professional diagramming and PDF annotation suite:

- **📄 Self-Contained `.webdraw` Projects:** Save and open portable `.webdraw` project files using native OS file pickers (`showSaveFilePicker`). PDF documents and ArrayBuffers are embedded directly as Base64 data so your files open anywhere seamlessly.
- **🧠 Mind-Map & Graph Auto-Branching Engine:** Directional subtree growth and node cloning using `Alt + Arrow Keys`. Drag nodes to automatically move entire subtrees and branches with crisp vector connectors.
- **🖌️ Multi-Tool Drawing Suite:** Precision vector tools (rectangle, diamond, circle, arrow, line), freehand **Pencil**, **Highlighter**, **Speed Pen**, **Laser Pointer**, and **Text Tool** featuring default handwritten font (*'Caveat'*).
- **🔴 Smooth Laser Pointer Trail:** Dot-free, flicker-free glowing Bezier laser pointer trail with automatic fade-out and real-time pointer tracking.
- **📄 PDF Focus Mode & Annotation:** Import multi-page PDF documents. Annotate directly on top of pages, jump between document focus mode and canvas drawing mode, and re-link local PDF resources easily.
- **⚡ 60fps Panning & Grid Overlay:** Synchronized 60fps grid overlay canvas (`graph`, `dots`, `lines`, `blank`) locked to viewport transforms. Live panning status indicators, 2D canvas pan (`Space + Drag`), and horizontal pan (`Shift + Mouse Wheel`).
- **🎛️ Properties Inspector & Layer Manager:** Comprehensive sidebars for object geometry, typography, stroke styling (solid, dashed, dotted), color pickers, object grouping (`Ctrl + G`), and multi-layer management (`LayersPanel`).
- **🎨 Dark Mode & High-Contrast Visual System:** Polished light and dark theme tokens built with modern CSS variables for crystal-clear legibility.
- **📥 Native Exporting:** Export your workspace to PNG, transparent PNG, JPG, SVG, or PDF.

---

## 🛠️ Tech Stack

Built with modern web technologies for maximum speed and maintainability:

- **Framework:** [React 19](https://react.dev/) with [Vite](https://vitejs.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Canvas Engine:** [Fabric.js v7](http://fabricjs.com/)
- **Vector & Hand-Drawn Rendering:** [Rough.js](https://roughjs.com/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **PDF Core:** [PDF.js](https://mozilla.github.io/pdf.js/) & [jsPDF](https://parall.ax/products/jspdf)
- **Icons & UI:** [Lucide Icons](https://lucide.dev/) & [Radix UI](https://www.radix-ui.com/)
- **Animations:** [Motion](https://motion.dev/)

---

## ⌨️ Keyboard Shortcuts

| Action | Shortcut | Category |
| :--- | :--- | :--- |
| **Selection Tool** | `V` or `1` | Tools |
| **Rectangle / Diamond / Circle** | `1`, `2`, `3` (or `R`, `C`) | Tools |
| **Arrow / Line / Pencil / Text** | `4`, `5`, `6`, `9` (or `A`, `U`, `P`, `T`) | Tools |
| **Laser Pointer / Eraser** | `8`, `0` (or `L`, `E`) | Tools |
| **Lock Selected Tool** | `Q` | Tools |
| **Draw-to-Shape Mode** | `S` | Tools |
| **Zen Mode / Fullscreen** | `Alt + Z` / `Alt + F` | View |
| **Grow / Navigate Subtree** | `Alt + Arrow Keys` | Diagram |
| **Duplicate Selected** | `Ctrl + D` | Editing |
| **Group / Ungroup** | `Ctrl + G` / `Ctrl + Shift + G` | Editing |
| **Quick Temporary Eraser** | `Alt + Right Click` | Editing |
| **Undo / Redo** | `Ctrl + Z` / `Ctrl + Y` | History |
| **Save / Export Project** | `Ctrl + S` / `Ctrl + Shift + E` | Storage |
| **Horizontal Canvas Pan** | `Shift + Mouse Wheel` | Navigation |
| **2D Canvas Pan** | `Space + Drag` | Navigation |
| **Zoom In / Out / Reset** | `Ctrl + Wheel` / `Ctrl + 0` | Navigation |
| **Toggle Grid / Snap to Grid** | `Ctrl + '` / `Ctrl + Shift + '` | Grid |

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Abhishekbhat014/WEW.git
   cd WEW
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser at `http://localhost:3000/`.

---

## 🏗️ Architecture

```text
src/
├── components/
│   ├── canvas/          # Core Fabric.js drawing canvas, GridOverlay & LaserOverlay
│   │   └── layers/      # Canvas layer stack (GridLayer, InteractionLayer, EffectsLayer)
│   ├── pdf/             # PDF viewer, document focus mode & page annotations
│   ├── panels/          # Properties Inspector, Group Panels & Layer Manager
│   ├── toolbars/        # TopToolbar, LeftToolbar, BottomLeftControls & StatusBar
│   ├── modals/          # ShortcutsModal, CanvasSettingsModal & NewCanvasDialog
│   └── ui/              # Reusable UI primitives (ColorPicker, RangeSlider, Tooltip)
├── hooks/               # Custom hooks (useKeyboardShortcuts, useEraserEngine, useTheme)
├── store/               # CanvasContext global state & store definitions
├── utils/               # Serialization, PDF manager, diagram graph logic & Rough.js renderer
└── export/              # Export pipeline (PNG, SVG, PDF)
```

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
