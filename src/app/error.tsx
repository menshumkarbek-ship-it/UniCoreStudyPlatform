"use client";

import { useEffect } from "react";
import ErrorPanel from "@/components/ErrorPanel";

// Catches errors anywhere below the root layout, including a signed-in layout that cannot reach the database.
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <ErrorPanel error={error} retry={retry} fullPage />;
}
