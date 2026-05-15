"use client";

import { Building2, Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { LoadingScreen } from "@/components/loading-screen";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";

export default function LoginPage() {
  const { signIn, signUp, user, loading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });

  useEffect(() => {
    if (user) router.replace("/choose-operation");
  }, [router, user]);

  if (loading) return <LoadingScreen />;
  if (user) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);

    try {
      if (mode === "register") {
        await signUp(form.fullName, form.email, form.password);
        showToast("تم إنشاء الحساب بنجاح. إذا كان تأكيد البريد مفعّلًا، افتح بريدك أولًا.", "success");
      } else {
        await signIn(form.email, form.password);
        showToast("تم تسجيل الدخول بنجاح", "success");
      }
      router.push("/choose-operation");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "تعذر تنفيذ العملية", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <div className="brand-xl">
          <span>ك</span>
          <div>
            <strong>الكيان</strong>
            <small>منصة داخلية للتسويق العقاري</small>
          </div>
        </div>
        <h1>إدارة الوحدات، الموظفين، والصلاحيات من مكان واحد.</h1>
        <p>
          تجربة عربية كاملة تدعم RTL، مصممة لفِرق التسويق العقاري التي تحتاج سرعة في الوصول للبيانات ودقة في
          الصلاحيات.
        </p>
        <div className="auth-metrics">
          <span>بيع</span>
          <span>إيجار</span>
          <span>صلاحيات بالإيميل</span>
        </div>
      </section>

      <section className="auth-card">
        <div className="auth-card-head">
          <Building2 size={28} />
          <div>
            <h2>{mode === "login" ? "تسجيل الدخول" : "إنشاء حساب موظف"}</h2>
            <p>{mode === "login" ? "ادخل ببياناتك للوصول للنظام" : "سيتم حفظ بياناتك داخل قاعدة البيانات"}</p>
          </div>
        </div>

        <div className="segmented">
          <button className={mode === "login" ? "active" : ""} type="button" onClick={() => setMode("login")}>
            تسجيل الدخول
          </button>
          <button className={mode === "register" ? "active" : ""} type="button" onClick={() => setMode("register")}>
            حساب جديد
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "register" ? (
            <label>
              <span>الاسم</span>
              <input
                required
                value={form.fullName}
                onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                placeholder="اسم الموظف"
              />
            </label>
          ) : null}

          <label>
            <span>البريد الإلكتروني</span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="name@example.com"
              dir="ltr"
            />
          </label>

          <label>
            <span>كلمة المرور</span>
            <div className="password-field">
              <input
                required
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="••••••••"
                dir="ltr"
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="إظهار كلمة المرور">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <button className="primary-button wide" type="submit" disabled={busy}>
            {mode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}
            {busy ? "جاري التنفيذ..." : mode === "login" ? "دخول" : "تسجيل"}
          </button>
        </form>
      </section>
    </main>
  );
}
