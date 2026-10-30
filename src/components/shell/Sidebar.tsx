"use client";

// The left sidebar on wide screens, which folds down to its icons, and a top bar with a drawer on phones.
// The active entry needs the pathname, which is runtime data on /lessons/[id]: it is read inside a
// Suspense boundary. The folded state lives on <html data-sidebar>, set before the first paint by the
// layout's script, so the CSS (the `collapsed:` variant) lays it out without waiting for React.

import { Camera, Clapperboard, Github, HeartHandshake, House, Menu, PanelLeftClose, PanelLeftOpen, Workflow, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState, useSyncExternalStore } from "react";
import { activeHref, type NavHref } from "@/lib/nav";
import { Logo, LogoMark } from "./Logo";
import { REPO_URL, TopActions } from "./TopActions";

const SIDEBAR_KEY = "lessoncast:sidebar";
const SIDEBAR_EVENT = "lessoncast:sidebar";

const subscribe = (onChange: () => void) => {
  window.addEventListener(SIDEBAR_EVENT, onChange);
  return () => window.removeEventListener(SIDEBAR_EVENT, onChange);
};
const isCollapsed = () => document.documentElement.dataset.sidebar === "collapsed";

function useCollapsed(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(subscribe, isCollapsed, () => false);
  const toggle = () => {
    const next = !isCollapsed();
    if (next) document.documentElement.dataset.sidebar = "collapsed";
    else delete document.documentElement.dataset.sidebar;
    try {
      localStorage.setItem(SIDEBAR_KEY, next ? "collapsed" : "open");
    } catch {
      // Not remembered: the sidebar still folds for this visit.
    }
    window.dispatchEvent(new Event(SIDEBAR_EVENT));
  };
  return [collapsed, toggle];
}

const LESSONS = [
  { href: "/", label: "Home", icon: House },
  { href: "/create", label: "Create a lesson", icon: Camera },
  { href: "/lessons", label: "Lessons", icon: Clapperboard },
] as const;

const ABOUT = [
  { href: "/how-it-works", label: "How it works", icon: Workflow },
  { href: "/why", label: "Why LessonCast", icon: HeartHandshake },
] as const;

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
              title={label}
              aria-current={current ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-bold transition-colors collapsed:lg:justify-center ${
                current ? "bg-panel text-chalk" : "text-dust hover:bg-panel/60 hover:text-chalk"
              }`}
            >
              <Icon aria-hidden className={`size-5 shrink-0 ${current ? "text-spoken" : ""}`} strokeWidth={2.2} />
              <span className="collapsed:lg:sr-only">{label}</span>
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
        <p className="px-3 pb-2 text-sm font-bold text-dust/70 collapsed:lg:sr-only">About</p>
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
    <div className="space-y-3 border-t border-line px-3 pt-4 text-sm text-dust collapsed:lg:px-0 collapsed:lg:text-center">
      <p className="collapsed:lg:hidden">Built at the Meta Global AI Developer Hackathon, October 2026.</p>
      <a href={REPO_URL} title="Source code" className="inline-flex items-center gap-2 font-bold hover:text-chalk">
        <Github aria-hidden className="size-4" />
        <span className="collapsed:lg:sr-only">Source code</span>
      </a>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const [collapsed, toggle] = useCollapsed();
  const close = () => setOpen(false);
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between border-r border-line bg-board px-3 py-5 transition-[width] duration-200 lg:flex collapsed:w-[4.5rem] collapsed:px-2">
        <div className="space-y-8">
          <div className="flex items-center justify-between gap-2 px-3 collapsed:flex-col collapsed:px-0">
            <Link href="/" title="LessonCast home">
              <span className="collapsed:hidden">
                <Logo />
              </span>
              <span className="hidden collapsed:block">
                <LogoMark />
              </span>
            </Link>
            <button
              type="button"
              onClick={toggle}
              aria-label={collapsed ? "Open the sidebar" : "Fold the sidebar"}
              aria-expanded={!collapsed}
              title={collapsed ? "Open the sidebar" : "Fold the sidebar"}
              className="grid size-9 place-items-center rounded-lg text-dust hover:bg-panel hover:text-chalk"
            >
              <ToggleIcon aria-hidden className="size-5" />
            </button>
          </div>
          <SidebarNav />
        </div>
        <SidebarFooter />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-board/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <TopActions />
          <button type="button" onClick={() => setOpen(true)} aria-label="Open the menu" className="rounded-lg p-2 hover:bg-panel">
            <Menu aria-hidden className="size-6" />
          </button>
        </div>
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
