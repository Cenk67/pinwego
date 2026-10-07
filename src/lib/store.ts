"use client";
import { useState } from "react";

function read<T>(key: string, initial: T): T {
  if (typeof window === "undefined") return initial;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return initial;
}

export function useLocal<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => read(key, initial));
  const save = (v: T | ((p: T) => T)) => {
    setValue((prev) => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  return [value, save] as const;
}
