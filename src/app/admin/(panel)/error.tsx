"use client";

import { useEffect } from "react";
import ErrorPanel from "@/components/ErrorPanel";

// Errors inside an admin page: the admin header stays, only the content area shows the error.
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <ErrorPanel error={error} retry={retry} />;
}
