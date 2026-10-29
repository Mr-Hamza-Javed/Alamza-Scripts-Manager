import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import './ui/calm-ui.css';
import './ui/app.css';
import App from './App';
import { initPwa } from './lib/pwa';

/* install prompt + offline cache (service worker in the built app only) */
initPwa();

createRoot(document.getElementById('root')!).render(<App />);
