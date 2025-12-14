import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true
  },
  build: {
    // تحسين حجم الحزمة
    rollupOptions: {
      output: {
        // تقسيم الحزم حسب المكتبات
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'vendor-utils': ['axios', '@microsoft/signalr'],
        },
      },
    },
    // تحذير عند تجاوز حجم معين
    chunkSizeWarningLimit: 1000,
    // تحسين minification باستخدام esbuild (أسرع وأخف من terser)
    minify: 'esbuild',
    // تحسين source maps
    sourcemap: false, // تعطيل في production لتقليل الحجم
  },
  // تحسين الأداء في التطوير
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@mui/material'],
  },
})
