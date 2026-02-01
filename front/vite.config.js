import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true
  },
  build: {
    minify: 'esbuild',
    target: 'es2020',
    // إزالة console و debugger في production
    esbuild: command === 'build' ? { drop: ['console', 'debugger'] } : {},
    // تحسين حجم الحزمة
    rollupOptions: {
      output: {
        // تقسيم الحزم حسب المكتبات
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'vendor-utils': ['axios', '@microsoft/signalr'],
          'vendor-charts': ['recharts'],
          'vendor-alerts': ['sweetalert2'],
        },
      },
    },
    // تحذير عند تجاوز حجم معين
    chunkSizeWarningLimit: 1000,
    // تحسين source maps
    sourcemap: false, // تعطيل في production لتقليل الحجم
  },
  // تحسين الأداء في التطوير
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@mui/material'],
  },
}))
