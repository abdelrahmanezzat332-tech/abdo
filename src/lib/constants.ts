export const ADMIN_EMAIL = "abdelrahmanezzat332@gmail.com";

export const operations = [
  { value: "sell", label: "بيع" },
  { value: "rent", label: "إيجار" }
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
  can_view_mobile: "رؤية رقم الموبايل",
  can_view_all: "رؤية كل البيانات"
} as const;
