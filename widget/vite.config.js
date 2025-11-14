import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'livechat-widget.js',
        assetFileNames: 'livechat-widget.[ext]'
      }
    }
  }
});
