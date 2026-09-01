import assert from "node:assert/strict";
import {
  AMY_AUTOCOMPLETE_STORAGE_KEY,
  loadAutocompletePreference,
  saveAutocompletePreference
} from "../studio/core/editor/autocomplete.js";

const values = new Map();
const storage = {
  getItem: (key) => values.has(key) ? values.get(key) : null,
  setItem: (key, value) => values.set(key, value)
};

assert.equal(loadAutocompletePreference(storage), true);
saveAutocompletePreference(false, storage);
assert.equal(values.get(AMY_AUTOCOMPLETE_STORAGE_KEY), "off");
assert.equal(loadAutocompletePreference(storage), false);
saveAutocompletePreference(true, storage);
assert.equal(loadAutocompletePreference(storage), true);

const blockedStorage = {
  getItem() { throw new Error("blocked"); },
  setItem() { throw new Error("blocked"); }
};
assert.equal(loadAutocompletePreference(blockedStorage), true);
assert.doesNotThrow(() => saveAutocompletePreference(false, blockedStorage));

console.log("Autocomplete preference: PASS");
