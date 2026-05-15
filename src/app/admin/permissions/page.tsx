import { AppShell } from "@/components/app-shell";
import { EmployeeManagement } from "@/components/employee-management";
import { PageHeading } from "@/components/page-heading";
import { RequireAuth } from "@/components/require-auth";

export default function PermissionsPage() {
  return (
    <RequireAuth adminOnly>
      <AppShell>
        <PageHeading
          eyebrow="الصلاحيات"
          title="إدارة الصلاحيات"
          description="فعّل أو أوقف صلاحيات كل موظف من خلال بريده الإلكتروني."
        />
        <EmployeeManagement mode="permissions" />
      </AppShell>
    </RequireAuth>
  );
}
