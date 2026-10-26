import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import './ui/calm-ui.css';
import './ui/app.css';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
