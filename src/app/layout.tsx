import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactElement, ReactNode } from "react";
import "./globals.css";

import { AppHeader } from "@/components/app-header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Feedback Triage",
  description: "Submit feedback, persist triage artifacts, inspect history.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): ReactElement {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
        <AppHeader />

        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
