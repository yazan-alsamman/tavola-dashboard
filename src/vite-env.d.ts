/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  /** Optional — when set, dashboard fetches OneSignal identity token after login. */
  readonly VITE_ONESIGNAL_APP_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
