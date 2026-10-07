export function LuminaMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="16" fill="currentColor" className="text-primary" />
      <path
        d="M32 12c8.8 0 16 6.4 16 16.2 0 9.2-7.4 17.6-16 23.8-8.6-6.2-16-14.6-16-23.8C16 18.4 23.2 12 32 12z"
        fill="#F7F1E8"
      />
      <circle cx="32" cy="28" r="7" fill="#1B5F5A" />
      <circle cx="32" cy="28" r="3" fill="#F7F1E8" />
    </svg>
  )
}
