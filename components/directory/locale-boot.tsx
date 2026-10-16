"use client"

import { useEffect } from "react"
import { bootLocale } from "@/lib/i18n"

export function LocaleBoot() {
  useEffect(() => {
    bootLocale()
  }, [])
  return null
}
