import { fold, slugifyKey } from "@/lib/format"
import type { BookingKind, Sector } from "@/lib/types"

let extras: Sector[] = []

function sector(
  id: string,
  label: string,
  blurb: string,
  photo: string,
  tint: string,
  icon: string,
  booking: BookingKind,
  phrases: string[],
): Sector {
  return { id, label, blurb, photo, tint, icon, booking, phrases }
}

export const seedSectors: Sector[] = [
  sector("yeme", "Yeme-İçme", "Restoran, kafe, kahvaltı", "/photos/lokanta.jpg", "#b4532a", "utensils", "rezervasyon", ["aksam yemegi", "kahvalti", "restoran", "lokanta", "meyhane", "kafe", "kahve", "brunch", "balik", "izgara", "firin", "yemek"]),
  sector("konaklama", "Konaklama", "Otel, konak, suit", "/photos/hotel.jpg", "#1f4b6e", "bed", "rezervasyon", ["butik otel", "otel", "konak", "suit", "pansiyon", "tatil"]),
  sector("guzellik", "Güzellik", "Kuaför, berber, spa", "/photos/salon.jpg", "#8d4d73", "scissors", "randevu", ["kuafor", "berber", "sac", "spa", "masaj", "cilt", "guzellik", "manikur"]),
  sector("ev", "Ev hizmetleri", "Boya, tadilat, mutfak", "/photos/paint.jpg", "#3f6b4a", "paint", "teklif", ["boya usta", "tadilat", "boya", "mutfak", "dolap", "ev hizmet"]),
  sector("temizlik", "Temizlik", "Ev, ofis, halı yıkama", "/photos/cleaning.jpg", "#2f6b62", "sparkles", "teklif", ["ofis temizlik", "temizlik", "hali yikama", "dis cephe"]),
  sector("usta", "Usta & tamir", "Tesisat, elektrik, klima", "/photos/plumber.jpg", "#a15c12", "wrench", "teklif", ["tesisat", "elektrik", "klima", "tamir", "elektrikci", "tesisatci", "usta"]),
  sector("saglik", "Sağlık", "Klinik, diş, fizik", "/photos/dental.jpg", "#0f6e6b", "heart", "randevu", ["dis temizligi", "fizyoterapi", "fizik tedavi", "dis", "doktor", "klinik", "goz", "saglik"]),
  sector("eczane", "Eczane", "İlaç, medikal, vitamin", "/photos/chemistry.jpg", "#0b5f4a", "pill", "randevu", ["eczane", "ilac", "recete", "medikal"]),
  sector("optik", "Optik", "Gözlük, lens, muayene", "/photos/clinic.jpg", "#1f4b6e", "glasses", "randevu", ["optik", "gozluk", "lens", "goz muayene"]),
  sector("b2b", "B2B & tedarik", "Toptan, lojistik, ofis", "/photos/warehouse.jpg", "#243044", "building", "teklif", ["tedarik", "ambalaj", "lojistik", "toptan", "kimya", "ihracat", "b2b", "koli"]),
  sector("dekor", "Dekor & mekân", "Mobilya, iç mimari, bahçe", "/photos/interior.jpg", "#6b4a32", "sofa", "teklif", ["ic mimar", "peyzaj", "bahce", "mobilya", "dekor", "koltuk"]),
  sector("oto", "Otomotiv", "Servis, lastik, galeri", "/photos/repair.jpg", "#1f3a5f", "car", "teklif", ["oto servis", "oto", "lastik", "kaporta", "galeri", "akaryakit", "yikama"]),
  sector("alisveris", "Alışveriş", "Market, giyim, elektronik", "/photos/boutique.jpg", "#7a3e5c", "bag", "teklif", ["market", "magaza", "giyim", "ayakkabi", "elektronik magaza", "alisveris", "butik magaza"]),
  sector("egitim", "Eğitim", "Kurs, dil, sürücü, etüt", "/photos/office.jpg", "#2c4c6e", "grad", "randevu", ["dil kursu", "kurs", "surucu", "etut", "egitim", "okul", "ozel ders"]),
  sector("spor", "Spor & fitness", "Salon, pilates, yüzme", "/photos/physio.jpg", "#1f6b4a", "dumbbell", "randevu", ["spor salonu", "fitness", "pilates", "yoga", "yuzme", "pt", "spor"]),
  sector("eglence", "Eğlence", "Sinema, sahne, oyun", "/photos/meyhane.jpg", "#6b2f4a", "clapper", "rezervasyon", ["sinema", "tiyatro", "sahne", "canli muzik", "oyun", "eglence", "konser"]),
  sector("emlak", "Emlak", "Satılık, kiralık, ofis", "/photos/konak.jpg", "#4a6741", "house", "teklif", ["emlak", "kiralik", "satilik", "gayrimenkul", "konut", "ofis kiralama"]),
  sector("hukuk", "Hukuk", "Avukat, dava, danışmanlık", "/photos/office.jpg", "#3a3f4b", "scale", "randevu", ["avukat", "hukuk", "dava", "danismanlik hukuk"]),
  sector("finans", "Finans & sigorta", "Banka, muhasebe, sigorta", "/photos/office.jpg", "#1e4d3a", "wallet", "randevu", ["sigorta", "banka", "muhasebe", "mali musavir", "kredi", "finans", "police"]),
  sector("ulasim", "Ulaşım & kargo", "Taksi, nakliye, kurye", "/photos/logistics.jpg", "#3d4a22", "truck", "teklif", ["taksi", "nakliye", "kargo", "kurye", "transfer", "ulasim", "tasima"]),
  sector("hayvan", "Pet & veteriner", "Klinik, pet shop, bakım", "/photos/clinic.jpg", "#6b4e2a", "paw", "randevu", ["veteriner", "pet", "kedi", "kopek", "hayvan", "asi"]),
  sector("dugun", "Düğün & organizasyon", "Salon, fotoğraf, nikah", "/photos/boutique.jpg", "#8a3d4b", "party", "rezervasyon", ["dugun", "nikah", "organizasyon", "kina", "dugun salonu", "fotografci"]),
  sector("teknoloji", "Teknoloji", "Yazılım, bilgisayar, web", "/photos/electric.jpg", "#243044", "laptop", "teklif", ["yazilim", "web", "bilgisayar", "uygulama", "hosting", "teknoloji", "it"]),
  sector("cocuk", "Çocuk & kreş", "Anaokulu, oyun, etkinlik", "/photos/breakfast.jpg", "#b4532a", "baby", "randevu", ["kres", "anaokulu", "cocuk bakimi", "oyun grubu"]),
  sector("tarim", "Tarım", "Sera, fidan, ziraat", "/photos/garden.jpg", "#3f6b4a", "wheat", "teklif", ["sera", "fide", "ziraat", "tarim", "fidan", "ciftlik"]),
  sector("insaat", "İnşaat", "Müteahhit, yapı, proje", "/photos/paint.jpg", "#6b4a32", "hat", "teklif", ["muteahhit", "insaat", "kaba insaat", "yapi", "kat karsiligi"]),
  sector("guvenlik", "Güvenlik", "Kamera, alarm, bekçi", "/photos/warehouse.jpg", "#243044", "shield", "teklif", ["guvenlik", "kamera", "alarm", "bekci", "saha ekibi"]),
  sector("medya", "Reklam & medya", "Ajans, baskı, fotoğraf", "/photos/office.jpg", "#5a3d6b", "megaphone", "teklif", ["reklam", "ajans", "sosyal medya", "baski", "fotograf cekimi", "medya"]),
  sector("enerji", "Enerji", "Doğalgaz, güneş, kombi", "/photos/ac.jpg", "#a15c12", "zap", "teklif", ["kombi", "dogalgaz", "gunes paneli", "enerji", "kalorifer"]),
  sector("turizm", "Turizm & seyahat", "Tur, vize, acente", "/photos/hotel.jpg", "#1f4b6e", "plane", "teklif", ["tur", "seyahat", "vize", "acente", "turizm", "ucak bileti"]),
  sector("danismanlik", "Danışmanlık", "Yönetim, İK, kariyer", "/photos/office.jpg", "#3a3f4b", "briefcase", "randevu", ["danismanlik", "ik", "kariyer", "koc", "yonetim danisman"]),
  sector("tekstil", "Tekstil", "Konfeksiyon, kumaş, atölye", "/photos/boutique.jpg", "#7a3e5c", "shirt", "teklif", ["tekstil", "konfeksiyon", "kumas", "dikim", "atolye"]),
  sector("gida", "Gıda üretimi", "Catering, imalat, toptan gıda", "/photos/bakery.jpg", "#b4532a", "apple", "teklif", ["catering", "gida uretim", "toptan gida", "unlu mamul", "gida"]),
  sector("kuyum", "Kuyum & saat", "Altın, pırlanta, tamir", "/photos/boutique.jpg", "#8a6b1e", "gem", "teklif", ["kuyumcu", "altin", "saat", "pirlanta", "sarraf"]),
  sector("cicek", "Çiçek & hediye", "Buket, süs, organizasyon", "/photos/garden.jpg", "#8d4d73", "flower", "teklif", ["cicek", "buket", "hediye", "cicekci"]),
  sector("bakim", "Bakım hizmeti", "Yaşlı, hasta, evde bakım", "/photos/clinic.jpg", "#0f6e6b", "handshake", "randevu", ["yasli bakimi", "hasta bakimi", "evde bakim", "refakat"]),
  sector("muhendislik", "Mühendislik", "Statik, elektrik, proje", "/photos/office.jpg", "#243044", "ruler", "teklif", ["muhendis", "statik", "proje muhendislik", "kesif"]),
  sector("mimarlik", "Mimarlık", "Proje, ruhsat, uygulama", "/photos/interior.jpg", "#6b4a32", "compass", "teklif", ["mimar", "mimari proje", "ruhsat", "uygulama projesi"]),
  sector("laboratuvar", "Laboratuvar", "Tahlil, kalite, ölçüm", "/photos/chemistry.jpg", "#0f6e6b", "flask", "randevu", ["laboratuvar", "tahlil", "analiz", "olcum"]),
  sector("matbaa", "Matbaa", "Kartvizit, tabela, baskı", "/photos/office.jpg", "#5a3d6b", "printer", "teklif", ["matbaa", "kartvizit", "tabela", "dijital baski"]),
  sector("kiralama", "Kiralama", "Araç, ekipman, platform", "/photos/repair.jpg", "#1f3a5f", "key", "teklif", ["arac kiralama", "ekipman kiralama", "platform", "rent a car"]),
  sector("depolama", "Depolama", "Antrepo, arşiv, lojistik alan", "/photos/warehouse.jpg", "#243044", "warehouse", "teklif", ["depo", "antrepo", "arsiv", "depolama"]),
  sector("cevre", "Çevre & atık", "Geri dönüşüm, moloz, temizlik", "/photos/warehouse.jpg", "#3f6b4a", "recycle", "teklif", ["geri donusum", "atik", "moloz", "cevre"]),
  sector("yangin", "Yangın güvenliği", "Söndürme, tespit, eğitim", "/photos/ac.jpg", "#a15c12", "flame", "teklif", ["yangin", "sondurme", "sprinkler", "yangin dolabi"]),
  sector("sanat", "Sanat & hobi", "Atölye, galeri, kurs", "/photos/interior.jpg", "#6b2f4a", "palette", "randevu", ["resim", "galeri", "hobi", "sanat atolyesi", "seramik"]),
  sector("muzik", "Müzik", "Enstrüman, stüdyo, kurs", "/photos/meyhane.jpg", "#5a3d6b", "music", "randevu", ["muzik kursu", "enstruman", "studyo", "prova"]),
  sector("ithalat", "İthalat & gümrük", "Dış ticaret, evrak, lojistik", "/photos/warehouse.jpg", "#243044", "globe", "teklif", ["ithalat", "ihracat", "gumruk", "dis ticaret"]),
  sector("denizcilik", "Denizcilik", "Tekne, marina, bakım", "/photos/seafood.jpg", "#1f4b6e", "ship", "teklif", ["tekne", "marina", "denizcilik", "yat"]),
  sector("havacilik", "Havacılık", "Pilotaj, yer hizmeti, bakım", "/photos/logistics.jpg", "#1f3a5f", "plane", "teklif", ["havacilik", "pilotaj", "yer hizmeti", "ucak bakim"]),
  sector("isguvenligi", "İş güvenliği", "OSGB, eğitim, risk", "/photos/office.jpg", "#a15c12", "hat", "teklif", ["is guvenligi", "osgb", "risk analizi", "isg"]),
  sector("otopark", "Otopark", "Açık, kapalı, vale", "/photos/repair.jpg", "#3a3f4b", "parking", "teklif", ["otopark", "vale", "park yeri"]),
  sector("hamam", "Hamam & wellness", "Hamam, sauna, kür", "/photos/spa.jpg", "#8d4d73", "bath", "rezervasyon", ["hamam", "sauna", "termal", "kese"]),
  sector("gsm", "GSM & teknik servis", "Telefon, tablet, aksesuar", "/photos/electric.jpg", "#243044", "phone", "teklif", ["telefon tamir", "gsm", "aksesuar", "ekran degisim"]),
  sector("tercume", "Tercüme", "Yeminli, simultane, noter", "/photos/office.jpg", "#2c4c6e", "languages", "teklif", ["tercume", "yeminli tercuman", "simultane", "ceviri"]),
  sector("ikinciel", "İkinci el", "Alım satım, antika, pazar", "/photos/furniture.jpg", "#6b4a32", "repeat", "teklif", ["ikinci el", "antika", "sahibinden magaza", "bit pazari"]),
  sector("kurutemizleme", "Kuru temizleme", "Çamaşır, ütü, leke", "/photos/cleaning.jpg", "#2f6b62", "wind", "teklif", ["kuru temizleme", "camasirhane", "utu", "leke cikarma"]),
  sector("ilaclama", "İlaçlama", "Haşere, dezenfeksiyon", "/photos/chemistry.jpg", "#3f6b4a", "bug", "teklif", ["ilaclama", "hasere", "bocek ilac", "dezenfeksiyon"]),
  sector("cenaze", "Cenaze", "Defin, organizasyon, mezar", "/photos/office.jpg", "#3a3f4b", "flower", "teklif", ["cenaze", "defin", "mezar", "taziye"]),
  sector("psikoloji", "Psikoloji", "Terapi, danışmanlık, test", "/photos/clinic.jpg", "#0f6e6b", "brain", "randevu", ["psikolog", "terapi", "psikoloji", "psikiyatri"]),
  sector("iletisim", "İletişim", "İnternet, TV, hat", "/photos/electric.jpg", "#243044", "radio", "teklif", ["internet", "fiber", "tv abonelik", "isp", "telefon hatti"]),
  sector("metal", "Metal & kaynak", "Kaynak, sac, atölye", "/photos/repair.jpg", "#6b4a32", "hammer", "teklif", ["kaynak", "metal atolyesi", "sac isleme", "celik is"]),
  sector("cam", "Cam & doğrama", "Camcı, PVC, balkon", "/photos/interior.jpg", "#1f4b6e", "square", "teklif", ["camci", "cam balkon", "pvc dograma", "pencere"]),
  sector("asansor", "Asansör", "Montaj, bakım, modernizasyon", "/photos/office.jpg", "#243044", "arrows", "teklif", ["asansor", "yuruyen merdiven", "asansor bakim"]),
  sector("havuz", "Havuz", "Yapım, bakım, kimyasal", "/photos/spa.jpg", "#1f4b6e", "waves", "teklif", ["havuz", "havuz bakim", "jakuzi"]),
  sector("cekici", "Çekici & yol yardım", "Çekici, lastik, akü", "/photos/repair.jpg", "#1f3a5f", "truck", "teklif", ["cekici", "yol yardim", "aku takviye", "cekme"]),
  sector("kirtasiye", "Kırtasiye", "Ofis, okul, baskı", "/photos/office.jpg", "#2c4c6e", "book", "teklif", ["kirtasiye", "ofis malzeme", "kagit"]),
  sector("yayincilik", "Yayınevi", "Kitap, basım, dağıtım", "/photos/office.jpg", "#5a3d6b", "newspaper", "teklif", ["yayinevi", "kitap basim", "yayin"]),
  sector("cagri", "Çağrı merkezi", "Destek, satış, outbound", "/photos/office.jpg", "#3a3f4b", "headphones", "teklif", ["cagri merkezi", "outbound", "musteri hizmetleri"]),
  sector("hastane", "Hastane", "Özel hastane, poliklinik", "/photos/clinic.jpg", "#0f6e6b", "hospital", "randevu", ["hastane", "poliklinik", "acil servis", "ozel hastane"]),
  sector("gece", "Gece hayatı", "Bar, kulüp, lounge", "/photos/meyhane.jpg", "#6b2f4a", "wine", "rezervasyon", ["bar", "kulup", "gece hayati", "lounge", "nargile"]),
  sector("hirdavat", "Hırdavat", "Vida, boya, el aleti", "/photos/repair.jpg", "#6b4a32", "hammer", "teklif", ["hirdavat", "nalburiye", "el aleti"]),
  sector("cati", "Çatı & izolasyon", "Çatı, su yalıtımı, mantolama", "/photos/paint.jpg", "#6b4a32", "house", "teklif", ["cati", "izolasyon", "mantolama", "su yalitimi"]),
  sector("hafriyat", "Hafriyat", "Kazı, moloz, kamyon", "/photos/warehouse.jpg", "#6b4a32", "shovel", "teklif", ["hafriyat", "kazi", "moloz tasima"]),
  sector("dans", "Dans", "Kurs, düğün, sahne", "/photos/salon.jpg", "#8d4d73", "party", "randevu", ["dans kursu", "dans", "salsa", "bale"]),
  sector("noter", "Noter", "Tasdik, vekalet, sözleşme", "/photos/office.jpg", "#3a3f4b", "stamp", "randevu", ["noter", "vekalet", "tasdik", "imza beyani"]),
  sector("belgelendirme", "Belgelendirme", "ISO, CE, kalite", "/photos/office.jpg", "#1e4d3a", "badge", "teklif", ["iso", "belgelendirme", "ce belgesi", "kalite belgesi"]),
  sector("sogukhava", "Soğuk hava", "Depo, soğuk zincir", "/photos/warehouse.jpg", "#1f4b6e", "snowflake", "teklif", ["soguk hava", "soguk depo", "soguk zincir"]),
  sector("jenerator", "Jeneratör", "Satış, kiralama, bakım", "/photos/electric.jpg", "#a15c12", "battery", "teklif", ["jenerator", "ups", "kesintisiz guc"]),
  sector("prefabrik", "Prefabrik", "Konteyner, şantiye, ev", "/photos/konak.jpg", "#6b4a32", "factory", "teklif", ["prefabrik", "konteyner", "santiye yapi"]),
  sector("kitap", "Kitabevi", "Kitap, dergi, sahaflar", "/photos/office.jpg", "#2c4c6e", "book", "teklif", ["kitabevi", "kitapci", "sahaf"]),
]

export const sectorPhotos = [...new Set(seedSectors.map((item) => item.photo))]
export const sectorIcons = [...new Set(seedSectors.map((item) => item.icon))]
export const sectorTints = [...new Set(seedSectors.map((item) => item.tint))]

export function uniqueSectorId(label: string, taken: Iterable<string> = allSectors().map((item) => item.id)) {
  const used = new Set(taken)
  const base = slugifyKey(label)
  if (!used.has(base)) return base
  let index = 2
  while (used.has(`${base}-${index}`)) index += 1
  return `${base}-${index}`
}

export function normalizeSector(raw: Partial<Sector>, taken: Iterable<string> = []): Sector | null {
  if (!raw || typeof raw.label !== "string" || raw.label.trim().length < 2) return null
  const label = raw.label.trim()
  const phrases = Array.isArray(raw.phrases)
    ? raw.phrases.map((item) => fold(String(item))).filter(Boolean)
    : []
  return {
    id: raw.id && !Array.from(taken).includes(raw.id) ? raw.id : uniqueSectorId(label, taken),
    label,
    blurb: (raw.blurb || "Özel sektör").trim(),
    photo: typeof raw.photo === "string" && raw.photo.startsWith("/") ? raw.photo : "/photos/office.jpg",
    tint: typeof raw.tint === "string" && raw.tint.startsWith("#") ? raw.tint : "#243044",
    icon: typeof raw.icon === "string" && raw.icon ? raw.icon : "building",
    booking: raw.booking === "randevu" || raw.booking === "rezervasyon" || raw.booking === "teklif" ? raw.booking : "teklif",
    phrases: phrases.length ? phrases : [fold(label)],
    custom: true,
  }
}

export function setCustomSectors(list: Sector[]) {
  extras = list.filter((item) => item.custom && item.id && item.label)
}

export function allSectors(): Sector[] {
  const seen = new Set(seedSectors.map((item) => item.id))
  return [...seedSectors, ...extras.filter((item) => !seen.has(item.id))]
}

export function isSector(value: unknown): value is Sector {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<Sector>
  return (
    typeof item.id === "string" &&
    typeof item.label === "string" &&
    typeof item.blurb === "string" &&
    typeof item.photo === "string" &&
    typeof item.tint === "string" &&
    typeof item.icon === "string" &&
    Array.isArray(item.phrases)
  )
}
