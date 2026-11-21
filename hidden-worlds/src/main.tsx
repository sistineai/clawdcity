import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ui/styles/fonts.css';
import './ui/styles/tokens.css';
import './ui/styles/base.css';
import './ui/styles/play.css';
import './ui/styles/screens.css';
import { App } from './ui/App';
import { startPwa } from './ui/pwa';

startPwa();

/** Wait for the (non-blocking) app stylesheet, but never more than a few seconds. */
function cssReady(): Promise<void> {
  const link = document.querySelector<HTMLLinkElement>('link[data-app-css]');
  if (!link || (link.media === 'all' && link.sheet)) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      link.media = 'all';
      resolve();
    };
    link.addEventListener('load', done, { once: true });
    link.addEventListener('error', done, { once: true });
    setTimeout(done, 4000);
  });
}

const el = document.getElementById('root');
if (el)
  void cssReady().then(() =>
    createRoot(el).render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  );
