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

test("properties view resets manual filters when leaving or returning to the page", () => {
  const source = readFileSync("src/components/properties-view.tsx", "utf8");

  assert.match(source, /function resetFilters/);
  assert.match(source, /setSearch\(""\)/);
  assert.match(source, /setDataSearch\(""\)/);
  assert.match(source, /setEmployee\(""\)/);
  assert.match(source, /setType\(""\)/);
  assert.match(source, /setCity\(initialCity\)/);
  assert.match(source, /setOperation\(initialOperation\)/);
  assert.match(source, /window\.addEventListener\("pagehide", resetFilters\)/);
  assert.match(source, /window\.addEventListener\("pageshow", handlePageShow\)/);
  assert.match(source, /مسح البحث/);
});

test("customers view searches across customer data and resets filters on return", () => {
  const source = readFileSync("src/components/customers-view.tsx", "utf8");

  assert.match(source, /function resetFilters/);
  assert.match(source, /setSearch\(""\)/);
  assert.match(source, /setCity\(""\)/);
  assert.match(source, /window\.addEventListener\("pagehide", resetFilters\)/);
  assert.match(source, /window\.addEventListener\("pageshow", handlePageShow\)/);
  assert.match(source, /customer\.customer_code/);
  assert.match(source, /customer\.customer_name \?\? ""/);
  assert.match(source, /customer\.representative_name \?\? ""/);
  assert.match(source, /customer\.budget/);
  assert.match(source, /customer\.notes/);
  assert.match(source, /canViewMobile \? customer\.mobile : ""/);
  assert.match(source, /matchesDataSearch/);
  assert.match(source, /مسح البحث/);
});
