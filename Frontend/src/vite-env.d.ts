/// <reference types="vite/client" />

// Extend ImportMetaEnv so TypeScript knows about Vite env vars used in this project
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SUPABASE_REDIRECT_URL?: string;
  // add other VITE_ vars here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
