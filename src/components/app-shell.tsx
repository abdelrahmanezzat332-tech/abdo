"use client";

import {
  Archive,
  Building2,
  ChevronRight,
  DatabaseBackup,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
  Users,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { BackButton } from "@/components/back-button";
import { useAuth } from "@/context/auth-context";

const navItems = [
  { href: "/choose-operation",     label: "الرئيسية",       icon: Home },
  { href: "/properties",           label: "الوحدات الرئيسية", icon: Building2 },
  { href: "/partial-units",        label: "وحدات جزئية",    icon: Building2 },
  { href: "/archive",              label: "أرشيف الوحدات",  icon: Archive },
  { href: "/customers",            label: "العملاء",        icon: UserRound },
  { href: "/customers/archive",    label: "أرشيف العملاء",  icon: Archive },
  { href: "/admin",                label: "لوحة الأدمن",    icon: LayoutDashboard, admin: true },
  { href: "/admin/employees",      label: "الموظفون",       icon: Users,           admin: true },
  { href: "/admin/permissions",    label: "الصلاحيات",      icon: ShieldCheck,     admin: true },
  { href: "/admin/backup",         label: "نسخ احتياطي",    icon: DatabaseBackup,  admin: true }
];

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  const visibleItems = navItems.filter((item) => !item.admin || profile?.role === "admin");

  return (
    <div className="app-shell">
      <button className="mobile-menu" type="button" onClick={() => setOpen(true)} aria-label="فتح القائمة">
        <Menu size={22} />
      </button>

      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <Link className="brand" href="/choose-operation">
            <span className="brand-mark">ك</span>
            <span>
              <strong>الكيان</strong>
              <small>تسويق عقاري</small>
            </span>
          </Link>
          <button className="sidebar-close" type="button" onClick={() => setOpen(false)} aria-label="إغلاق القائمة">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/choose-operation" && pathname.startsWith(item.href));
            return (
              <Link className={`nav-link ${active ? "active" : ""}`} href={item.href} key={item.href} onClick={() => setOpen(false)}>
                <Icon size={19} />
                <span>{item.label}</span>
                <ChevronRight size={16} className="nav-chevron" />
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-user">
          <div>
            <strong>{profile?.full_name ?? "مستخدم"}</strong>
            <small>{profile?.role === "admin" ? "مدير النظام" : "موظف"}</small>
          </div>
          <button className="icon-button danger" type="button" onClick={signOut} aria-label="تسجيل الخروج" title="تسجيل الخروج">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {open ? <button className="sidebar-backdrop" aria-label="إغلاق القائمة" onClick={() => setOpen(false)} /> : null}

      <main className="main-content">
        <BackButton />
        {children}
      </main>
    </div>
  );
}
