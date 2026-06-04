import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

test("properties view searches by property code without exposing mobile search to unauthorized users", () => {
  const source = readFileSync("src/components/properties-view.tsx", "utf8");

  assert.match(source, /matchesPropertyCode/);
  assert.match(source, /property\.property_code/);
  assert.match(source, /matchesMobile/);
  assert.match(source, /canViewMobile && property\.mobile/);
  assert.match(source, /matchesSearch/);
  assert.doesNotMatch(source, /\{canViewMobile \? \(\s*<label>/);
});
