import assert from "node:assert/strict";
import { getEditorAdapter } from "../studio/core/editor/editorAdapter.js";

class MockEditor extends EventTarget {
  constructor(value = "") {
    super();
    this.value = value;
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this.selectionDirection = "none";
    this.scrollTop = 0;
    this.scrollLeft = 0;
  }
  setSelectionRange(start, end, direction = "none") {
    this.selectionStart = start;
    this.selectionEnd = end;
    this.selectionDirection = direction;
  }
  setRangeText(text, start, end) {
    this.value = this.value.slice(0, start) + text + this.value.slice(end);
  }
  focus() {}
}

const editor = new MockEditor("alpha beta");
const adapter = getEditorAdapter(editor);
assert.equal(getEditorAdapter(editor), adapter);
assert.equal(adapter.getText(), "alpha beta");
adapter.setSelection(6, 10);
adapter.replaceRange("Amy", 6, 10, { selection: "select", notify: false });
assert.equal(adapter.getText(), "alpha Amy");
assert.deepEqual(adapter.getSelection(), { start: 6, end: 9, direction: "none" });
let inputCount = 0;
adapter.onChange(() => inputCount += 1);
adapter.replaceRange("Studio", 6, 9);
assert.equal(adapter.getText(), "alpha Studio");
assert.equal(inputCount, 1);
adapter.setSelection(2, 5);
adapter.setText("xy", { preserveSelection: true });
assert.deepEqual(adapter.getSelection(), { start: 2, end: 2, direction: "none" });
let textChangeCount = 0;
adapter.onTextChange(() => textChangeCount += 1);
adapter.setText("changed");
adapter.replaceRange("!", 7, 7, { notify: false });
assert.equal(textChangeCount, 2, "programmatic changes should notify visual subscribers");
adapter.setScroll({ top: 42, left: 17 });
assert.deepEqual(adapter.getScroll(), { top: 42, left: 17 });
console.log("editor adapter: PASS");