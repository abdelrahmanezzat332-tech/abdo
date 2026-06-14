export function getShareUrl(id: string) {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  const browserOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const origin = configuredOrigin || browserOrigin;

  return `${origin}/share/${id}`;
}
