import type { Metadata, Viewport } from "next";
import { Noto_Sans, Nunito } from "next/font/google";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopActions } from "@/components/shell/TopActions";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/seo";
import "./globals.css";

// The videos use Nunito too. latin-ext carries "œ" (cœur, sœur) and "ṣ"; vietnamese the "ẹ ọ" and tone
// marks of Yoruba and Fon.
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin", "latin-ext", "vietnamese"], weight: ["400", "700", "800"] });
// Nunito has no ɓ ɗ ƙ ƴ ɛ ɔ (Hausa, Fulfulde, Fon, Yoruba): Noto Sans draws those letters, with their tone marks.
const notoSans = Noto_Sans({ variable: "--font-noto-sans", subsets: ["latin-ext", "vietnamese"], weight: ["400", "700", "800"] });

// Every page's title reads "<page> · LessonCast"; each page sets its description and sharing card (lib/seo.ts).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: "%s · LessonCast" },
  description: SITE_DESCRIPTION,
  applicationName: "LessonCast",
  keywords: ["LessonCast", "video lessons", "textbook", "mother tongue", "African languages", "Hausa", "Fulfulde", "Pidgin", "Yoruba", "Swahili", "Muse Spark", "Meta", "education"],
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
