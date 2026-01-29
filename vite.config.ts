/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    legacy({
      targets: ['ios >= 14', 'safari >= 14'],
      polyfills: ['es.promise.finally', 'es/map', 'es/set'],
      modernPolyfills: ['es.promise.finally']
    })
  ],
  // prevent vite from obscuring rust errors
  clearScreen: false,
  // Tauri expects a fixed port, fail if that port is not available
  server: {
    port: mode === 'web' ? 5173 : 1420,
    strictPort: mode !== 'web',
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Vercel dev server default
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
          
          // Feature chunks - Challenges (loaded on demand)
          'challenges': [
            './components/MusicChallengeScreen',
            './components/ChessChallengeScreen', 
            './components/DrawingChallengeScreen',
            './components/CodingChallengeScreen',
            './components/DrawingTutorialScreen'
          ],
          
          // Feature chunks - Learning tools
          'learning-tools': [
            './components/ConjugatorScreen',
            './components/LanguageLabScreen',
            './components/VideoLabScreen'
          ],
          
          // Services - AI and generation
          'services-ai': [
            './services/aiCardGenerator',
            './services/aiLessonGenerator',
            './services/curriculumService',
            './services/chatService',
            './services/conversationService'
          ],
          
          // Services - Utilities
          'services-utils': [
            './services/youtubeService',
            './services/fileParser',
            './services/drawingEvaluationService',
            './services/drawingTutorialService'
          ]
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
