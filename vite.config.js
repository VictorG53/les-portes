import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // chemins relatifs : le site fonctionne à la racine d'un domaine comme dans un sous-dossier (GitHub Pages, etc.)
  base: './',
})
