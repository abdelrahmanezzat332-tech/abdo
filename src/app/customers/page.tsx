import { AppShell } from "@/components/app-shell";
import { CustomersView } from "@/components/customers-view";
import { PageHeading } from "@/components/page-heading";
import { RequireAuth } from "@/components/require-auth";

export default function CustomersPage() {
  return (
    <RequireAuth>
      <AppShell>
        <PageHeading
          eyebrow="إدارة العملاء"
          title="العملاء"
          description="سجل طلبات العملاء حسب المدينة والميزانية والملاحظات، مع إخفاء رقم الموبايل حسب الصلاحيات."
        />
        <CustomersView />
      </AppShell>
    </RequireAuth>
  );
}
