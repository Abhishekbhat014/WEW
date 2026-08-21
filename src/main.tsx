import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

declare global {
  interface Window {
    __WD_BOOT?: { start: number; isFirstLaunch: boolean };
  }
}

/** Fade out and remove the splash screen */
function dismissSplash() {
  const splash = document.getElementById('wd-splash');
  if (!splash) return;

  splash.classList.add('wd-hiding');
  splash.addEventListener('transitionend', () => splash.remove(), { once: true });

  // Fallback removal if transitionend doesn't fire (e.g. display:none race)
  setTimeout(() => splash.remove(), 500);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Dismiss splash: 2s minimum on first launch, immediate on reload
const boot = window.__WD_BOOT;
if (boot?.isFirstLaunch) {
  const elapsed = Date.now() - boot.start;
  const remaining = Math.max(0, 3000 - elapsed);
  setTimeout(dismissSplash, remaining);
} else {
  dismissSplash();
}
