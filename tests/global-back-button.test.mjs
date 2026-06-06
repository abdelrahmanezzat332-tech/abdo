import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

test("authenticated pages expose a shared back button with smart route targets", () => {
  const shellSource = readFileSync("src/components/app-shell.tsx", "utf8");
  const buttonSource = readFileSync("src/components/back-button.tsx", "utf8");
  const navigationSource = readFileSync("src/lib/back-navigation.ts", "utf8");
  const cssSource = readFileSync("src/app/globals.css", "utf8");

  assert.match(shellSource, /import \{ BackButton \}/);
  assert.match(shellSource, /<BackButton \/>/);
  assert.match(buttonSource, /usePathname/);
  assert.match(buttonSource, /useSearchParams/);
  assert.match(buttonSource, /getBackDestination/);
  assert.match(buttonSource, /router\.push\(destination\)/);
  assert.match(navigationSource, /pathname === "\/properties"/);
  assert.match(navigationSource, /pathname === "\/partial-units"/);
  assert.match(navigationSource, /\/unit-category\?operation=\$\{operation\}&city=\$\{city\}/);
  assert.match(navigationSource, /pathname === "\/unit-category"/);
  assert.match(navigationSource, /\/cities\?operation=\$\{operation\}/);
  assert.match(navigationSource, /pathname === "\/cities"/);
  assert.match(navigationSource, /"\/choose-operation"/);
  assert.match(navigationSource, /pathname === "\/properties\/new"/);
  assert.match(navigationSource, /pathname === "\/partial-units\/new"/);
  assert.match(navigationSource, /pathname === "\/customers\/new"/);
  assert.match(buttonSource, /رجوع/);
  assert.match(cssSource, /\.page-back-button/);
});
