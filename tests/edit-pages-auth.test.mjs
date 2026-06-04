import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const editPages = [
  "src/app/properties/[id]/edit/page.tsx",
  "src/app/customers/[id]/edit/page.tsx"
];

for (const page of editPages) {
  test(`${page} waits for auth before loading the editable record`, () => {
    const source = readFileSync(page, "utf8");

    assert.match(source, /useAuth/);
    assert.match(source, /authLoading/);
    assert.match(source, /if \(authLoading\) return;/);
    assert.match(source, /if \(!user\)/);
  });
}
