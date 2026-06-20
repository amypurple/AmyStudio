export function createEmulatorShellHelpers({
  els,
  getCompiledRom,
  setCompiledRom,
  getCompiledMemoryMap,
  setCompiledMemoryMap,
  getCompiledSymbols,
  setCompiledSymbols,
  getCompiledListing,
  setCompiledListing,
  getCompiledColecoHeaderInfo,
  setCompiledColecoHeaderInfo,
  getEmulatorBios,
  setEmulatorBios,
  getEmulatorBiosName,
  setEmulatorBiosName,
  getEmulatorBiosSourceUrl,
  setEmulatorBiosSourceUrl,
  getEmulatorWindow,
  setEmulatorWindow,
  getEmulatorRomObjectUrl,
  setEmulatorRomObjectUrl,
  getProject,
  updatePreviewActions,
  refreshProjectGraph,
  setStatus,
  getActiveEmulatorBackend,
  resolveEmulatorBackendUrls,
  bytesToDataUrl,
  defaultBiosCandidates
}) {
  function updateEmulatorUi() {
    const hasRom = !!getCompiledRom();
    const hasBios = !!getEmulatorBios();
    if (els.btnDownloadRom) els.btnDownloadRom.disabled = !hasRom;
    if (els.btnRunEmulator) els.btnRunEmulator.disabled = !(hasRom && hasBios);
    if (els.btnResetEmulator) {
      const popupVisible = getEmulatorWindow() && !getEmulatorWindow().closed;
      els.btnResetEmulator.disabled = !(popupVisible || hasBios);
    }
    if (els.emulatorMeta) {
      const project = getProject();
      const biosText = hasBios
        ? `BIOS loaded: ${getEmulatorBiosName()}`
        : "No BIOS loaded. Place colecovision.rom or os7.rom in studio/bios/ or load a BIOS manually.";
      const rom = getCompiledRom();
      const romText = hasRom ? `ROM ready: ${project.projectName || "amy"}.col (${rom.length} bytes).` : "No compiled ROM yet.";
      els.emulatorMeta.textContent = `${biosText} ${romText}`;
    }
  }

  function revokeEmulatorRomObjectUrl() {
    const current = getEmulatorRomObjectUrl();
    if (!current) return;
    URL.revokeObjectURL(current);
    setEmulatorRomObjectUrl("");
  }

  function bytesToObjectUrl(bytes, mimeType = "application/octet-stream") {
    revokeEmulatorRomObjectUrl();
    const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
    setEmulatorRomObjectUrl(url);
    return url;
  }

  function resetEmbeddedEmulator({ preserveBios = true } = {}) {
    revokeEmulatorRomObjectUrl();
    const emulatorWindow = getEmulatorWindow();
    if (emulatorWindow && !emulatorWindow.closed) {
      emulatorWindow.close();
    }
    setEmulatorWindow(null);
    els.emulatorHost?.classList.remove("emulator-host--detached");
    if (els.emulatorFrame) {
      els.emulatorFrame.srcdoc = "<!doctype html><html><body style='margin:0;background:#000'></body></html>";
      els.emulatorFrame.classList.add("hidden");
    }
    els.emulatorPlaceholder?.classList.remove("hidden");
    if (!preserveBios) {
      setEmulatorBios(null);
      setEmulatorBiosName("");
      if (els.biosImport) els.biosImport.value = "";
    }
    updateEmulatorUi();
  }

  function clearCompiledArtifacts({ resetEmulator = true } = {}) {
    revokeEmulatorRomObjectUrl();
    setCompiledRom(null);
    setCompiledMemoryMap("");
    setCompiledSymbols?.("");
    setCompiledListing("");
    setCompiledColecoHeaderInfo(null);
    if (resetEmulator) resetEmbeddedEmulator({ preserveBios: true });
    else updateEmulatorUi();
    updatePreviewActions();
    refreshProjectGraph();
  }

  function buildEmulatorSrcdoc({ romUrl, biosUrl, gameName, emulatorBackendOverride = null }) {
    const emulatorBackend = emulatorBackendOverride || resolveEmulatorBackendUrls(getActiveEmulatorBackend());
    const safeGameName = JSON.stringify(gameName || "Amy Project");
    const safeRomUrl = JSON.stringify(romUrl);
    const safeBiosUrl = JSON.stringify(biosUrl);
    const safeDataPath = JSON.stringify(emulatorBackend.dataPathResolved);
    const safeLoaderUrl = JSON.stringify(emulatorBackend.loaderUrlResolved);
    const safeAssetOverrides = JSON.stringify(emulatorBackend.assetOverridesResolved || {});
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: dark;
        --bg: #05070b;
        --panel: rgba(10, 15, 24, 0.92);
        --border: rgba(125, 211, 252, 0.24);
        --text: #e6edf3;
        --muted: #9db0c3;
        --accent: #7dd3fc;
      }
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        background: var(--bg);
        overflow: hidden;
        font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        color: var(--text);
      }
      #game {
        width: 100%;
        height: 100%;
        background: #000;
      }
    </style>
  </head>
  <body>
    <div id="game"></div>
    <script>
      EJS_player = "#game";
      EJS_core = "gearcoleco";
      EJS_gameName = ${safeGameName};
      EJS_gameUrl = ${safeRomUrl};
      EJS_biosUrl = ${safeBiosUrl};
      EJS_pathToData = ${safeDataPath};
      EJS_pathtodata = ${safeDataPath};
      EJS_paths = ${safeAssetOverrides};
      EJS_startOnLoaded = true;
      EJS_disableAutoLang = true;
      EJS_language = "en-US";
    </script>
    <script src=${safeLoaderUrl}></script>
  </body>
</html>`;
  }

  async function chooseRunnableEmulatorBackend() {
    const activeBackend = getActiveEmulatorBackend();
    const resolvedActiveBackend = resolveEmulatorBackendUrls(activeBackend);
    if (!resolvedActiveBackend.coreProbeUrlResolved) return resolvedActiveBackend;
    try {
      const response = await fetch(resolvedActiveBackend.coreProbeUrlResolved, { method: "GET", cache: "no-store" });
      if (response.ok) return resolvedActiveBackend;
    } catch {
      // Fall through to CDN stable fallback.
    }
    return resolveEmulatorBackendUrls({
      id: "emulatorjsCdnStable",
      label: "EmulatorJS CDN stable / gearcoleco",
      kind: "emulatorjs",
      loaderUrl: "https://cdn.emulatorjs.org/stable/data/loader.js",
      dataPath: "https://cdn.emulatorjs.org/stable/data/",
      coreProbeUrl: null,
      assetOverrides: null
    });
  }

  async function runEmbeddedEmulator() {
    const compiledRom = getCompiledRom();
    const emulatorBios = getEmulatorBios();
    if (!compiledRom) {
      setStatus("No compiled ROM yet. Compile ROM first.");
      return;
    }
    if (!emulatorBios) {
      setStatus("Load a ColecoVision BIOS first.");
      return;
    }
    const project = getProject();
    const activeBackend = getActiveEmulatorBackend();
    const emulatorBackend = await chooseRunnableEmulatorBackend();
    const usedFallbackBackend = emulatorBackend.id !== activeBackend.id;
    const srcdoc = buildEmulatorSrcdoc({
      romUrl: bytesToObjectUrl(compiledRom, "application/octet-stream"),
      biosUrl: getEmulatorBiosSourceUrl() || bytesToDataUrl(emulatorBios, "application/octet-stream"),
      gameName: project.projectName || "Amy Project",
      emulatorBackendOverride: emulatorBackend
    });
    const popupFeatures = [
      "popup=yes",
      "width=960",
      "height=780",
      "resizable=yes",
      "scrollbars=no"
    ].join(",");
    const emulatorWindow = window.open("", "alexisColecoEmulator", popupFeatures);
    setEmulatorWindow(emulatorWindow);
    if (emulatorWindow) {
      emulatorWindow.document.open();
      emulatorWindow.document.write(srcdoc);
      emulatorWindow.document.close();
      els.emulatorHost?.classList.add("emulator-host--detached");
      els.emulatorPlaceholder.textContent = "Emulator running in a floating window.";
      els.emulatorPlaceholder?.classList.remove("hidden");
      els.emulatorFrame.classList.add("hidden");
      updateEmulatorUi();
      const prefix = usedFallbackBackend
        ? "Local EmulatorJS core was not found, so Amy Studio fell back to the CDN backend. "
        : "";
      setStatus(`${prefix}Emulator opened in a floating window for ${project.projectName || "amy"} using ${emulatorBackend.label}.`);
      return;
    }
    updateEmulatorUi();
    const prefix = usedFallbackBackend
      ? "Local EmulatorJS core was not found, so Amy Studio fell back to the CDN backend. "
      : "";
    setStatus(`${prefix}Popup blocked. Allow popups to run the emulator for ${project.projectName || "amy"} using ${emulatorBackend.label}.`);
  }

  async function tryAutoLoadBios() {
    if (getEmulatorBios()) return true;
    for (const candidate of defaultBiosCandidates) {
      try {
        const response = await fetch(candidate);
        if (!response.ok) continue;
        const buffer = await response.arrayBuffer();
        setEmulatorBios(new Uint8Array(buffer));
        setEmulatorBiosName(candidate.split("/").pop() || "colecovision.rom");
        setEmulatorBiosSourceUrl(new URL(candidate, window.location.href).href);
        updateEmulatorUi();
        setStatus(`Auto-loaded BIOS ${getEmulatorBiosName()} from studio/bios.`);
        return true;
      } catch {
        // Try next candidate.
      }
    }
    updateEmulatorUi();
    return false;
  }

  function setView(_view) {
    els.studioView?.classList.remove("hidden");
  }

  return {
    updateEmulatorUi,
    revokeEmulatorRomObjectUrl,
    bytesToObjectUrl,
    resetEmbeddedEmulator,
    clearCompiledArtifacts,
    buildEmulatorSrcdoc,
    runEmbeddedEmulator,
    tryAutoLoadBios,
    setView
  };
}
