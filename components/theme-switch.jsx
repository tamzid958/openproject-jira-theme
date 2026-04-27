"use client";

import { useState } from "react";
import { useTheme, THEME_PREFS } from "@/components/theme-provider";
import { Icon } from "@/components/icons";

const LABELS = {
  system: "Match system",
  light: "Light",
  dark: "Dark",
  "hc-light": "High contrast (light)",
  "hc-dark": "High contrast (dark)",
};

const ICONS = {
  system: "monitor",
  light: "sun",
  dark: "moon",
  "hc-light": "contrast",
  "hc-dark": "contrast",
};

// Compact dropdown trigger used in the topbar. Shows a sun/moon icon
// reflecting the *resolved* theme (so users see what's actually applied,
// not what's stored as preference) and a small disclosure menu for
// switching.
export function ThemeSwitch() {
  const { preference, resolved, setPreference } = useTheme();
  const [open, setOpen] = useState(false);

  // Pick which icon glyph to show on the trigger. We avoid the full
  // `monitor` glyph to keep the chrome lean — fall back to sun/moon
  // based on resolved theme.
  const triggerIcon =
    resolved === "dark" || resolved === "hc-dark" ? "moon" : "sun";

  return (
    <div className="relative">
      <button
        type="button"
        title={`Theme: ${LABELS[preference]}`}
        aria-label="Change theme"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center w-8 h-8 rounded-md border-0 bg-transparent text-fg-subtle cursor-pointer transition-colors hover:bg-surface-subtle hover:text-fg"
      >
        <Icon name={triggerIcon} size={16} aria-hidden="true" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="menu"
            className="absolute right-0 mt-1 w-[min(208px,calc(100vw-24px))] bg-surface-elevated border border-border rounded-lg shadow-lg z-50 p-1 animate-pop"
          >
            {THEME_PREFS.map((p) => (
              <button
                key={p}
                type="button"
                role="menuitemradio"
                aria-checked={preference === p}
                onClick={() => {
                  setPreference(p);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] text-left cursor-pointer transition-colors ${
                  preference === p
                    ? "bg-accent-50 text-accent-700"
                    : "text-fg-muted hover:bg-surface-subtle hover:text-fg"
                }`}
              >
                <Icon name={ICONS[p]} size={14} aria-hidden="true" />
                <span className="flex-1 truncate">{LABELS[p]}</span>
                {preference === p && (
                  <Icon name="check" size={13} aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Full radio group for the account page. Bigger labels, descriptions,
// keyboard-navigable.
export function ThemePicker() {
  const { preference, setPreference } = useTheme();

  const options = [
    { value: "system", label: "Match system", desc: "Follow your OS preference." },
    { value: "light", label: "Light", desc: "Default light theme." },
    { value: "dark", label: "Dark", desc: "Easier on the eyes after sundown." },
    {
      value: "hc-light",
      label: "High contrast (light)",
      desc: "WCAG AAA — pure black on white, hard borders.",
    },
    {
      value: "hc-dark",
      label: "High contrast (dark)",
      desc: "WCAG AAA — pure white on black, hard borders.",
    },
  ];

  return (
    <div role="radiogroup" aria-label="Theme" className="grid gap-2">
      {options.map((opt) => {
        const active = preference === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setPreference(opt.value)}
            className={`flex items-start gap-3 px-3.5 py-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
              active
                ? "border-accent bg-accent-50"
                : "border-border bg-surface-elevated hover:border-border-strong"
            }`}
          >
            <span
              className={`mt-0.5 grid place-items-center w-4 h-4 rounded-full border-2 shrink-0 ${
                active ? "border-accent" : "border-border-strong"
              }`}
            >
              {active && (
                <span className="w-2 h-2 rounded-full bg-accent" aria-hidden="true" />
              )}
            </span>
            <span className="flex-1 min-w-0">
              <span
                className={`block text-[13.5px] font-semibold ${
                  active ? "text-accent-700" : "text-fg"
                }`}
              >
                {opt.label}
              </span>
              <span className="block text-[12.5px] text-fg-muted mt-0.5 leading-snug">
                {opt.desc}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
