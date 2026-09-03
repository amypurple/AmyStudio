import assert from "node:assert/strict";
import { filterMarkdown, markdownToHtml } from "../studio/core/docsUi.js";

const fixture = `# Audio

Coleco sound uses this form:

\`\`\`basic
set sound table GameSoundTable areas 8
play sound SoundIndex
\`\`\`

Each sound command has a duration.

Another unrelated paragraph.
`;

const filtered = filterMarkdown(fixture, "sound");
assert.equal((filtered.match(/set sound table/g) || []).length, 1, "Overlapping matches must not duplicate code.");
assert.equal((filtered.match(/^\`\`\`/gm) || []).length, 2, "Filtered code fences must remain balanced.");

const html = markdownToHtml(filtered);
assert.equal((html.match(/set sound table/g) || []).length, 1, "Rendered code must appear once.");
assert.match(html, /<pre><code>[\s\S]*play sound SoundIndex[\s\S]*<\/code><\/pre>/,
  "Filtered code must remain inside a code block.");

const imageHtml = markdownToHtml("![Sound inspector](images/studio-sound-inspector.png)");
assert.match(imageHtml, /<img class="docs-image" src="\.\.\/docs\/images\/studio-sound-inspector\.png" alt="Sound inspector"/,
  "Documentation images must resolve from Studio to the docs image directory.");
assert.doesNotMatch(markdownToHtml("![Private](C:\\Users\\Example\\secret.png)"), /<img/,
  "Documentation must not render local absolute image paths.");

console.log("Docs search filter tests passed.");
