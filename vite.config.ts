import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: ['index.html', 'zh/index.html', 'ja/index.html', 'fr/index.html'],
      output: { manualChunks: { three: ['three'], react: ['react', 'react-dom'] } },
    },
  },
});
