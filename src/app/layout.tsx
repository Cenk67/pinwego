import type { Metadata } from "next";
import "./globals.css";
import { Header, BottomNav } from "@/components/Header";

export const metadata: Metadata = {
  title: "RehberIQ — Yapay Zekâlı Ticari Firma Rehberi",
  description:
    "Yelp'in yorumları, Booksy'nin randevusu, Thumbtack'in teklif eşleşmesi ve Tripadvisor'ın itibar ekosistemi tek mobil uyumlu yapay zekâlı rehberde.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Header />
        <div className="pb-20 md:pb-0">{children}</div>
        <BottomNav />
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-slate-600 md:grid-cols-4">
            <div>
              <p className="text-base font-extrabold text-slate-900">RehberIQ</p>
              <p className="mt-2 leading-relaxed">20 küresel rehberin en iyi özellikleri: arama + yorum + randevu + teklif + B2B veri, tek yapay zekâ motorunda.</p>
            </div>
            <div>
              <p className="font-bold text-slate-900">Keşfet</p>
              <ul className="mt-2 space-y-1.5">
                <li><a className="hover:text-violet-700" href="/kesfet">Tüm işletmeler</a></li>
                <li><a className="hover:text-violet-700" href="/teklif-al">Teklif al</a></li>
                <li><a className="hover:text-violet-700" href="/isletme-ekle">İşletmeni ekle</a></li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-slate-900">Kategoriler</p>
              <ul className="mt-2 space-y-1.5">
                <li><a className="hover:text-violet-700" href="/kesfet?k=restoran">Restoran &amp; Kafe</a></li>
                <li><a className="hover:text-violet-700" href="/kesfet?k=guzellik">Kuaför &amp; Güzellik</a></li>
                <li><a className="hover:text-violet-700" href="/kesfet?k=ev-hizmet">Ev Hizmetleri</a></li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-slate-900">Güven</p>
              <ul className="mt-2 space-y-1.5">
                <li>✓ Onaylı işletme rozeti</li>
                <li>✓ Yapay zekâ yorum özeti</li>
                <li>✓ Şeffaf fiyat &amp; garanti</li>
              </ul>
            </div>
          </div>
          <p className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">© 2026 RehberIQ • Demo veriler içerir • Mobil uyumlu</p>
        </footer>
      </body>
    </html>
  );
}
