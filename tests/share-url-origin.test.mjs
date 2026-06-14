import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

test("share links use the configured public site url before falling back to window origin", () => {
  const helperSource = readFileSync("src/lib/share-url.ts", "utf8");
  const adminSharesSource = readFileSync("src/components/admin-shares.tsx", "utf8");
  const shareModalSource = readFileSync("src/components/share-modal.tsx", "utf8");

  assert.match(helperSource, /NEXT_PUBLIC_SITE_URL/);
  assert.match(helperSource, /window\.location\.origin/);
  assert.match(helperSource, /\/share\/\$\{id\}/);
  assert.match(adminSharesSource, /import \{ getShareUrl \}/);
  assert.match(shareModalSource, /import \{ getShareUrl \}/);
  assert.doesNotMatch(adminSharesSource, /window\.location\.origin/);
  assert.doesNotMatch(shareModalSource, /window\.location\.origin/);
});
