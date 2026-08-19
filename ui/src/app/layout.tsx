import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";

import AppLayout from "@/components/layout/AppLayout";
import PostHogIdentify from "@/components/PostHogIdentify";
import { SentryErrorBoundary } from "@/components/SentryErrorBoundary";
import SpinLoader from "@/components/SpinLoader";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { AppConfigProvider } from "@/context/AppConfigContext";
import { OnboardingProvider } from "@/context/OnboardingContext";
import { OrgConfigProvider } from "@/context/OrgConfigContext";
import { TelephonyConfigWarningsProvider } from "@/context/TelephonyConfigWarningsContext";
import { AuthProvider } from "@/lib/auth";
import { BRAND } from "@/lib/brand";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#090d16" },
  ],
};

export const metadata: Metadata = {
  title: BRAND.name,
  description: BRAND.tagline,
  icons: {
    icon: BRAND.logoUrl || "/icon.svg",
    shortcut: BRAND.logoUrl || "/icon.svg",
    apple: BRAND.logoUrl || "/icon.svg",
  },
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {

  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Inline script to apply persisted theme (light by default) - runs before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${inter.className} ${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <SentryErrorBoundary>
            <AuthProvider>
              <AppConfigProvider>
                <Suspense fallback={<SpinLoader />}>
                  <OrgConfigProvider>
                    <TelephonyConfigWarningsProvider>
                      <OnboardingProvider>
                        <PostHogIdentify />
                        <AppLayout>
                          {children}
                        </AppLayout>
                        <Toaster />
                      </OnboardingProvider>
                    </TelephonyConfigWarningsProvider>
                  </OrgConfigProvider>
                </Suspense>
              </AppConfigProvider>
            </AuthProvider>
          </SentryErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
