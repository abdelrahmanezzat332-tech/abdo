import { AppShell } from "@/components/app-shell";
import { EmployeeManagement } from "@/components/employee-management";
import { PageHeading } from "@/components/page-heading";
import { RequireAuth } from "@/components/require-auth";

export default function EmployeesPage() {
  return (
    <RequireAuth adminOnly>
      <AppShell>
        <PageHeading
          eyebrow="الموظفون"
          title="إدارة الموظفين"
          description="أضف الموظفين وحدد صلاحياتهم حسب البريد الإلكتروني."
        />
        <EmployeeManagement mode="employees" />
      </AppShell>
    </RequireAuth>
  );
}
