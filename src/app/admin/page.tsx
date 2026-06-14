import { AdminDashboard } from "@/components/admin-dashboard";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { RequireAuth } from "@/components/require-auth";

export default function AdminPage() {
  return (
    <RequireAuth adminOnly>
      <AppShell>
        <PageHeading
          eyebrow="لوحة التحكم"
          title="إدارة النظام بالكامل"
          description="نظرة شاملة على الوحدات والموظفين وعمليات البيع والإيجار."
        />
        <AdminDashboard />
      </AppShell>
    </RequireAuth>
  );
}
