import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { PropertyForm } from "@/components/property-form";
import { RequireAuth } from "@/components/require-auth";

export default function NewPropertyPage() {
  return (
    <RequireAuth>
      <AppShell>
        <PageHeading
          eyebrow="إضافة وحدة"
          title="وحدة عقارية جديدة"
          description="يمكن حفظ أكثر من وحدة بنفس رقم الموبايل، وستظهر كل وحدة ككارت منفصل مع ربط داخلي بينها."
        />
        <PropertyForm />
      </AppShell>
    </RequireAuth>
  );
}
