import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "RepoPilot 2.0 — Codebase Intelligence Platform",
    template: "%s | RepoPilot 2.0",
  },
  description:
    "Understand any codebase. Find where to work. Make the change. Verify the result. RepoPilot is an AI-powered codebase intelligence platform powered by IBM Bob 2.0.",
  keywords: [
    "codebase intelligence",
    "developer productivity",
    "AI code assistant",
    "repository analysis",
    "IBM Bob 2.0",
    "architecture visualization",
  ],
  authors: [{ name: "RepoPilot Team" }],
  openGraph: {
    type: "website",
    title: "RepoPilot 2.0 — Codebase Intelligence Platform",
    description:
      "Understand any codebase. Find where to work. Make the change. Verify the result.",
    siteName: "RepoPilot 2.0",
  },
  twitter: {
    card: "summary_large_image",
    title: "RepoPilot 2.0",
    description: "AI-powered codebase intelligence & developer contribution platform.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
