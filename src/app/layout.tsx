import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

// The videos use Nunito too. latin-ext carries "œ" (cœur, sœur).
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin", "latin-ext"], weight: ["400", "700", "800"] });

export const metadata: Metadata = {
  title: "LessonCast",
  description: "A textbook page becomes a short illustrated video lesson, narrated in French or Pidgin.",
};

export const viewport: Viewport = { themeColor: "#141b18" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
