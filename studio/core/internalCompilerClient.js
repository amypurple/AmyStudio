let compilerWorker = null;
let nextRequestId = 1;
const pendingRequests = new Map();

async function compileOnMainThread(asmText, mainFile, options) {
  const compiler = await import("./internalCompiler.js");
  return compiler.compileGeneratedAsm(asmText, mainFile, options);
}

function rejectPendingRequests(error) {
  for (const { reject } of pendingRequests.values()) reject(error);
  pendingRequests.clear();
}

function getCompilerWorker() {
  if (compilerWorker || typeof Worker === "undefined" || typeof URL === "undefined") return compilerWorker;
  compilerWorker = new Worker(new URL("./internalCompilerWorker.js", import.meta.url), { type: "module" });
  compilerWorker.onmessage = (event) => {
    const { id, result, error } = event.data || {};
    const request = pendingRequests.get(id);
    if (!request) return;
    pendingRequests.delete(id);
    if (error) request.reject(new Error(error));
    else request.resolve(result);
  };
  compilerWorker.onerror = (event) => {
    const error = new Error(event?.message || "Compiler worker failed.");
    compilerWorker?.terminate();
    compilerWorker = null;
    rejectPendingRequests(error);
  };
  return compilerWorker;
}

export async function compileGeneratedAsm(asmText, mainFile = "main.asm", options = {}) {
  const worker = getCompilerWorker();
  if (!worker) return compileOnMainThread(asmText, mainFile, options);
  const id = nextRequestId++;
  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    worker.postMessage({ id, asmText, mainFile, options });
  });
}

export async function expandAsmIncludes(...args) {
  const compiler = await import("./internalCompiler.js");
  return compiler.expandAsmIncludes(...args);
}
