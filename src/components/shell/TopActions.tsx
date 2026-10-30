"use client";

// The link to the code and the theme switch, at the top right of every page. The theme lives on
// <html data-theme>, set before the first paint by the layout's script, like the folded sidebar.

import { Github, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

export const REPO_URL = "https://github.com/joker7blue/lessoncast";

const THEME_KEY = "lessoncast:theme";
const THEME_EVENT = "lessoncast:theme";

const subscribe = (onChange: () => void) => {
  window.addEventListener(THEME_EVENT, onChange);
  return () => window.removeEventListener(THEME_EVENT, onChange);
};
const isLight = () => document.documentElement.dataset.theme === "light";

function useLightTheme(): [boolean, () => void] {
  const light = useSyncExternalStore(subscribe, isLight, () => false);
  const toggle = () => {
    const next = !isLight();
    if (next) document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem(THEME_KEY, next ? "light" : "dark");
    } catch {
      // Not remembered: the theme still changes for this visit.
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  };
  return [light, toggle];
}

const BUTTON = "grid size-9 place-items-center rounded-lg text-dust transition-colors hover:bg-panel hover:text-chalk";

export function TopActions() {
  const [light, toggle] = useLightTheme();
  const label = light ? "Switch to the dark theme" : "Switch to the light theme";
  const Icon = light ? Moon : Sun;
  return (
    <div className="flex items-center gap-1">
      <a href={REPO_URL} aria-label="The code on GitHub" title="The code on GitHub" className={BUTTON}>
        <Github aria-hidden className="size-5" />
      </a>
      <button type="button" onClick={toggle} aria-label={label} title={label} className={BUTTON}>
        <Icon aria-hidden className="size-5" />
      </button>
    </div>
  );
}
