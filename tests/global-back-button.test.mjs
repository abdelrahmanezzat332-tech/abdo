import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

test("authenticated pages expose a shared back button with a home fallback", () => {
  const shellSource = readFileSync("src/components/app-shell.tsx", "utf8");
  const buttonSource = readFileSync("src/components/back-button.tsx", "utf8");
  const cssSource = readFileSync("src/app/globals.css", "utf8");

  assert.match(shellSource, /import \{ BackButton \}/);
  assert.match(shellSource, /<BackButton \/>/);
  assert.match(buttonSource, /window\.history\.length > 1/);
  assert.match(buttonSource, /router\.back\(\)/);
  assert.match(buttonSource, /router\.push\("\/choose-operation"\)/);
  assert.match(buttonSource, /رجوع/);
  assert.match(cssSource, /\.page-back-button/);
});

