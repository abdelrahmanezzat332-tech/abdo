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
          <Link className="choice-card gold-choice choice-card-with-bg" href="/cities?operation=sell">
            <div className="choice-card-image-wrapper">
              <img
                src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80"
                alt="بيع"
                className="choice-card-img"
              />
              <div className="choice-card-overlay" />
            </div>
            <div className="choice-card-content">
              <BadgeDollarSign size={38} className="choice-icon" />
              <span>بيع</span>
              <small>عرض وحدات البيع وإدارتها</small>
            </div>
          </Link>
          <Link className="choice-card blue-choice choice-card-with-bg" href="/cities?operation=rent">
            <div className="choice-card-image-wrapper">
              <img
                src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80"
                alt="إيجار"
                className="choice-card-img"
              />
              <div className="choice-card-overlay" />
            </div>
            <div className="choice-card-content">
              <ArrowLeftRight size={38} className="choice-icon" />
              <span>إيجار</span>
              <small>متابعة وحدات الإيجار وإدارتها</small>
            </div>
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
