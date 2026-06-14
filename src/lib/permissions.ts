import { ADMIN_EMAIL } from "@/lib/constants";
import type { PermissionKey, UserProfile } from "@/lib/types";

export function isAdminEmail(email?: string | null) {
  return email?.toLowerCase() === ADMIN_EMAIL;
}

export function getDefaultProfilePermissions(email: string) {
  const isAdmin = isAdminEmail(email);

  return {
    role: isAdmin ? "admin" : "employee",
    can_add_employee: isAdmin,
    can_edit_permissions: isAdmin,
    can_delete_employee: isAdmin,
    can_add_property: true,
    can_edit_property: isAdmin,
    can_delete_property: isAdmin,
    can_add_customer: true,
    can_edit_customer: isAdmin,
    can_delete_customer: isAdmin,
    can_view_mobile: isAdmin,
    can_view_customer_mobile: isAdmin,
    can_view_all: isAdmin
  } as const;
}

export function hasPermission(profile: UserProfile | null, permission: PermissionKey) {
  if (!profile) return false;
  return profile.role === "admin" || profile[permission];
}

export function canManageProperty(profile: UserProfile | null, action: "edit" | "delete") {
  if (action === "edit") return hasPermission(profile, "can_edit_property");
  return hasPermission(profile, "can_delete_property");
}

export function canManageCustomer(profile: UserProfile | null, action: "edit" | "delete") {
  if (action === "edit") return hasPermission(profile, "can_edit_customer");
  return hasPermission(profile, "can_delete_customer");
}
