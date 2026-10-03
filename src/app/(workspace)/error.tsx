"use client";

import { useEffect } from "react";
import ErrorPanel from "@/components/ErrorPanel";

// Errors inside a student/professor page: the header and sidebar stay, only the content area shows the error.
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <ErrorPanel error={error} retry={retry} />;
}
