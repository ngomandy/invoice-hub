import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Invoice Reconciliation Hub",
  description: "Track, lock, and reconcile client revenue closes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans bg-surface-muted text-text-primary antialiased`}>
        {children}
      </body>
    </html>
  );
}
