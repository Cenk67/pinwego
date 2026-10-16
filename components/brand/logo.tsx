export function Logo({ variant = "horizontal" }: { variant?: "horizontal" | "stacked" }) {
  const stacked = variant === "stacked"
  return (
    <span className={stacked ? "inline-flex flex-col items-start gap-2" : "inline-flex items-center gap-2"}>
      <img
        src="/brand/mark.png"
        alt=""
        width={957}
        height={511}
        className={stacked ? "h-14 w-auto" : "h-8 w-auto sm:h-9"}
      />
      <img
        src="/brand/wordmark.png"
        alt=""
        width={1351}
        height={283}
        className={stacked ? "h-7 w-auto" : "hidden h-6 w-auto sm:block"}
      />
    </span>
  )
}
