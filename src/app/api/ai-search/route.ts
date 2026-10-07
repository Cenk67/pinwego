import { NextResponse } from "next/server";
import { aiSearch } from "@/lib/ai";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  if (!q) return NextResponse.json({ error: "q parametresi gerekli" }, { status: 400 });
  const { intent, results } = aiSearch(q);
  return NextResponse.json({
    query: q,
    intent,
    results: results.slice(0, 10).map((r) => ({
      id: r.business.id,
      name: r.business.name,
      category: r.business.category,
      district: r.business.district,
      rating: r.business.rating,
      reviewCount: r.business.reviewCount,
      score: r.score,
      reason: r.reason,
    })),
  });
}
