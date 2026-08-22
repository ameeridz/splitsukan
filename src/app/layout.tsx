import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ApplicationStoreHydration } from "../components/providers/application-store-hydration";
import { ThemeProvider } from "../components/providers/theme-provider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://splitsukan.ridzu.one"),
  title: {
    default: "SplitSukan",
    template: "%s | SplitSukan",
  },
  description:
    "An organizer-first PWA for splitting sports session expenses fairly.",
  applicationName: "SplitSukan",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SplitSukan",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: "#f7faf8",
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: "#0b1f1a",
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ApplicationStoreHydration />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
