import { compileGeneratedAsm } from "./internalCompiler.js";

self.onmessage = async (event) => {
  const { id, asmText, mainFile, options } = event.data || {};
  try {
    const result = await compileGeneratedAsm(asmText, mainFile, options);
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({
      id,
      error: error?.message || String(error)
    });
  }
};
