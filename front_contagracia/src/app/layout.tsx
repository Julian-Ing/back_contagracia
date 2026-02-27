import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/shared/providers/ThemeProvider";
import { Toaster } from "react-hot-toast";
import { TrackingScripts } from "@/shared/components/TrackingScripts";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const ADMIN_API_URL = (
  process.env.NEXT_PUBLIC_ADMIN_SERVICE_URL || "http://localhost:3002/api"
);

const ADMIN_BASE_URL = ADMIN_API_URL.replace(/\/api$/, "");

const MEDIA_BASE_URL = (
  process.env.NEXT_PUBLIC_MEDIA_SERVICE_URL || "http://localhost:3018/api"
).replace(/\/api$/, "");

function resolveAssetUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/api/media/")) return `${MEDIA_BASE_URL}${path}`;
  return `${ADMIN_BASE_URL}${path}`;
}

const DEFAULT_TITLE = "Contagracia - Software Contable para MiPymes";
const DEFAULT_DESCRIPTION =
  "Software contable especializado para MiPymes con gestión inteligente de inventario. Automatiza tu contabilidad y toma el control total de tu negocio.";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const res = await fetch(`${ADMIN_API_URL}/site-settings/metadata`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) throw new Error("API error");

    const data: Record<string, string | null> = await res.json();

    const faviconUrl = resolveAssetUrl(data.favicon_url);
    const ogImageUrl = resolveAssetUrl(data.og_image_url);

    return {
      title: data.site_title || DEFAULT_TITLE,
      description: data.site_description || DEFAULT_DESCRIPTION,
      keywords: data.site_keywords || undefined,
      openGraph: ogImageUrl ? { images: [ogImageUrl] } : undefined,
      icons: { icon: faviconUrl || "/favicon-default.ico" },
    };
  } catch {
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
    };
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased overflow-x-hidden`}
      >
        <ThemeProvider defaultTheme="system" storageKey="contagracia-theme">
          {children}
          <Toaster position="bottom-right" />
        </ThemeProvider>
        <TrackingScripts />
      </body>
    </html>
  );
}
