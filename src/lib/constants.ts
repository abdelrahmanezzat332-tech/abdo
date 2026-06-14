export const ADMIN_EMAIL = "abdelrahmanezzat332@gmail.com";

export const operations = [
  { value: "sell", label: "بيع" },
  { value: "rent", label: "إيجار" }
] as const;

export const propertyStatuses = [
  { value: "available", label: "متوفرة" },
  { value: "sold", label: "تم البيع" },
  { value: "rented", label: "تم الإيجار" }
] as const;

export const partialAvailabilityTypes = [
  { value: "bed", label: "سرير" },
  { value: "room", label: "غرفة" },
  { value: "other", label: "أخرى" }
] as const;

export const cities = ["بدر", "الشروق", "مدينتي", "العبور"] as const;

export const propertyTypes = [
  "شقق",
  "فلل",
  "عمارات",
  "محلات",
  "استوديو",
  "دوبلكس",
  "أراضي",
  "إداري",
  "تجاري",
  "أخرى"
] as const;

export const permissionLabels = {
  can_add_employee: "إضافة موظفين",
  can_edit_permissions: "تعديل الصلاحيات",
  can_delete_employee: "حذف الموظفين",
  can_add_property: "إضافة وحدات",
  can_edit_property: "تعديل الوحدات",
  can_delete_property: "حذف الوحدات",
  can_add_customer: "إضافة عملاء",
  can_edit_customer: "تعديل العملاء",
  can_delete_customer: "حذف العملاء",
  can_view_mobile: "رؤية رقم الموبايل",
  can_view_customer_mobile: "رؤية رقم موبايل العملاء",
  can_view_all: "رؤية كل البيانات"
} as const;

export const propertyImages: Record<string, string> = {
  "شقق": "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80",
  "فلل": "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=600&q=80",
  "عمارات": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80",
  "محلات": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80",
  "استوديو": "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80",
  "دوبلكس": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
  "أراضي": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80",
  "إداري": "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80",
  "تجاري": "https://images.unsplash.com/photo-1478860121278-78ae43b26410?auto=format&fit=crop&w=600&q=80",
  "أخرى": "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80"
};

export function getPropertyImageUrl(type: string): string {
  return propertyImages[type] || propertyImages["أخرى"];
}

