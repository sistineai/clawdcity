import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ui/styles/fonts.css';
import './ui/styles/tokens.css';
import './ui/styles/base.css';
import './ui/styles/play.css';
import './ui/styles/screens.css';
import { App } from './ui/App';

const el = document.getElementById('root');
if (el)
  createRoot(el).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
