"use client";

import { Save, Trash2, UserPlus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { permissionLabels } from "@/lib/constants";
import { getDefaultProfilePermissions, hasPermission, isAdminEmail } from "@/lib/permissions";
import { getSupabase } from "@/lib/supabase";
import type { PermissionKey, UserProfile } from "@/lib/types";

type DraftEmployee = {
  full_name: string;
  email: string;
};

const permissionKeys = Object.keys(permissionLabels) as PermissionKey[];

export function EmployeeManagement({ mode }: { mode: "employees" | "permissions" }) {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftEmployee>({ full_name: "", email: "" });

  async function loadEmployees() {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false });
    if (error) {
      showToast(error.message, "error");
      return;
    }
    setEmployees((data ?? []) as UserProfile[]);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadEmployees();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasPermission(profile, "can_add_employee")) {
      showToast("ليست لديك صلاحية إضافة موظفين", "error");
      return;
    }

    const email = draft.email.trim().toLowerCase();
    const supabase = getSupabase();
    const payload = {
      full_name: draft.full_name.trim(),
      email,
      ...getDefaultProfilePermissions(email)
    };

    const { error } = await supabase.from("users").insert(payload);
    if (error) {
      showToast(error.code === "23505" ? "هذا البريد موجود بالفعل" : error.message, "error");
      return;
    }

    showToast("تمت إضافة الموظف بنجاح", "success");
    setDraft({ full_name: "", email: "" });
    loadEmployees();
  }

  function updatePermission(id: string, key: PermissionKey, value: boolean) {
    setEmployees((current) =>
      current.map((employee) => (employee.id === id ? { ...employee, [key]: value } : employee))
    );
  }

  async function saveEmployee(employee: UserProfile) {
    if (!hasPermission(profile, "can_edit_permissions")) {
      showToast("ليست لديك صلاحية تعديل الصلاحيات", "error");
      return;
    }

    setSavingId(employee.id);
    const supabase = getSupabase();
    const updatePayload = {
      full_name: employee.full_name,
      role: isAdminEmail(employee.email) ? "admin" : employee.role,
      can_add_employee: employee.can_add_employee,
      can_edit_permissions: employee.can_edit_permissions,
      can_delete_employee: employee.can_delete_employee,
      can_add_property: employee.can_add_property,
      can_edit_property: employee.can_edit_property,
      can_delete_property: employee.can_delete_property,
      can_add_customer: employee.can_add_customer,
      can_edit_customer: employee.can_edit_customer,
      can_delete_customer: employee.can_delete_customer,
      can_view_mobile: employee.can_view_mobile,
      can_view_customer_mobile: employee.can_view_customer_mobile,
      can_view_all: employee.can_view_all
    };

    const { error } = await supabase.from("users").update(updatePayload).eq("id", employee.id);
    setSavingId(null);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    showToast("تم حفظ الصلاحيات", "success");
  }

  async function deleteEmployee(employee: UserProfile) {
    if (!hasPermission(profile, "can_delete_employee")) {
      showToast("ليست لديك صلاحية حذف الموظفين", "error");
      return;
    }
    if (isAdminEmail(employee.email)) {
      showToast("لا يمكن حذف حساب الأدمن الرئيسي", "error");
      return;
    }
    if (!window.confirm(`حذف الموظف ${employee.full_name}؟`)) return;

    const supabase = getSupabase();
    const { error } = await supabase.from("users").delete().eq("id", employee.id);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    setEmployees((current) => current.filter((item) => item.id !== employee.id));
    showToast("تم حذف الموظف من النظام", "success");
  }

  return (
    <div className="admin-grid">
      {mode === "employees" ? (
        <form className="panel employee-form" onSubmit={addEmployee}>
          <h2>إضافة موظف بالإيميل</h2>
          <label>
            <span>اسم الموظف</span>
            <input
              required
              value={draft.full_name}
              onChange={(event) => setDraft((current) => ({ ...current, full_name: event.target.value }))}
              placeholder="اسم الموظف"
            />
          </label>
          <label>
            <span>البريد الإلكتروني</span>
            <input
              required
              type="email"
              dir="ltr"
              value={draft.email}
              onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
              placeholder="employee@example.com"
            />
          </label>
          <button className="primary-button" type="submit">
            <UserPlus size={18} />
            إضافة موظف
          </button>
        </form>
      ) : null}

      <section className="employees-list">
        {employees.map((employee) => (
          <article className="employee-card" key={employee.id}>
            <div className="employee-head">
              <div>
                <input
                  className="employee-name-input"
                  value={employee.full_name}
                  onChange={(event) =>
                    setEmployees((current) =>
                      current.map((item) =>
                        item.id === employee.id ? { ...item, full_name: event.target.value } : item
                      )
                    )
                  }
                />
                <span dir="ltr">{employee.email}</span>
              </div>
              <strong className={employee.role === "admin" ? "role-admin" : ""}>
                {employee.role === "admin" ? "Admin" : "Employee"}
              </strong>
            </div>

            <div className="permissions-grid">
              {permissionKeys.map((key) => (
                <label className="toggle-row" key={key}>
                  <span>{permissionLabels[key]}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(employee[key])}
                    disabled={isAdminEmail(employee.email)}
                    onChange={(event) => updatePermission(employee.id, key, event.target.checked)}
                  />
                </label>
              ))}
            </div>

            <div className="card-actions">
              <button className="soft-button" type="button" onClick={() => saveEmployee(employee)} disabled={savingId === employee.id}>
                <Save size={16} />
                {savingId === employee.id ? "جاري الحفظ" : "حفظ"}
              </button>
              <button className="soft-button danger" type="button" onClick={() => deleteEmployee(employee)}>
                <Trash2 size={16} />
                حذف
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
