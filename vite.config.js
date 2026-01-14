/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    plugins: [react()],
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
    build: {
        // Tauri supports es2021
        target: mode === 'web' ? 'es2020' : (process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari15'),
        // don't minify for debug builds
        minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
        // produce sourcemaps for debug builds
        sourcemap: !!process.env.TAURI_DEBUG,
        outDir: 'dist',
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
}));
