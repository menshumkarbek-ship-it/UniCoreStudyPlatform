"use client";

import { useCallback, useEffect, useState } from "react";
import { activeIntlLocale } from "@/lib/time";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** fetch() that returns parsed JSON or throws ApiError with the server's message. */
export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const response = await fetch(url, json === undefined ? rest : { ...rest, headers: { "Content-Type": "application/json", ...rest.headers }, body: JSON.stringify(json) });
  const body = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!response.ok) {
    // Session expired or revoked: send the user to sign in again, then back here.
    if (response.status === 401 && typeof window !== "undefined" && !window.location.pathname.endsWith("/login")) {
      window.location.assign(window.location.pathname.startsWith("/admin") ? "/admin/login" : `/login?next=${encodeURIComponent(window.location.pathname)}`);
    }
    throw new ApiError(response.status, body?.error ?? "Something went wrong. Please try again.");
  }
  return body as T;
}

/** Loads JSON when `url` changes; `reload()` fetches again after a change. Stale responses are ignored. */
export function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(url));
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!url) return;
    let current = true;
    api<T>(url).then(
      (result) => { if (current) { setData(result); setError(""); setLoading(false); } },
      (caught: unknown) => {
        if (!current) return;
        // A 401 is already being redirected to the sign-in page by api(); showing an error would only flash.
        if (caught instanceof ApiError && caught.status === 401) return;
        setError(caught instanceof Error ? caught.message : "Unable to load data.");
        setLoading(false);
      },
    );
    return () => { current = false; };
  }, [url, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  // A failed first load is a broken page, not an empty one: hand it to the nearest error boundary, which offers
  // "Try again" (and keeps the sidebar). Otherwise pages would wrongly say "No homework yet" during an outage.
  if (error && data === null) throw new ApiError(0, error);
  return { data, error, loading, reload, setData };
}

export function formatDate(value: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  return new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString(activeIntlLocale(), options);
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString(activeIntlLocale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
