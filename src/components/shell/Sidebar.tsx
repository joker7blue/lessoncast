"use client";

// The left sidebar on wide screens, a top bar with a drawer on phones. The active entry needs the
// pathname, which is runtime data on /lessons/[id]: it is read inside a Suspense boundary.

import { Camera, Clapperboard, Github, HeartHandshake, House, Menu, Workflow, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { activeHref, type NavHref } from "@/lib/nav";
import { Logo } from "./Logo";

const LESSONS = [
  { href: "/", label: "Home", icon: House },
  { href: "/create", label: "Create a lesson", icon: Camera },
  { href: "/lessons", label: "My lessons", icon: Clapperboard },
] as const;

const ABOUT = [
  { href: "/how-it-works", label: "How it works", icon: Workflow },
  { href: "/why", label: "Why LessonCast", icon: HeartHandshake },
] as const;

const REPO_URL = "https://github.com/joker7blue/lessoncast";

type Item = { href: NavHref; label: string; icon: typeof House };

function NavList({ items, active, onNavigate }: { items: readonly Item[]; active: NavHref | null; onNavigate?: () => void }) {
  return (
    <ul className="space-y-1">
      {items.map(({ href, label, icon: Icon }) => {
        const current = href === active;
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={current ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-bold transition-colors ${
                current ? "bg-panel text-chalk" : "text-dust hover:bg-panel/60 hover:text-chalk"
              }`}
            >
              <Icon aria-hidden className={`size-5 ${current ? "text-spoken" : ""}`} strokeWidth={2.2} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Nav({ active, onNavigate }: { active: NavHref | null; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="space-y-6">
      <NavList items={LESSONS} active={active} onNavigate={onNavigate} />
      <div>
        <p className="px-3 pb-2 text-sm font-bold text-dust/70">About</p>
        <NavList items={ABOUT} active={active} onNavigate={onNavigate} />
      </div>
    </nav>
  );
}

function ActiveNav({ onNavigate }: { onNavigate?: () => void }) {
  return <Nav active={activeHref(usePathname())} onNavigate={onNavigate} />;
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Suspense fallback={<Nav active={null} />}>
      <ActiveNav onNavigate={onNavigate} />
    </Suspense>
  );
}

function SidebarFooter() {
  return (
    <div className="space-y-3 border-t border-line px-3 pt-4 text-sm text-dust">
      <p>Built at the Meta Global AI Developer Hackathon, October 2026.</p>
      <a href={REPO_URL} className="inline-flex items-center gap-2 font-bold hover:text-chalk">
        <Github aria-hidden className="size-4" />
        Source code
      </a>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between border-r border-line bg-board px-3 py-5 lg:flex">
        <div className="space-y-8">
          <Link href="/" className="block px-3">
            <Logo />
          </Link>
          <SidebarNav />
        </div>
        <SidebarFooter />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-board/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/">
          <Logo />
        </Link>
        <button type="button" onClick={() => setOpen(true)} aria-label="Open the menu" className="rounded-lg p-2 hover:bg-panel">
          <Menu aria-hidden className="size-6" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close the menu" onClick={close} className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col justify-between bg-board px-3 py-4 shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between px-3">
                <Logo />
                <button type="button" onClick={close} aria-label="Close the menu" className="rounded-lg p-2 hover:bg-panel">
                  <X aria-hidden className="size-6" />
                </button>
              </div>
              <SidebarNav onNavigate={close} />
            </div>
            <SidebarFooter />
          </div>
        </div>
      )}
    </>
  );
}
