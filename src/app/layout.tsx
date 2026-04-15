import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nudge — student networking, with intention",
  description:
    "Onboard, find the right people, and write outreach you'd actually send. Built for students.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="canvas min-h-screen antialiased">{children}</body>
    </html>
  );
}
