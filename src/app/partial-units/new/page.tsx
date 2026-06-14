import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { PropertyForm } from "@/components/property-form";
import { RequireAuth } from "@/components/require-auth";

export default function NewPartialUnitPage() {
  return (
    <RequireAuth>
      <AppShell>
        <PageHeading
          eyebrow="إضافة وحدة جزئية"
          title="وحدة جزئية جديدة"
          description="أدخل بيانات الوحدة وحدد المتاح: سرير أو غرفة أو نوع آخر."
        />
        <PropertyForm mode="partial" />
      </AppShell>
    </RequireAuth>
  );
}
