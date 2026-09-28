import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quest Log — Your everyday adventure",
  description: "A personal quest journal. Organize your goals, celebrate progress, and keep your adventures in your browser.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to quest log</a>{children}</body></html>;
}
