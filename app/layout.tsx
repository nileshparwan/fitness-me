import type { Metadata } from "next";
import Providers from "./providers";
import { Toaster } from "sonner";
import { DM_Sans, Syne } from "next/font/google";
import { SwRegister } from "@/components/layout/sw-register";

import "@/utils/env"

import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-ui",
  weight: ["400", "500", "600", "700"],
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-headline",
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "FitTrack",
  description: "Performance and nutrition workspace",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${dmSans.variable} ${syne.variable} dark`}
    >
      <body className="antialiased">
        <SwRegister />
        <Providers>
          {children}
          <Toaster richColors theme="dark" />
        </Providers>
      </body>
    </html>
  );
}
