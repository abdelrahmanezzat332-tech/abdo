import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

test("property cards can refresh and display a manual update timestamp", () => {
  const typeSource = readFileSync("src/lib/types.ts", "utf8");
  const cardSource = readFileSync("src/components/property-card.tsx", "utf8");
  const viewSource = readFileSync("src/components/properties-view.tsx", "utf8");
  const schemaSource = readFileSync("supabase/schema.sql", "utf8");
  const migrationSource = readFileSync("supabase/add-property-refresh-timestamp.sql", "utf8");

  const sqlSource = `${schemaSource}\n${migrationSource}`;

  assert.match(typeSource, /last_refreshed_at:\s*string \| null/);
  assert.match(cardSource, /تحديث/);
  assert.match(cardSource, /آخر تحديث/);
  assert.match(cardSource, /property\.last_refreshed_at/);
  assert.match(viewSource, /refreshProperty/);
  assert.match(viewSource, /rpc\("refresh_property_timestamp"/);
  assert.match(sqlSource, /last_refreshed_at timestamptz/);
  assert.match(sqlSource, /add column if not exists last_refreshed_at timestamptz/);
  assert.match(sqlSource, /create or replace function public\.refresh_property_timestamp/);
  assert.match(sqlSource, /last_refreshed_at\s*=\s*now\(\)/);
  assert.match(sqlSource, /returning properties\.last_refreshed_at/);
});
