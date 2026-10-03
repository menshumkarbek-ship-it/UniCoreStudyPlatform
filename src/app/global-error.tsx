"use client";

import { useEffect } from "react";

// Last resort when the root layout itself fails. It replaces the whole document, so it cannot use the app's
// styles, fonts, or translations: plain inline styles, the three interface languages, and the OS colour scheme.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", background: "Canvas", color: "CanvasText", colorScheme: "light dark" }}>
        <title>UniCore</title>
        <main style={{ maxWidth: 480, padding: 24 }}>
          <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ margin: "0 0 4px", opacity: 0.75 }}>Что-то пошло не так · Бир нерсе туура эмес болуп калды</p>
          <p style={{ margin: "16px 0 24px", opacity: 0.75 }}>Please try again in a moment.</p>
          <button type="button" onClick={retry} style={{ padding: "10px 20px", borderRadius: 8, border: "1.5px solid #6d28d2", background: "transparent", color: "#6d28d2", font: "inherit", cursor: "pointer" }}>Try again · Повторить · Кайталоо</button>
          {error.digest && <p style={{ marginTop: 20, fontSize: 12, opacity: 0.6 }}>Reference: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
