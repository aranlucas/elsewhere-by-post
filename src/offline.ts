import { registerSW } from "virtual:pwa-register";

/** Cache the game for offline play. First visits still play if caching is unavailable. */
export function registerOfflineCache(): void {
  registerSW({ immediate: true, onRegisterError: () => {} });
}
