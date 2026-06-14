import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

test("admin navigation exposes a backup page", () => {
  const shellSource = readFileSync("src/components/app-shell.tsx", "utf8");
  const pageSource = readFileSync("src/app/admin/backup/page.tsx", "utf8");

  assert.match(shellSource, /href: "\/admin\/backup"/);
  assert.match(shellSource, /label: "نسخ احتياطي"/);
  assert.match(pageSource, /<RequireAuth adminOnly>/);
  assert.match(pageSource, /<BackupManager \/>/);
});

test("backup manager exports and imports json through Supabase RPCs", () => {
  const source = readFileSync("src/components/backup-manager.tsx", "utf8");

  assert.match(source, /rpc\("export_app_backup"\)/);
  assert.match(source, /new Blob\(\[JSON\.stringify/);
  assert.match(source, /application\/json/);
  assert.match(source, /download = `al-kayan-backup-/);
  assert.match(source, /type="file"/);
  assert.match(source, /accept="application\/json,\s*\.json"/);
  assert.match(source, /JSON\.parse/);
  assert.match(source, /rpc\("import_app_backup"/);
});

test("database schema provides admin-only backup rpc functions", () => {
  const schema = readFileSync("supabase/schema.sql", "utf8");
  const migration = readFileSync("supabase/add-backup-functions.sql", "utf8");
  const combined = `${schema}\n${migration}`;

  assert.match(combined, /create or replace function public\.export_app_backup\(\)/);
  assert.match(combined, /create or replace function public\.import_app_backup\(p_backup jsonb\)/);
  assert.match(combined, /if not public\.is_admin\(\) then/);
  assert.match(combined, /jsonb_build_object\('version', 1/);
  assert.match(combined, /'properties', coalesce\(/);
  assert.match(combined, /'customers', coalesce\(/);
  assert.match(combined, /'users', coalesce\(/);
  assert.match(combined, /on conflict \(id\) do update/);
  assert.match(combined, /grant execute on function public\.export_app_backup\(\) to authenticated/);
  assert.match(combined, /grant execute on function public\.import_app_backup\(jsonb\) to authenticated/);
});
