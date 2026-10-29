import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static build: `npm run build` writes everything Firebase Hosting serves into dist/.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist', chunkSizeWarningLimit: 1500 },
});
