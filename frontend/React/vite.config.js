import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // <-- AGREGAMOS ESTO

// https://vite.dev
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <-- AGREGAMOS ESTO
  ],
})
