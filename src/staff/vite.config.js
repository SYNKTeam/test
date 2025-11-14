import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/staff/',
  build: {
    outDir: '../../public/staff',
    emptyOutDir: true
  },
  server: {
    port: 3000
  }
});
