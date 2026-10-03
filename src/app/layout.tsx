import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { defaultLocale, isLocale, localeCookieName } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { LocaleProvider } from "@/i18n/locale-provider";
import "./globals.css";

// Inter stands in for Udemy Sans; JetBrains Mono is kept only for the attendance code. Both cover Cyrillic.
const sans = Inter({
  variable: "--font-sans-family",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "700"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono-family",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: { default: "UniCore", template: "%s · UniCore" },
  description: "Study platform for universities: subjects, timetables, homework, exams, attendance, and grades in one place.",
};

// Lets the page fill the whole phone screen (behind the notch); the bars add safe-area padding themselves.
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

// Applies the saved theme before first paint so dark mode does not flash light.
const themeScript = `try{if(localStorage.getItem("unicore-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(localeCookieName)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  const dict = await getDictionary(locale);

  return (
    <html lang={locale} className={`${sans.variable} ${mono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <LocaleProvider locale={locale} dict={dict}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
