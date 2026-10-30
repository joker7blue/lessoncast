import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// The pages a visitor starts from; lessons and books are reached from them.
const PAGES = ["", "/create", "/lessons", "/how-it-works", "/why"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "weekly", priority: path === "" ? 1 : 0.7 }));
}
