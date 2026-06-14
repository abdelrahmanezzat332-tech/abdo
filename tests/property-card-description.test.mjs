import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

test("property card exposes the full description in a responsive side drawer", () => {
  const cardSource = readFileSync("src/components/property-card.tsx", "utf8");
  const cssSource = readFileSync("src/app/globals.css", "utf8");

  assert.match(cardSource, /descriptionDrawerOpen/);
  assert.match(cardSource, /عرض المزيد/);
  assert.match(cardSource, /role="dialog"/);
  assert.match(cardSource, /aria-modal="true"/);
  assert.match(cardSource, /description-drawer-panel/);
  assert.match(cssSource, /\.description-drawer-panel/);
  assert.match(cssSource, /max-height:\s*calc\(100vh - 2rem\)/);
  assert.match(cssSource, /overflow-y:\s*auto/);
  assert.match(cssSource, /@media \(max-width: 700px\)/);
});
