"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Reloads the server-rendered results every few seconds while the background jobs run.
export function KeepFresh({ every = 3000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), every);
    return () => clearInterval(id);
  }, [router, every]);
  return null;
}
