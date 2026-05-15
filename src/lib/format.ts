export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function operationLabel(operation: string) {
  return operation === "sell" ? "بيع" : "إيجار";
}

export function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "").trim();
}
