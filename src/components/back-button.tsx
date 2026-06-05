"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/choose-operation");
  }

  return (
    <button className="soft-button page-back-button" type="button" onClick={goBack}>
      <ArrowRight size={18} />
      رجوع
    </button>
  );
}

