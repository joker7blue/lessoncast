// What LessonCast runs on, under the hero: Meta's Muse models and Modal first, then the tools it is built
// with. Each logo is two layers of the same size in public/logos/: its icon in its own colours
// (<name>-icon.png), over its wordmark, a white silhouette drawn through a CSS mask in the text colour so it
// follows the theme (<name>.png).

import Image from "next/image";

type Brand = { name: string; slug: string; href: string; ratio: number; height: number };

// `ratio` is each logo's width over its height; `height` evens out their visual weight.
const POWERED_BY: Brand[] = [
  { name: "Muse, by Meta", slug: "muse", href: "https://dev.meta.ai/docs/overview", ratio: 0.74, height: 64 },
  { name: "Modal", slug: "modal", href: "https://modal.com", ratio: 5.32, height: 32 },
];

const BUILT_WITH: Brand[] = [
  { name: "Trigger.dev", slug: "trigger-dev", href: "https://trigger.dev", ratio: 5.88, height: 20 },
  { name: "Supabase", slug: "supabase", href: "https://supabase.com", ratio: 4.66, height: 22 },
  { name: "Remotion", slug: "remotion", href: "https://www.remotion.dev", ratio: 6.85, height: 19 },
];

function BrandLogo({ brand, className }: { brand: Brand; className: string }) {
  const width = Math.round(brand.height * brand.ratio);
  const mask = `url(/logos/${brand.slug}.png) center / contain no-repeat`;
  return (
    <a
      href={brand.href}
      target="_blank"
      rel="noopener"
      title={brand.name}
      aria-label={brand.name}
      className={`relative block transition-colors ${className}`}
      style={{ width, height: brand.height }}
    >
      <span aria-hidden className="absolute inset-0 bg-current" style={{ mask, WebkitMask: mask }} />
      <Image src={`/logos/${brand.slug}-icon.png`} alt="" fill sizes={`${width}px`} className="object-contain" />
    </a>
  );
}

export function PoweredBy() {
  return (
    <section aria-label="What LessonCast runs on" className="flex flex-col gap-8 border-t border-line py-10 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-x-10 gap-y-5">
        <p className="text-sm font-bold text-dust">Powered by</p>
        {POWERED_BY.map((brand) => (
          <BrandLogo key={brand.slug} brand={brand} className="text-chalk hover:text-spoken" />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <p className="text-sm font-bold text-dust">Built with</p>
        {BUILT_WITH.map((brand) => (
          <BrandLogo key={brand.slug} brand={brand} className="text-dust hover:text-chalk" />
        ))}
      </div>
    </section>
  );
}
