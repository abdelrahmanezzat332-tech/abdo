import { AdminShares } from "@/components/admin-shares";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { RequireAuth } from "@/components/require-auth";

export default function AdminSharesPage() {
  return (
    <RequireAuth adminOnly>
      <AppShell>
        <PageHeading
          eyebrow="لوحة التحكم"
          title="إدارة روابط المشاركة العامة"
          description="توليد روابط مشاركة ديناميكية تعرض الوحدات تلقائياً للعملاء بدون تسجيل دخول، مع إمكانية تحديد البيانات المتاحة للعرض."
        />
        <AdminShares />
      </AppShell>
    </RequireAuth>
  );
}
