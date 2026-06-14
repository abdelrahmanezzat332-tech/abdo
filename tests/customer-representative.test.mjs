import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

test("customer representative is optional, editable, persisted, and displayed", () => {
  const typeSource = readFileSync("src/lib/types.ts", "utf8");
  const formSource = readFileSync("src/components/customer-form.tsx", "utf8");
  const cardSource = readFileSync("src/components/customer-card.tsx", "utf8");
  const schemaSource = readFileSync("supabase/schema.sql", "utf8");
  const migrationSource = readFileSync("supabase/add-customer-representative.sql", "utf8");

  assert.match(typeSource, /representative_name:\s*string \| null/);

  assert.match(formSource, /representative_name:\s*string/);
  assert.match(formSource, /customer\.representative_name \?\? ""/);
  assert.match(formSource, /p_representative_name:\s*form\.representative_name\.trim\(\) \|\| null/);
  assert.match(formSource, /<span>المندوب \(اختياري\)<\/span>/);
  assert.doesNotMatch(formSource, /representative_name[\s\S]{0,120}required/);

  assert.match(cardSource, /customer\.representative_name\?\.trim\(\)/);
  assert.match(cardSource, /المندوب:/);

  assert.match(schemaSource, /representative_name text/);
  assert.match(schemaSource, /p_representative_name\s+text/);
  assert.match(schemaSource, /representative_name\s*=\s*nullif/);

  assert.match(migrationSource, /add column if not exists representative_name text/);
  assert.match(migrationSource, /create or replace function public\.update_customer/);
  assert.match(migrationSource, /notify pgrst, 'reload schema'/);
});

