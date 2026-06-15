import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

test("sidebar exposes a separate partial units section", () => {
  const source = readFileSync("src/components/app-shell.tsx", "utf8");

  assert.match(source, /href: "\/partial-units"/);
  assert.match(source, /label: "وحدات جزئية"/);
});

test("property form supports partial availability and a required custom type", () => {
  const source = readFileSync("src/components/property-form.tsx", "utf8");
  const constants = readFileSync("src/lib/constants.ts", "utf8");

  assert.match(source, /mode\?: "full" \| "partial"/);
  assert.match(source, /availability_type/);
  assert.match(constants, /سرير/);
  assert.match(constants, /غرفة/);
  assert.match(constants, /أخرى/);
  assert.match(source, /availabilityType === "other"/);
  assert.match(source, /required/);
  assert.match(source, /availability_other/);
});

test("properties view separates full and partial records", () => {
  const source = readFileSync("src/components/properties-view.tsx", "utf8");

  assert.match(source, /mode\?: "full" \| "partial"/);
  assert.match(source, /property\.is_partial !== \(mode === "partial"\)/);
  assert.match(source, /property\.availability_type/);
  assert.match(source, /property\.availability_other/);
});

test("partial unit routes use the shared property experience in partial mode", () => {
  const listPage = readFileSync("src/app/partial-units/page.tsx", "utf8");
  const newPage = readFileSync("src/app/partial-units/new/page.tsx", "utf8");
  const editPage = readFileSync("src/app/partial-units/[id]/edit/page.tsx", "utf8");

  assert.match(listPage, /<PropertiesView mode="partial"/);
  assert.match(newPage, /<PropertyForm mode="partial"/);
  assert.match(editPage, /<PropertyForm mode="partial" property=\{property\}/);
});

test("partial units page can import units from a local json file", () => {
  const listPage = readFileSync("src/app/partial-units/page.tsx", "utf8");
  const importer = readFileSync("src/components/property-json-importer.tsx", "utf8");

  assert.match(listPage, /<PropertyJsonImporter mode="partial"/);
  assert.match(importer, /type="file"/);
  assert.match(importer, /accept="application\/json,\s*\.json"/);
  assert.match(importer, /JSON\.parse/);
  assert.match(importer, /extractImportItems/);
  assert.match(importer, /requiredFields/);
  assert.match(importer, /create_partial_property/);
  assert.match(importer, /create_property/);
  assert.match(importer, /onImported/);
});

test("main units page can import units from a local json file", () => {
  const propertiesPage = readFileSync("src/app/properties/page.tsx", "utf8");

  assert.match(propertiesPage, /<PropertyJsonImporter mode="full"/);
  assert.match(propertiesPage, /href="\/properties\/new"/);
});

test("city selection opens a unit category choice before listing records", () => {
  const cityPage = readFileSync("src/app/cities/page.tsx", "utf8");
  const categoryPage = readFileSync("src/app/unit-category/page.tsx", "utf8");

  assert.match(cityPage, /href=\{`\/unit-category\?operation=\$\{operation\}&city=/);
  assert.match(categoryPage, /وحدات رئيسية/);
  assert.match(categoryPage, /وحدات جزئية/);
  assert.match(categoryPage, /href=\{`\/properties\?operation=\$\{operation\}&city=/);
  assert.match(categoryPage, /href=\{`\/partial-units\?operation=\$\{operation\}&city=/);
});

test("primary unit labels are explicit across navigation and list page", () => {
  const shell = readFileSync("src/components/app-shell.tsx", "utf8");
  const propertiesPage = readFileSync("src/app/properties/page.tsx", "utf8");

  assert.match(shell, /label: "الوحدات الرئيسية"/);
  assert.match(propertiesPage, /eyebrow="إدارة الوحدات الرئيسية"/);
  assert.match(propertiesPage, /title="الوحدات الرئيسية"/);
});

test("database migration adds partial-unit fields without changing old records", () => {
  const source = readFileSync("supabase/add-partial-units.sql", "utf8");

  assert.match(source, /add column if not exists is_partial boolean not null default false/);
  assert.match(source, /add column if not exists availability_type text/);
  assert.match(source, /add column if not exists availability_other text/);
  assert.match(source, /create_partial_property/);
  assert.match(source, /update_partial_property/);
});
