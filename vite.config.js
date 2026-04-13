import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  test: {
    environment: 'node',
  },
  plugins: [react()],
  base: '/Camping/',
  server: {
    host: true,
    proxy: {
      '/api/drivebc': {
        target: 'https://api.open511.gov.bc.ca',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/drivebc/, ''),
      },
    },
  },
})
