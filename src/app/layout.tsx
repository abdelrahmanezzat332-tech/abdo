import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "الكيان | نظام التسويق العقاري",
  description: "نظام داخلي لإدارة وتسويق الوحدات العقارية"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
