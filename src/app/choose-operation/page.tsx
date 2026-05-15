"use client";

import { ArrowLeftRight, BadgeDollarSign, Building } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { RequireAuth } from "@/components/require-auth";

export default function ChooseOperationPage() {
  return (
    <RequireAuth>
      <AppShell>
        <PageHeading
          eyebrow="ابدأ من هنا"
          title="اختر نوع العملية"
          description="حدد ما إذا كانت الوحدة للبيع أو للإيجار، ثم اختر المدينة المناسبة."
        />

        <section className="choice-grid">
          <Link className="choice-card gold-choice" href="/cities?operation=sell">
            <BadgeDollarSign size={44} />
            <span>بيع</span>
            <small>عرض وحدات البيع وإدارتها</small>
          </Link>
          <Link className="choice-card blue-choice" href="/cities?operation=rent">
            <ArrowLeftRight size={44} />
            <span>إيجار</span>
            <small>متابعة وحدات الإيجار وإدارتها</small>
          </Link>
          <div className="system-note">
            <Building size={22} />
            <p>كل البيانات مرتبطة بصلاحيات المستخدم الحالية ويتم عرض أزرار التعديل والحذف حسب الإيميل.</p>
          </div>
        </section>
      </AppShell>
    </RequireAuth>
  );
}
