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

test("properties view has a separate text search across all visible property data", () => {
  const source = readFileSync("src/components/properties-view.tsx", "utf8");

  assert.match(source, /const \[dataSearch, setDataSearch\] = useState\(""\)/);
  assert.match(source, /const dataSearchTerm = dataSearch\.trim\(\)\.toLowerCase\(\)/);
  assert.match(source, /property\.property_code/);
  assert.match(source, /property\.description/);
  assert.match(source, /property\.city/);
  assert.match(source, /property\.property_type/);
  assert.match(source, /property\.employee_name/);
  assert.match(source, /property\.price/);
  assert.match(source, /property\.status/);
  assert.match(source, /property\.operation/);
  assert.match(source, /canViewMobile \? property\.mobile : ""/);
  assert.match(source, /matchesDataSearch/);
  assert.match(source, /matchesSearch && matchesDataSearch && matchesEmployee/);
  assert.match(source, /value=\{dataSearch\}/);
  assert.match(source, /onChange=\{\(event\) => setDataSearch\(event\.target\.value\)\}/);
});
