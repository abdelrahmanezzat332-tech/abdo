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

const arabicIndicDigits = "٠١٢٣٤٥٦٧٨٩";
const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

function normalizeLocalizedDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const arabicIndex = arabicIndicDigits.indexOf(digit);
    if (arabicIndex >= 0) return String(arabicIndex);

    return String(persianDigits.indexOf(digit));
  });
}

export function normalizePhone(value: string) {
  return normalizeLocalizedDigits(value).replace(/[^\d+]/g, "").trim();
}
