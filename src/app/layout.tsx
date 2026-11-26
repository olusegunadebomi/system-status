import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { StatusFooter } from "@/features/system-status/components/status-footer";
import { StatusHeader } from "@/features/system-status/components/status-header";
import { publicEnv } from "@/features/system-status/lib/public-env";
import { Providers } from "./providers";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

const description =
  "Live status of Golvia: the web app, API, messaging, live streaming, wallet, marketplace and mobile apps. See current incidents, scheduled maintenance and 90-day uptime.";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: { default: "System Status | Golvia", template: "%s | Golvia Status" },
  description,
  applicationName: "Golvia Status",
  icons: { icon: "/logo/favicon.svg" },
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": [{ url: "/feed.xml", title: "Golvia status incidents" }] },
  },
  openGraph: {
    type: "website",
    siteName: "Golvia Status",
    title: "System Status | Golvia",
    description,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: "System Status | Golvia", description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    // Matches the navy header so the mobile browser bar blends in.
    { media: "(prefers-color-scheme: light)", color: "#0f1b46" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1b46" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col overflow-x-clip bg-grouped font-sans text-foreground">
        <a
          href="#main"
          className="sr-only z-50 rounded-lg bg-primary-500 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <Providers>
          <StatusHeader />
          <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-10">
            {children}
          </main>
          <StatusFooter />
        </Providers>
      </body>
    </html>
  );
}
