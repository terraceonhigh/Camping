import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Camping/',
  server: {
    host: true,
    proxy: {
      '/api/bc-fire-bans': {
        target: 'https://openmaps.gov.bc.ca',
        changeOrigin: true,
        rewrite: (path) => '/geo/pub/ows?service=WFS&version=2.0.0&request=GetFeature&typeName=pub:WHSE_LAND_AND_NATURAL_RESOURCE.PROT_BANS_AND_PROHIBITIONS_SP&outputFormat=application%2Fjson',
      },
    },
  },
})
