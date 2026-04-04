/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY: string
  readonly VITE_MAPBOX_TOKEN: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_INK_CONTRACT_ADDRESS: string
  readonly VITE_USE_TESTNET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
