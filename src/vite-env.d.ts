/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  /** Optional — when set, dashboard fetches OneSignal identity token after login. */
  readonly VITE_ONESIGNAL_APP_ID?: string
  /** Platform Owner console origin after the dashboards were split. */
  readonly VITE_PLATFORM_APP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
