import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@mediapipe/tasks-vision/wasm/*',
          dest: 'mediapipe/wasm'
        }
      ]
    })
  ],
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
