import type {
  cities,
  operations,
  permissionLabels,
  propertyStatuses,
  propertyTypes
} from "@/lib/constants";

export type Operation = (typeof operations)[number]["value"];
export type City = (typeof cities)[number];
export type PropertyType = (typeof propertyTypes)[number];
export type PropertyStatus = (typeof propertyStatuses)[number]["value"];
export type PermissionKey = keyof typeof permissionLabels;

export type UserRole = "admin" | "employee";

export type UserProfile = {
  id: string;
  auth_id: string | null;
  full_name: string;
  email: string;
  role: UserRole;
  can_add_employee: boolean;
  can_edit_permissions: boolean;
  can_delete_employee: boolean;
  can_add_property: boolean;
  can_edit_property: boolean;
  can_delete_property: boolean;
  can_add_customer: boolean;
  can_edit_customer: boolean;
  can_delete_customer: boolean;
  can_view_mobile: boolean;
  can_view_customer_mobile: boolean;
  can_view_all: boolean;
  created_at: string;
  updated_at: string;
};

export type Property = {
  id: string;
  property_code: string | null;
  operation: Operation;
  city: City;
  property_type: PropertyType;
  employee_name: string;
  mobile: string;
  description: string;
  status: PropertyStatus;
  archived_at: string | null;
  related_property_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PropertyInput = Omit<Property, "id" | "created_at" | "updated_at">;

export type Customer = {
  id: string;
  customer_code: string;
  customer_name: string | null;
  mobile: string;
  city: City;
  budget: string;
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerInput = Omit<Customer, "id" | "customer_code" | "created_at" | "updated_at">;
