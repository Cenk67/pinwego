import { Star, StarHalf } from "lucide-react";

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.4;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} yıldız`}>
      {Array.from({ length: 5 }).map((_, i) => {
        if (i < full) return <Star key={i} style={{ width: size, height: size }} className="fill-amber-400 text-amber-400" />;
        if (i === full && half)
          return (
            <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
              <Star style={{ width: size, height: size }} className="absolute inset-0 text-amber-400" />
              <StarHalf style={{ width: size, height: size }} className="absolute inset-0 fill-amber-400 text-amber-400" />
            </span>
          );
        return <Star key={i} style={{ width: size, height: size }} className="text-slate-300" />;
      })}
    </span>
  );
}
