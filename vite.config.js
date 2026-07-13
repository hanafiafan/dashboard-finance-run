import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Split heavy vendors so the main bundle stays small & cacheable.
        // Rolldown (Vite 8) expects manualChunks as a function.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('chart.js') || id.includes('react-chartjs-2')) return 'charts';
            if (id.includes('/d3')) return 'd3';
            if (id.includes('@supabase')) return 'supabase';
          }
        },
      },
    },
  },
})
