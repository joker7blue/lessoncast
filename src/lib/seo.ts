// What search engines and link previews read: the site's address, its description, and the card shown when a
// link is shared (Open Graph, read by WhatsApp, Facebook and LinkedIn; X's card). Each page gets its own title,
// description and card; a lesson shows its own scene.

import type { Metadata } from "next";

export const SITE_URL = "https://lessoncast-ai.vercel.app";
export const SITE_TITLE = "LessonCast: video lessons in the language of home";
export const SITE_DESCRIPTION =
  "Upload a textbook as a PDF, or photograph a page, and get short narrated, illustrated video lessons in the language children speak at home: French, English, Pidgin, Hausa, Fulfulde, Yoruba, Fon or Swahili. Made with Meta's Muse Spark, Muse Image, SAM 3.1 and MMS, run on Modal.";

const SITE_CARD = { url: "/og.png", width: 1200, height: 630, alt: "LessonCast: a textbook becomes video lessons in the language of home" };

type PageSeo = {
  /** Shown as "<title> · LessonCast"; the site's own title when left out. */
  title?: string;
  /** A title shown as is, without " · LessonCast". */
  absoluteTitle?: string;
  description: string;
  /** The page's path, for its canonical address and its card's link. */
  path: string;
  /** The image of its card, in place of the site's. */
  image?: { url: string; alt: string };
};

export function pageMetadata({ title, absoluteTitle, description, path, image }: PageSeo): Metadata {
  const shown = absoluteTitle ?? (title ? `${title} · LessonCast` : SITE_TITLE);
  const images = [image ?? SITE_CARD];
  return {
    ...(absoluteTitle ? { title: { absolute: absoluteTitle } } : title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: "LessonCast", locale: "en", url: path, title: shown, description, images },
    twitter: { card: "summary_large_image", title: shown, description, images: images.map(({ url, alt }) => ({ url, alt })) },
  };
}
