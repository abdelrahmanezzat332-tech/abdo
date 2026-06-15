const DEFAULT_PUBLIC_SITE_ORIGIN = "https://abdo-pied.vercel.app";

function normalizeOrigin(origin?: string) {
  return origin?.trim().replace(/\/+$/, "") || "";
}

function getBrowserOrigin() {
  return typeof window !== "undefined" ? window.location.origin : "";
}

export function getConfiguredShareOrigin() {
  return normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL);
}

export function getProductionOriginFromPreview(origin = getBrowserOrigin()) {
  try {
    const url = new URL(origin);
    const previewMatch = url.hostname.match(/^(.+)-git-.+\.vercel\.app$/);

    if (!previewMatch) return "";

    return `${url.protocol}//${previewMatch[1]}.vercel.app`;
  } catch {
    return "";
  }
}

export function isLikelyVercelPreviewOrigin(origin = getBrowserOrigin()) {
  try {
    return /^.+-git-.+\.vercel\.app$/.test(new URL(origin).hostname);
  } catch {
    return false;
  }
}

export function getShareOriginWarning() {
  const configuredOrigin = getConfiguredShareOrigin();
  if (configuredOrigin) return "";

  const browserOrigin = getBrowserOrigin();
  if (!isLikelyVercelPreviewOrigin(browserOrigin)) return "";

  const productionOrigin = getProductionOriginFromPreview(browserOrigin);
  const publicOrigin = productionOrigin || DEFAULT_PUBLIC_SITE_ORIGIN;

  return `Preview deployment detected. Customer links will use ${publicOrigin} instead of the protected preview URL.`;
}

export function getShareUrl(id: string) {
  const configuredOrigin = getConfiguredShareOrigin();
  const browserOrigin = normalizeOrigin(getBrowserOrigin());
  const productionOrigin = getProductionOriginFromPreview(browserOrigin);
  const origin = configuredOrigin || productionOrigin || DEFAULT_PUBLIC_SITE_ORIGIN || browserOrigin;

  return `${origin}/share/${id}`;
}
