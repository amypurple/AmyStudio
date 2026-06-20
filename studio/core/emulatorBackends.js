export const EMULATOR_BACKENDS = {
  emulatorjsCdnStable: {
    id: "emulatorjsCdnStable",
    label: "EmulatorJS CDN stable / gearcoleco",
    kind: "emulatorjs",
    loaderUrl: "https://cdn.emulatorjs.org/stable/data/loader.js",
    dataPath: "https://cdn.emulatorjs.org/stable/data/",
    coreProbeUrl: null,
    assetOverrides: null
  },
  emulatorjsVendorPoc: {
    id: "emulatorjsVendorPoc",
    label: "EmulatorJS local PoC / gearcoleco",
    kind: "emulatorjs",
    loaderUrl: "./vendor/EmulatorJS-main/data/loader.js",
    dataPath: "./vendor/EmulatorJS-main/data/",
    coreProbeUrl: "./vendor/EmulatorJS-main/data/cores/node_modules/@emulatorjs/core-gearcoleco/package.json",
    assetOverrides: {
      "emulator.min.js": "./vendor/EmulatorJS-main/data/emulator.js",
      "emulator.min.css": "./vendor/EmulatorJS-main/data/emulator.css"
    }
  }
};

export const ACTIVE_EMULATOR_BACKEND_ID = "emulatorjsCdnStable";
export const DEFAULT_BIOS_CANDIDATES = ["./bios/colecovision.rom", "./bios/os7.rom"];

export function getActiveEmulatorBackend() {
  return EMULATOR_BACKENDS[ACTIVE_EMULATOR_BACKEND_ID] || EMULATOR_BACKENDS.emulatorjsCdnStable;
}

export function resolveEmulatorBackendUrls(emulatorBackend) {
  const baseHref = window.location.href;
  const assetOverridesResolved = {};
  for (const [key, value] of Object.entries(emulatorBackend.assetOverrides || {})) {
    assetOverridesResolved[key] = new URL(value, baseHref).href;
  }
  return {
    ...emulatorBackend,
    loaderUrlResolved: new URL(emulatorBackend.loaderUrl, baseHref).href,
    dataPathResolved: new URL(emulatorBackend.dataPath, baseHref).href,
    coreProbeUrlResolved: emulatorBackend.coreProbeUrl ? new URL(emulatorBackend.coreProbeUrl, baseHref).href : null,
    assetOverridesResolved
  };
}
