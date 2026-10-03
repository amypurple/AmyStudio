const STORE_VERSION = 1;
const DEFAULT_PREFIX = "amy-studio:development-routes";

function normalizeInput(input = {}) {
  const masks = input.controllerMasks || [0, 0];
  const spinners = input.spinnerDeltas || [0, 0];
  return [masks[0] >>> 0, masks[1] >>> 0, spinners[0] | 0, spinners[1] | 0];
}

export function compressRouteInputs(inputs = []) {
  const runs = [];
  for (const input of inputs) {
    const values = normalizeInput(input);
    const last = runs[runs.length - 1];
    if (last && last[1] === values[0] && last[2] === values[1] &&
        last[3] === values[2] && last[4] === values[3]) {
      last[0] += 1;
    } else {
      runs.push([1, ...values]);
    }
  }
  return runs;
}

export function expandRouteInputs(runs = []) {
  const inputs = [];
  for (const run of runs) {
    const count = Math.max(0, run[0] | 0);
    for (let index = 0; index < count; ++index) {
      inputs.push({
        controllerMasks: [run[1] >>> 0, run[2] >>> 0],
        spinnerDeltas: [run[3] | 0, run[4] | 0]
      });
    }
  }
  return inputs;
}

function safeKeyPart(value) {
  return encodeURIComponent(String(value || "untitled").trim() || "untitled");
}

function normalizeDocument(value) {
  if (!value || value.version !== STORE_VERSION || !Array.isArray(value.routes)) {
    return { version: STORE_VERSION, autoRouteId: "", routes: [] };
  }
  return {
    version: STORE_VERSION,
    autoRouteId: String(value.autoRouteId || ""),
    routes: value.routes.filter((route) => route && route.id && route.checkpoint && Array.isArray(route.inputRuns))
  };
}

export function createDevelopmentRouteStore(storage, { prefix = DEFAULT_PREFIX } = {}) {
  if (!storage) throw new TypeError("Development route storage is required.");

  const keyFor = (projectId) => `${prefix}:${safeKeyPart(projectId)}`;
  const read = (projectId) => {
    try {
      return normalizeDocument(JSON.parse(storage.getItem(keyFor(projectId)) || "null"));
    } catch {
      return normalizeDocument(null);
    }
  };
  const write = (projectId, document) => storage.setItem(keyFor(projectId), JSON.stringify(document));

  return {
    list(projectId) {
      return read(projectId).routes.map((route) => ({ ...route }));
    },
    get(projectId, routeId) {
      return read(projectId).routes.find((route) => route.id === routeId) || null;
    },
    save(projectId, route) {
      const document = read(projectId);
      const normalized = {
        id: String(route.id || `route-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
        name: String(route.name || route.checkpoint || "Route").trim(),
        checkpoint: String(route.checkpoint || "").trim(),
        createdAt: route.createdAt || new Date().toISOString(),
        frameCount: route.inputs?.length || route.frameCount || 0,
        inputRuns: route.inputRuns || compressRouteInputs(route.inputs),
        environment: { ...(route.environment || {}) }
      };
      if (!normalized.checkpoint) throw new Error("A route requires a checkpoint.");
      const index = document.routes.findIndex((candidate) => candidate.id === normalized.id);
      if (index >= 0) document.routes[index] = normalized;
      else document.routes.push(normalized);
      write(projectId, document);
      return { ...normalized };
    },
    remove(projectId, routeId) {
      const document = read(projectId);
      document.routes = document.routes.filter((route) => route.id !== routeId);
      if (document.autoRouteId === routeId) document.autoRouteId = "";
      write(projectId, document);
    },
    getAutoRouteId(projectId) {
      return read(projectId).autoRouteId;
    },
    setAutoRouteId(projectId, routeId) {
      const document = read(projectId);
      document.autoRouteId = document.routes.some((route) => route.id === routeId) ? routeId : "";
      write(projectId, document);
      return document.autoRouteId;
    }
  };
}
