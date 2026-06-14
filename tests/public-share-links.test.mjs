import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

test("public share links are executable by anonymous visitors and only expose available units", () => {
  const migration = readFileSync("supabase/ensure-public-dynamic-share-links.sql", "utf8");

  assert.match(migration, /create or replace function public\.get_shared_properties\(p_share_id uuid\)/);
  assert.match(migration, /security definer/);
  assert.match(migration, /grant execute on function public\.get_shared_properties\(uuid\) to anon, authenticated/);
  assert.match(migration, /grant select on public\.shared_links to anon, authenticated/);
  assert.match(migration, /p\.status = 'available'::public\.property_status/);
  assert.match(migration, /v_dynamic_type = 'all'/);
  assert.match(migration, /v_dynamic_type = 'main' and not p\.is_partial/);
  assert.match(migration, /v_dynamic_type = 'partial' and p\.is_partial/);
});
