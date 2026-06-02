import { AppShell } from "@/components/app-shell";
import { CustomerForm } from "@/components/customer-form";
import { PageHeading } from "@/components/page-heading";
import { RequireAuth } from "@/components/require-auth";

export default function NewCustomerPage() {
  return (
    <RequireAuth>
      <AppShell>
        <PageHeading
          eyebrow="إضافة عميل"
          title="عميل جديد"
          description="أضف طلب العميل ورقم الموبايل والمدينة والميزانية. اسم العميل اختياري ويمكن تركه فارغًا."
        />
        <CustomerForm />
      </AppShell>
    </RequireAuth>
  );
}
