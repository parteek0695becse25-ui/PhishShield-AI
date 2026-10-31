import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// start.bat sets VITE_API_PROXY to the port the Java backend really uses.
const apiTarget = process.env.VITE_API_PROXY || 'http://127.0.0.1:8080';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
});
