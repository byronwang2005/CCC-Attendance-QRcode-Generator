import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/CCC-Attendance-QRcode-Generator/christmas-tree/',
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          three: ['three'],
          r3f: ['@react-three/fiber'],
          drei: ['@react-three/drei'],
          postprocessing: ['@react-three/postprocessing'],
          maath: ['maath'],
        }
      }
    }
  }
})
