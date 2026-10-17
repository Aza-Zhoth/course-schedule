import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    // host: true 等价于 --host，监听 0.0.0.0，
    // 让同一 Wi-Fi 下的手机可以通过电脑的局域网 IP 访问，实现真机调试。
    host: true,
    port: 5173,
    strictPort: false,
  },

  preview: {
    host: true,
    port: 4173,
  },

  build: {
    // 兼容到 iOS 15 / Android Chrome 100 这一档
    target: 'es2019',
    outDir: 'dist',
    sourcemap: false,
  },
});
