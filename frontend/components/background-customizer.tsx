"use client";

import * as React from "react";
import { Palette, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STORAGE_KEY = "gttc_lms_background_color";
const DEFAULT_COLOR = "#f8f7f3";

type Rgb = { r: number; g: number; b: number };

function clamp(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hex: string): Rgb | null {
  const normalized = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return { r, g, b };
}

function rgbToCss({ r, g, b }: Rgb) {
  return `rgb(${clamp(r)} ${clamp(g)} ${clamp(b)})`;
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: clamp(a.r + (b.r - a.r) * t),
    g: clamp(a.g + (b.g - a.g) * t),
    b: clamp(a.b + (b.b - a.b) * t),
  };
}

function relativeLuminance({ r, g, b }: Rgb) {
  const map = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * map[0] + 0.7152 * map[1] + 0.0722 * map[2];
}

function normalizeHex(value: string) {
  const candidate = value.trim().startsWith("#")
    ? value.trim()
    : `#${value.trim()}`;
  return /^#[0-9a-fA-F]{6}$/.test(candidate) ? candidate.toLowerCase() : null;
}

function applyBackgroundTheme(hex: string) {
  const root = document.documentElement;
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return;
  }

  const isLight = relativeLuminance(rgb) > 0.48;
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 17, g: 24, b: 39 };

  const foreground = isLight ? black : white;
  const card = isLight ? mix(rgb, white, 0.55) : mix(rgb, white, 0.15);
  const secondary = isLight ? mix(rgb, white, 0.35) : mix(rgb, white, 0.22);
  const muted = isLight ? mix(rgb, white, 0.28) : mix(rgb, white, 0.18);
  const border = isLight ? mix(rgb, black, 0.14) : mix(rgb, white, 0.24);
  const mutedForeground = isLight
    ? mix(foreground, rgb, 0.42)
    : mix(foreground, rgb, 0.36);
  const accent = isLight ? mix(rgb, black, 0.25) : mix(rgb, white, 0.35);
  const ring = isLight ? mix(rgb, black, 0.4) : mix(rgb, white, 0.45);

  root.style.setProperty("--background", rgbToCss(rgb));
  root.style.setProperty("--foreground", rgbToCss(foreground));
  root.style.setProperty("--card", rgbToCss(card));
  root.style.setProperty("--card-foreground", rgbToCss(foreground));
  root.style.setProperty("--popover", rgbToCss(card));
  root.style.setProperty("--popover-foreground", rgbToCss(foreground));
  root.style.setProperty("--secondary", rgbToCss(secondary));
  root.style.setProperty("--secondary-foreground", rgbToCss(foreground));
  root.style.setProperty("--muted", rgbToCss(muted));
  root.style.setProperty("--muted-foreground", rgbToCss(mutedForeground));
  root.style.setProperty("--border", rgbToCss(border));
  root.style.setProperty("--input", rgbToCss(border));
  root.style.setProperty("--accent", rgbToCss(accent));
  root.style.setProperty("--accent-foreground", rgbToCss(foreground));
  root.style.setProperty("--ring", rgbToCss(ring));
}

export function BackgroundCustomizer() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [color, setColor] = React.useState(DEFAULT_COLOR);
  const [textValue, setTextValue] = React.useState(DEFAULT_COLOR);

  React.useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEY)
        : null;
    const normalized = normalizeHex(stored || "") || DEFAULT_COLOR;
    setColor(normalized);
    setTextValue(normalized);
    applyBackgroundTheme(normalized);
  }, []);

  const commitColor = React.useCallback((nextHex: string) => {
    const normalized = normalizeHex(nextHex);
    if (!normalized) {
      return false;
    }

    setColor(normalized);
    setTextValue(normalized);
    applyBackgroundTheme(normalized);
    window.localStorage.setItem(STORAGE_KEY, normalized);
    return true;
  }, []);

  const resetTheme = React.useCallback(() => {
    setColor(DEFAULT_COLOR);
    setTextValue(DEFAULT_COLOR);
    window.localStorage.removeItem(STORAGE_KEY);
    applyBackgroundTheme(DEFAULT_COLOR);
  }, []);

  return (
    <div className="fixed right-3 top-3 z-[90]">
      <div className="relative">
        <Button
          type="button"
          size="sm"
          className="gap-2 shadow-md"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <span
            className="h-3.5 w-3.5 rounded-full border border-white/70"
            style={{ backgroundColor: color }}
          />
          <Palette className="h-4 w-4" />
          <span className="hidden sm:inline">Background</span>
        </Button>

        {isOpen ? (
          <div className="absolute right-0 mt-2 w-72 rounded-xl border border-border bg-card p-3 shadow-xl">
            <p className="text-sm font-medium text-foreground">
              Customize Background
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pick any color. Text contrast updates automatically.
            </p>

            <div className="mt-3 grid grid-cols-[70px_1fr] gap-2">
              <Input
                type="color"
                value={color}
                onChange={(event) => {
                  const next = event.target.value;
                  setColor(next);
                  setTextValue(next);
                  commitColor(next);
                }}
                className="h-10 w-full cursor-pointer p-1"
                aria-label="Background color picker"
              />
              <Input
                value={textValue}
                onChange={(event) => setTextValue(event.target.value)}
                onBlur={() => {
                  if (!commitColor(textValue)) {
                    setTextValue(color);
                  }
                }}
                placeholder="#f8f7f3"
                maxLength={7}
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetTheme}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reset
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
