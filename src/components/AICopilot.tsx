"use client";
import { useState } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { aiSearch } from "@/lib/ai";

export type AIMessage = { role: "user" | "ai"; text: string };

export function AICopilot({ compact = false, onResults }: { compact?: boolean; onResults?: (q: string) => void }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AIMessage[]>([
    { role: "ai", text: "Merhaba! Ben RehberIQ asistanınızım. 🧠 Bana ihtiyacınızı doğal cümleyle anlatın — örneğin “Kadıköy'de pazar günü açık, uygun fiyatlı kuaför arıyorum”. Size en uygun işletmeleri eşleşme skoruyla sıralayayım." },
  ]);
  const [loading, setLoading] = useState(false);

  const ask = (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setLoading(true);
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setTimeout(() => {
      const { intent, results } = aiSearch(q);
      const top = results.slice(0, 3).map((r) => `• ${r.business.name} (${r.business.rating}★, ${r.business.district}) — ${r.reason}`).join("\n");
      setMessages((m) => [...m, { role: "ai", text: `${intent.explanation}\n\nÖne çıkan 3 eşleşme:\n${top}\n\nAşağıdaki listeyi sizin için güncelledim — randevu veya teklif butonlarıyla tek dokunuşla ilerleyebilirsiniz.` }]);
      setLoading(false);
      onResults?.(q);
    }, 700);
  };

  return (
    <div className={`overflow-hidden rounded-3xl border border-white/15 bg-white/[0.06] backdrop-blur-xl ${compact ? "" : "shadow-2xl shadow-fuchsia-900/30"}`}>
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-extrabold text-white">RehberIQ Asistan</p>
          <p className="flex items-center gap-1.5 text-[11px] text-emerald-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> çevrimiçi • 20 rehberin verisiyle eğitildi</p>
        </div>
      </div>
      <div className={`space-y-2.5 overflow-y-auto px-4 py-3 ${compact ? "max-h-56" : "max-h-72"}`}>
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[92%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${m.role === "ai" ? "bg-white/10 text-white" : "ml-auto bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white"}`}>
            {m.text}
          </div>
        ))}
        {loading && <p className="flex items-center gap-2 text-xs text-white/60"><Loader2 className="h-3.5 w-3.5 animate-spin" /> İşletmeler taranıyor…</p>}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex gap-2 border-t border-white/10 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Örn: yakınımda açık tesisatçı…"
          className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-fuchsia-400 focus:outline-none"
        />
        <button className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90" aria-label="Gönder">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
