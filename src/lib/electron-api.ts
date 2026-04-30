export function getElectronApi() {
  if (typeof window === "undefined" || !window.api) {
    throw new Error("Electron preload API is not available");
  }

  return window.api;
}
