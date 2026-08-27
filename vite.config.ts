/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Le plugin legacy n'est activé qu'en production :
    // En dev, il injecte des polyfills SystemJS qui peuvent corrompre
    // le chargement des modules React → erreur "useState on null".
    ...(mode !== 'web' ? [] : []),  // Tauri mode : pas de legacy non plus en dev
    ...(process.env.NODE_ENV === 'production'
      ? [legacy({
          targets: ['ios >= 14', 'safari >= 14'],
          polyfills: ['es.promise.finally', 'es/map', 'es/set'],
          modernPolyfills: ['es.promise.finally']
        })]
      : []
    ),
  ],
  define: {
    '__APP_VERSION__': JSON.stringify(process.env.npm_package_version),
  },
  // prevent vite from obscuring rust errors
  clearScreen: false,
  // Tauri expects a fixed port, fail if that port is not available
  server: {
    port: mode === 'web' ? 5173 : 1420,
    strictPort: mode !== 'web',
    proxy: {
      // OpenRouter : proxy direct vers l'API — évite le CORS en dev
      // (en prod, c'est la serverless function Vercel /api/openrouter-chat.ts)
      '/api/openrouter-chat': {
        target: 'https://openrouter.ai',
        changeOrigin: true,
        secure: true,
        rewrite: () => '/api/v1/chat/completions',
      },
      '/api/openrouter-models': {
        target: 'https://openrouter.ai',
        changeOrigin: true,
        secure: true,
        rewrite: () => '/api/v1/models',
      },
      // Autres routes /api → Vercel dev server (si démarré)
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  // to make use of `TAURI_DEBUG` and other env variables
  // https://tauri.app/v1/api/config#buildconfig.beforedevcommand
  envPrefix: ['VITE_', 'TAURI_'],
  esbuild: {
    target: 'es2018',
    supported: {
      'bigint': true
    }
  },
  build: {
    // Standard target for modern browsers
    target: mode === 'web' ? 'safari14' : (process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari15'),
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
    outDir: 'dist',
    // Code splitting optimization
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - Core dependencies
          'vendor-react': ['react', 'react-dom'],
          'vendor-ai': ['@google/generative-ai', '@google/genai'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui': ['canvas-confetti', 'react-markdown', 'remark-gfm'],
        }
      }
    },
    // Increase chunk size warning limit (we're splitting intentionally)
    chunkSizeWarningLimit: 600
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
  },
  resolve: {
    alias: mode === 'web' ? {
      './services/geminiService': './services/geminiService.web',
    } : {},
  },
}))
