import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsConfigPaths from "vite-tsconfig-paths"
// https://vite.dev/config/
import { visualizer } from "rollup-plugin-visualizer"
export default defineConfig({
    base: "./",
    plugins: [react(), tailwindcss(), tsConfigPaths(), visualizer()],
    server: {
        port: 5432,
    },
    build: {
        minify: "esbuild",
      
        rollupOptions: {
            treeshake: 'smallest',
            external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
        }
    }

})
