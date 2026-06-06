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

test("database migration adds partial-unit fields without changing old records", () => {
  const source = readFileSync("supabase/add-partial-units.sql", "utf8");

  assert.match(source, /add column if not exists is_partial boolean not null default false/);
  assert.match(source, /add column if not exists availability_type text/);
  assert.match(source, /add column if not exists availability_other text/);
  assert.match(source, /create_partial_property/);
  assert.match(source, /update_partial_property/);
});
