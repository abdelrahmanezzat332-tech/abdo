import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

test("share links use the configured public site url before falling back to window origin", () => {
  const helperSource = readFileSync("src/lib/share-url.ts", "utf8");
  const adminSharesSource = readFileSync("src/components/admin-shares.tsx", "utf8");
  const shareModalSource = readFileSync("src/components/share-modal.tsx", "utf8");

  assert.match(helperSource, /NEXT_PUBLIC_SITE_URL/);
  assert.match(helperSource, /abdo-pied\.vercel\.app/);
  assert.match(helperSource, /window\.location\.origin/);
  assert.match(helperSource, /getProductionOriginFromPreview/);
  assert.match(helperSource, /-git-/);
  assert.match(helperSource, /\/share\/\$\{id\}/);
  assert.match(adminSharesSource, /import \{ getShareOriginWarning, getShareUrl \}/);
  assert.match(shareModalSource, /import \{ getShareOriginWarning, getShareUrl \}/);
  assert.match(adminSharesSource, /warning-note/);
  assert.match(shareModalSource, /warning-note/);
  assert.doesNotMatch(adminSharesSource, /window\.location\.origin/);
  assert.doesNotMatch(shareModalSource, /window\.location\.origin/);
});
