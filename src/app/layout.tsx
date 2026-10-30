import type { Metadata, Viewport } from "next";
import { Noto_Sans, Nunito } from "next/font/google";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopActions } from "@/components/shell/TopActions";
import "./globals.css";

// The videos use Nunito too. latin-ext carries "œ" (cœur, sœur) and "ṣ"; vietnamese the "ẹ ọ" and tone
// marks of Yoruba and Fon.
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin", "latin-ext", "vietnamese"], weight: ["400", "700", "800"] });
// Nunito has no ɓ ɗ ƙ ƴ ɛ ɔ (Hausa, Fulfulde, Fon, Yoruba): Noto Sans draws those letters, with their tone marks.
const notoSans = Noto_Sans({ variable: "--font-noto-sans", subsets: ["latin-ext", "vietnamese"], weight: ["400", "700", "800"] });

export const metadata: Metadata = {
  title: "LessonCast",
  description: "A textbook page or a whole ebook becomes short illustrated video lessons, narrated in French, English or a home language such as Pidgin, Hausa or Fulfulde.",
};

export const viewport: Viewport = { themeColor: "#141b18" };

// Folds the sidebar and picks the theme before the first paint, as the device chose last time, so nothing jumps.
const SHELL_SCRIPT = `try{var s=localStorage,d=document.documentElement.dataset;if(s.getItem("lessoncast:sidebar")==="collapsed")d.sidebar="collapsed";if(s.getItem("lessoncast:theme")==="light")d.theme="light"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} ${notoSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SHELL_SCRIPT }} />
      </head>
      <body className="min-h-full font-sans">
        <Sidebar />
        <div className="shell-content">
          <div className="hidden justify-end px-8 pt-4 lg:flex">
            <TopActions />
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}
