import type { Metadata, Viewport } from "next";
import { Noto_Sans, Nunito } from "next/font/google";
import { Sidebar } from "@/components/shell/Sidebar";
import "./globals.css";

// The videos use Nunito too. latin-ext carries "œ" (cœur, sœur).
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin", "latin-ext"], weight: ["400", "700", "800"] });
// Nunito has no ɓ ɗ ƙ ƴ ɛ ɔ (Hausa, Fulfulde, Fon, Yoruba): Noto Sans draws those letters.
const notoSans = Noto_Sans({ variable: "--font-noto-sans", subsets: ["latin-ext"], weight: ["400", "700", "800"] });

export const metadata: Metadata = {
  title: "LessonCast",
  description: "A textbook page or a whole ebook becomes short illustrated video lessons, narrated in French, English or a home language such as Pidgin, Hausa or Fulfulde.",
};

export const viewport: Viewport = { themeColor: "#141b18" };

// Folds the sidebar before the first paint when the teacher folded it last time, so it never jumps.
const SIDEBAR_SCRIPT = `try{if(localStorage.getItem("lessoncast:sidebar")==="collapsed")document.documentElement.dataset.sidebar="collapsed"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} ${notoSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SIDEBAR_SCRIPT }} />
      </head>
      <body className="min-h-full font-sans">
        <Sidebar />
        <div className="shell-content">{children}</div>
      </body>
    </html>
  );
}
