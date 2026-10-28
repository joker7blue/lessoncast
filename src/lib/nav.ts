// The sidebar's entries, and which one the current page belongs to.

export const NAV_HREFS = ["/", "/create", "/lessons", "/how-it-works", "/why"] as const;
export type NavHref = (typeof NAV_HREFS)[number];

export function activeHref(pathname: string): NavHref | null {
  if (pathname === "/") return "/";
  return NAV_HREFS.find((href) => href !== "/" && (pathname === href || pathname.startsWith(`${href}/`))) ?? null;
}
