import type { Metadata } from "next";
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
  title: {
    default: "SplitSukan",
    template: "%s | SplitSukan",
  },
  description:
    "An organizer-first PWA for splitting sports session expenses fairly.",
  applicationName: "SplitSukan",
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
