/// <reference types="vite/client" />
/// <reference types="node" />

// Augment the global Window interface to include the __TAURI__ property.
// This is necessary for TypeScript to recognize it during the build process.
interface Window {
  __TAURI__?: object;
}

declare const __APP_VERSION__: string;
