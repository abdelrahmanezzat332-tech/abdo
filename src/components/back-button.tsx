"use client";

import { ArrowRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { getBackDestination } from "@/lib/back-navigation";

export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goBack() {
    const destination = getBackDestination(pathname, searchParams);
    router.push(destination);
  }

  return (
    <button className="soft-button page-back-button" type="button" onClick={goBack}>
      <ArrowRight size={18} />
      رجوع
    </button>
  );
}
