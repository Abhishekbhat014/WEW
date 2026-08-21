import React, { useEffect } from 'react';
import {
  X,
  Sparkles,
  Layers,
  ShieldCheck,
  ExternalLink,
  FileText,
  Zap,
  BrainCircuit,
  User,
  ArrowLeft,
  Globe,
  Code,
  CheckCircle2,
} from 'lucide-react';
import logoUrl from '../../assets/logo.svg';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const features = [
    {
      icon: Sparkles,
      title: 'Infinite Vector & Rough Sketch Canvas',
      desc: 'Precision vector tools paired with Rough.js hand-drawn sketch styling and crisp SVG rendering.',
    },
    {
      icon: FileText,
      title: 'Native PDF Focus Mode & Annotation',
      desc: 'Import multi-page PDF documents. Annotate directly on pages with live canvas sync.',
    },
    {
      icon: BrainCircuit,
      title: 'Mind-Map & Graph Auto-Branching',
      desc: 'Directional subtree growth and automatic node cloning using Alt + Arrow Keys.',
    },
    {
      icon: Zap,
      title: '60fps Laser Pointer & Speed Pen',
      desc: 'Dot-free Bezier glowing laser trail with real-time pointer tracking and smooth fade-out.',
    },
    {
      icon: Layers,
      title: 'Synchronized Grid & Pan Lock',
      desc: '60fps locked grid overlay (graph, dots, lines) synchronized to viewport transforms.',
    },
    {
      icon: ShieldCheck,
      title: '100% Local-First & Portable Projects',
      desc: 'Zero data tracking. Save and open self-contained .webdraw files with embedded PDF data.',
    },
  ];

  const techStack = [
    { name: 'React 19', tag: 'UI Framework' },
    { name: 'TypeScript', tag: 'Type Safety' },
    { name: 'Fabric.js v7', tag: 'Canvas Engine' },
    { name: 'Tailwind CSS v4', tag: 'Design System' },
    { name: 'Rough.js', tag: 'Hand-Drawn Vector' },
    { name: 'PDF.js', tag: 'Document Processing' },
    { name: 'Motion', tag: 'Animations' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col w-screen h-screen bg-background/95 backdrop-blur-2xl text-foreground select-none overflow-hidden animate-in fade-in duration-200"
      data-canvas-ui="true"
    >
      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/90 px-4 sm:px-8 py-3 sm:py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-active border border-border-strong shadow-xs">
            <img src={logoUrl} alt="WebDraw Logo" className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight text-foreground">WebDraw</h1>
              <span className="rounded-full bg-surface-active border border-border-strong px-2.5 py-0.5 font-mono text-[10px] font-bold text-foreground">
                v1.0.0
              </span>
            </div>
            <p className="text-xs font-medium text-text-muted">A modern whiteboard, diagramming & PDF workspace</p>
          </div>
        </div>

        {/* Creator Pill Header Link */}
        <div className="flex items-center gap-3">
          <a
            href="https://abhishekbhat014.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-2 rounded-xl bg-surface-active/80 hover:bg-surface-active border border-border-strong px-3.5 py-2 text-xs font-bold text-foreground transition-all active:scale-95 shadow-xs hover:border-border"
          >
            <User className="h-3.5 w-3.5 text-accent" />
            <span>Created by Abhishek Bhat</span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-active hover:bg-surface-hover text-icon hover:text-foreground border border-border-strong transition-all cursor-pointer active:scale-95 shadow-xs"
            aria-label="Close About Page"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* FULL WINDOW SCROLLABLE BODY CONTENT */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 sm:space-y-12">
          
          {/* HERO SECTION */}
          <section className="text-center space-y-4 max-w-3xl mx-auto pt-4">
            <a
              href="https://abhishekbhat014.github.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-surface-active border border-border-strong px-4 py-1.5 text-xs font-bold text-foreground transition-all hover:bg-surface-hover hover:scale-105 active:scale-95 shadow-xs"
            >
              <User className="h-3.5 w-3.5 text-accent" />
              <span>Created by Abhishek Bhat</span>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>

            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground leading-tight">
              Next-Gen Whiteboard & PDF Annotation Workspace
            </h2>
            
            <p className="text-sm sm:text-base font-medium text-text-muted leading-relaxed">
              WebDraw is crafted for high-performance sketching, visual diagramming, and multi-page PDF document annotation directly in your browser — 100% local-first, zero setup required.
            </p>
          </section>

          {/* CREATOR PROFILE CARD */}
          <section className="rounded-2xl border border-border-strong bg-surface-active/30 p-5 sm:p-8 backdrop-blur-md shadow-lg">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface-active border border-border-strong text-foreground shadow-sm">
                  <User className="h-7 w-7 text-accent" />
                </div>
                <div>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <h3 className="text-lg font-bold text-foreground">Abhishek Bhat</h3>
                    <span className="rounded bg-accent/15 border border-accent/30 px-2 py-0.5 text-[10px] font-mono font-bold text-foreground mt-1 sm:mt-0">
                      Creator & Lead Engineer
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-1.5 sm:mt-1 leading-relaxed">
                    Software engineer building modern, interactive web platforms and high-performance creative tools.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                <a
                  href="https://abhishekbhat014.github.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-surface-active hover:bg-surface-hover border border-border-strong px-4 py-2.5 text-xs font-bold text-foreground transition-all active:scale-95 shadow-2xs"
                >
                  <Globe className="h-4 w-4 text-accent" />
                  <span>Portfolio</span>
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>

                <a
                  href="https://github.com/Abhishekbhat014/WEW"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-surface-active hover:bg-surface-hover border border-border-strong px-4 py-2.5 text-xs font-bold text-foreground transition-all active:scale-95 shadow-2xs"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span>GitHub Repository</span>
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              </div>
            </div>
          </section>

          {/* KEY FEATURES SECTION */}
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-lg font-extrabold tracking-tight text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" /> Feature Capabilities
              </h3>
              <span className="text-xs font-mono font-bold text-text-muted">6 Core Pillars</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((f, i) => {
                const IconComp = f.icon;
                return (
                  <div
                    key={i}
                    className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 transition-all hover:border-border-strong hover:bg-surface-hover/60 hover:shadow-md"
                  >
                    <div className="space-y-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-active border border-border-strong text-foreground shadow-2xs">
                        <IconComp className="h-5 w-5" />
                      </div>
                      <h4 className="text-sm font-bold text-foreground">{f.title}</h4>
                      <p className="text-xs font-normal text-text-muted leading-relaxed">{f.desc}</p>
                    </div>
                    <div className="pt-4 flex items-center gap-1.5 text-[11px] font-semibold text-accent">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Built & Optimized
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* TECH STACK SECTION */}
          <section className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold tracking-tight text-foreground flex items-center gap-2">
                <Code className="h-5 w-5 text-icon" /> Architecture & Technologies
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {techStack.map((tech) => (
                <div
                  key={tech.name}
                  className="flex flex-col items-center justify-center rounded-xl border border-border-strong bg-surface-active/50 p-3 text-center transition-all hover:bg-surface-active"
                >
                  <span className="text-xs font-mono font-bold text-foreground">{tech.name}</span>
                  <span className="text-[10px] font-normal text-text-muted mt-0.5">{tech.tag}</span>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>

      {/* BOTTOM FOOTER BAR */}
      <footer className="sticky bottom-0 z-20 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border bg-surface/95 px-4 sm:px-8 py-3 sm:py-4 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-text-muted text-center sm:text-left">
          <span>WebDraw Whiteboard</span>
          <span className="hidden sm:inline">•</span>
          <a
            href="https://abhishekbhat014.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground underline underline-offset-4 font-bold transition-colors"
          >
            abhishekbhat014.github.io
          </a>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="hidden sm:inline text-xs font-mono text-text-muted">Press ESC to return</span>
          <button
            onClick={onClose}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-xs font-bold text-white hover:bg-accent-hover active:scale-95 transition-all shadow-md cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Canvas</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
