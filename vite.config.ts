import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@data': path.resolve(__dirname, './data'),
      '@assets': path.resolve(__dirname, './assets'),
      '@': path.resolve(__dirname, './src'),
    },
  },
})
