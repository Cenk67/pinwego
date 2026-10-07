export type Review = {
  id: string;
  author: string;
  rating: number;
  date: string;
  text: string;
  helpful: number;
};

export type ServiceItem = {
  name: string;
  price: number;
  unit: string;
  duration?: string;
};

export type Business = {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  rating: number;
  reviewCount: number;
  priceLevel: 1 | 2 | 3;
  tags: string[];
  description: string;
  hours: { days: string; time: string; openNow: boolean }[];
  photos: string[];
  services: ServiceItem[];
  reviews: Review[];
  premium: boolean;
  verified: boolean;
  distanceKm: number;
  yearsActive: number;
  employees: string;
  languages: string[];
  acceptsAppointment: boolean;
  acceptsQuote: boolean;
  b2b?: { founded: number; sector: string; exportMarkets?: string[] };
};

export const CATEGORIES = [
  { slug: "restoran", label: "Restoran & Kafe", icon: "🍽️", count: 12480, color: "from-orange-500 to-rose-500" },
  { slug: "guzellik", label: "Kuaför & Güzellik", icon: "💇", count: 8932, color: "from-pink-500 to-fuchsia-600" },
  { slug: "ev-hizmet", label: "Ev Hizmetleri", icon: "🔧", count: 15210, color: "from-blue-500 to-indigo-600" },
  { slug: "saglik", label: "Sağlık & Klinik", icon: "🏥", count: 6420, color: "from-emerald-500 to-teal-600" },
  { slug: "otel", label: "Otel & Konaklama", icon: "🏨", count: 3180, color: "from-violet-500 to-purple-600" },
  { slug: "oto", label: "Oto Servis", icon: "🚗", count: 5210, color: "from-slate-600 to-slate-900" },
  { slug: "temizlik", label: "Temizlik", icon: "✨", count: 4310, color: "from-cyan-500 to-sky-600" },
  { slug: "nakliyat", label: "Nakliyat & Lojistik", icon: "🚚", count: 2870, color: "from-amber-500 to-orange-600" },
  { slug: "spor", label: "Spor & Fitness", icon: "🏋️", count: 1950, color: "from-lime-500 to-green-600" },
  { slug: "evcil", label: "Veteriner & Pet", icon: "🐾", count: 1640, color: "from-yellow-500 to-amber-600" },
  { slug: "hukuk", label: "Hukuk & Mali", icon: "⚖️", count: 3320, color: "from-stone-500 to-stone-800" },
  { slug: "etkinlik", label: "Etkinlik & Fotoğraf", icon: "📸", count: 2410, color: "from-purple-500 to-pink-600" },
];

const img = (seed: string) => `https://picsum.photos/seed/${seed}/640/420`;

export const BUSINESSES: Business[] = [
  {
    id: "lezzet-sofrasi",
    name: "Lezzet Sofrası Anadolu Mutfağı",
    category: "restoran",
    subcategory: "Anadolu Mutfağı",
    city: "İstanbul",
    district: "Kadıköy",
    address: "Caferağa Mah. Moda Cad. No:42, Kadıköy",
    phone: "0216 345 67 89",
    rating: 4.8,
    reviewCount: 2314,
    priceLevel: 2,
    tags: ["aile dostu", "vejetaryen seçenek", "pazar açık", "terası var", "paket servis"],
    description:
      "1987'den beri Anadolu mutfağının seçkin lezzetlerini sunan, odun fırını ve günlük taze malzemeleriyle ünlü aile işletmesi. Hafta sonu serpme kahvaltısı ve testi kebabı imza lezzetlerimiz.",
    hours: [
      { days: "Pzt–Cmt", time: "09:00 – 23:00", openNow: true },
      { days: "Pazar", time: "09:00 – 22:00", openNow: true },
    ],
    photos: [img("lezzet1"), img("lezzet2"), img("lezzet3")],
    services: [
      { name: "Serpme Kahvaltı (kişi başı)", price: 450, unit: "₺", duration: "sınırsız çay" },
      { name: "Testi Kebabı", price: 520, unit: "₺" },
      { name: "Güveç & Tencere menü", price: 320, unit: "₺" },
    ],
    reviews: [
      { id: "r1", author: "Elif K.", rating: 5, date: "2 gün önce", text: "Testi kebabı efsane, servis çok hızlı. Pazar kahvaltısı için erken gidin, sıra oluyor.", helpful: 42 },
      { id: "r2", author: "Murat D.", rating: 5, date: "1 hafta önce", text: "Fiyat-performans olarak Kadıköy'ün en iyisi. Terasta oturmak çok keyifli.", helpful: 28 },
      { id: "r3", author: "Zeynep A.", rating: 4, date: "3 hafta önce", text: "Lezzetler harika, sadece hafta sonu biraz kalabalık. Rezervasyon öneririm.", helpful: 15 },
    ],
    premium: true,
    verified: true,
    distanceKm: 1.2,
    yearsActive: 38,
    employees: "20–50",
    languages: ["Türkçe", "İngilizce"],
    acceptsAppointment: true,
    acceptsQuote: false,
  },
  {
    id: "studio-nova",
    name: "Studio Nova Hair & Beauty",
    category: "guzellik",
    subcategory: "Kuaför & Güzellik Salonu",
    city: "İstanbul",
    district: "Beşiktaş",
    address: "Sinanpaşa Mah. Ihlamurdere Cad. No:18",
    phone: "0212 261 44 55",
    rating: 4.9,
    reviewCount: 1876,
    priceLevel: 3,
    tags: ["randevulu", "balyaj uzmanı", "gelin saçı", "cilt bakımı", "pazar açık"],
    description:
      "Boğaz manzaralı butik güzellik stüdyosu. Balyaj, keratin ve gelin saçı konularında uzman kadro; Booksy tarzı anlık randevu takvimiyle bekleme yok.",
    hours: [
      { days: "Pzt–Cmt", time: "10:00 – 20:00", openNow: true },
      { days: "Pazar", time: "11:00 – 18:00", openNow: true },
    ],
    photos: [img("nova1"), img("nova2"), img("nova3")],
    services: [
      { name: "Saç Kesimi (kadın)", price: 900, unit: "₺", duration: "45 dk" },
      { name: "Balyaj + Bakım", price: 4500, unit: "₺", duration: "3 saat" },
      { name: "Keratin Bakımı", price: 3200, unit: "₺", duration: "2 saat" },
      { name: "Gelin Saçı + Makyaj", price: 8500, unit: "₺", duration: "3 saat" },
    ],
    reviews: [
      { id: "r1", author: "Selin Y.", rating: 5, date: "dün", text: "Balyajım tam istediğim gibi oldu. Randevu sistemleri mükemmel, beklemeden alındım.", helpful: 31 },
      { id: "r2", author: "Deniz T.", rating: 5, date: "4 gün önce", text: "Düğünüm için gelin saçı yaptırdım, fotoğraflar inanılmaz çıktı.", helpful: 19 },
    ],
    premium: true,
    verified: true,
    distanceKm: 3.4,
    yearsActive: 9,
    employees: "10–20",
    languages: ["Türkçe", "İngilizce"],
    acceptsAppointment: true,
    acceptsQuote: true,
  },
  {
    id: "usta-tesisat",
    name: "Usta Tesisat 7/24",
    category: "ev-hizmet",
    subcategory: "Tesisatçı",
    city: "İstanbul",
    district: "Üsküdar",
    address: "Altunizade Mah. Kısıklı Cad. No:77",
    phone: "0532 111 22 33",
    rating: 4.7,
    reviewCount: 3421,
    priceLevel: 1,
    tags: ["7/24 acil", "aynı gün servis", "garantili işçilik", "ücretsiz keşif"],
    description:
      "Su kaçağı tespiti, petek temizliği ve komple banyo tadilatında uzman ekip. Aynı gün servis, 1 yıl işçilik garantisi ve şeffaf fiyat.",
    hours: [
      { days: "Her gün", time: "00:00 – 24:00", openNow: true },
    ],
    photos: [img("tesisat1"), img("tesisat2")],
    services: [
      { name: "Petek Temizliği (daire)", price: 2500, unit: "₺", duration: "2 saat" },
      { name: "Su Kaçağı Tespiti", price: 1500, unit: "₺", duration: "1 saat" },
      { name: "Klozet & Batarya Montajı", price: 1200, unit: "₺" },
    ],
    reviews: [
      { id: "r1", author: "Hasan B.", rating: 5, date: "3 gün önce", text: "Gece 2'de su bastı, 40 dakikada geldiler. Fiyatı telefonda net söylediler.", helpful: 55 },
      { id: "r2", author: "Ayşe M.", rating: 4, date: "2 hafta önce", text: "Petek temizliği sonrası ev bariz ısındı. Biraz randevu yoğunluğu var.", helpful: 12 },
    ],
    premium: false,
    verified: true,
    distanceKm: 2.1,
    yearsActive: 14,
    employees: "10–20",
    languages: ["Türkçe"],
    acceptsAppointment: true,
    acceptsQuote: true,
  },
  {
    id: "dentaplus",
    name: "DentaPlus Ağız & Diş Kliniği",
    category: "saglik",
    subcategory: "Diş Kliniği",
    city: "İzmir",
    district: "Alsancak",
    address: "Kordon Boyu No:12, Alsancak",
    phone: "0232 421 00 11",
    rating: 4.9,
    reviewCount: 1204,
    priceLevel: 2,
    tags: ["implant uzmanı", "şeffaf plak", "ücretsiz muayene", "turizm hastası"],
    description:
      "Dijital gülüş tasarımı, implant ve şeffaf plak tedavilerinde uzman klinik. Ücretsiz ön muayene ve taksit imkânı.",
    hours: [{ days: "Pzt–Cmt", time: "09:00 – 19:00", openNow: true }],
    photos: [img("denta1"), img("denta2"), img("denta3")],
    services: [
      { name: "Muayene + Röntgen", price: 0, unit: "₺" },
      { name: "İmplant (tek diş)", price: 18000, unit: "₺" },
      { name: "Şeffaf Plak (Ortodonti)", price: 55000, unit: "₺", duration: "12 ay" },
    ],
    reviews: [
      { id: "r1", author: "Can Ö.", rating: 5, date: "1 hafta önce", text: "İmplant sürecim ağrısız geçti, her adımı anlattılar.", helpful: 22 },
      { id: "r2", author: "Gül N.", rating: 5, date: "1 ay önce", text: "Şeffaf plakla 8 ayda dişlerim düzeldi. Fiyat şeffaftı.", helpful: 17 },
    ],
    premium: true,
    verified: true,
    distanceKm: 5.8,
    yearsActive: 11,
    employees: "20–50",
    languages: ["Türkçe", "İngilizce", "Almanca"],
    acceptsAppointment: true,
    acceptsQuote: true,
  },
  {
    id: "elektrik-pro",
    name: "ElektrikPro Servis",
    category: "ev-hizmet",
    subcategory: "Elektrikçi",
    city: "Ankara",
    district: "Çankaya",
    address: "Kızılay Mah. Atatürk Bulvarı No:101",
    phone: "0312 418 90 90",
    rating: 4.6,
    reviewCount: 2130,
    priceLevel: 1,
    tags: ["sigorta arızası", "led aydınlatma", "akıllı ev", "faturalı hizmet"],
    description:
      "Konut ve işyeri elektrik arızaları, LED dönüşümü ve akıllı ev kurulumu. Faturalı, garantili servis.",
    hours: [{ days: "Pzt–Cmt", time: "08:00 – 22:00", openNow: true }],
    photos: [img("elek1"), img("elek2")],
    services: [
      { name: "Arıza Tespit + Onarım", price: 800, unit: "₺" },
      { name: "Avize Montajı", price: 600, unit: "₺" },
      { name: "Akıllı Ev Başlangıç Paketi", price: 15000, unit: "₺" },
    ],
    reviews: [
      { id: "r1", author: "Emre S.", rating: 5, date: "5 gün önce", text: "Sigorta sürekli atıyordu, 1 saatte çözdüler.", helpful: 18 },
    ],
    premium: false,
    verified: true,
    distanceKm: 4.2,
    yearsActive: 12,
    employees: "5–10",
    languages: ["Türkçe"],
    acceptsAppointment: true,
    acceptsQuote: true,
  },
  {
    id: "mavi-koy-otel",
    name: "Mavi Koy Boutique Hotel",
    category: "otel",
    subcategory: "Butik Otel",
    city: "Antalya",
    district: "Kaş",
    address: "Andifli Mah. Sahil Cad. No:5",
    phone: "0242 836 12 12",
    rating: 4.8,
    reviewCount: 964,
    priceLevel: 3,
    tags: ["deniz manzaralı", "balayı", "kahvaltı dahil", "dalış turu"],
    description:
      "12 odalı yetişkin dostu butik otel. Sonsuzluk havuzu, Akdeniz mutfağı ve dalış turlarıyla Kaş'ın saklı koyunda.",
    hours: [{ days: "Her gün", time: "check-in 14:00", openNow: true }],
    photos: [img("mavi1"), img("mavi2"), img("mavi3")],
    services: [
      { name: "Standart Oda (gecelik)", price: 4500, unit: "₺" },
      { name: "Süit + Jakuzili (gecelik)", price: 8900, unit: "₺" },
    ],
    reviews: [
      { id: "r1", author: "Julia R.", rating: 5, date: "2 hafta önce", text: "Sunset from the infinity pool is unreal. Staff booked everything for us.", helpful: 25 },
    ],
    premium: true,
    verified: true,
    distanceKm: 12.5,
    yearsActive: 7,
    employees: "10–20",
    languages: ["Türkçe", "İngilizce", "Rusça"],
    acceptsAppointment: true,
    acceptsQuote: false,
  },
  {
    id: "hizli-oto",
    name: "Hızlı Oto Bakım Merkezi",
    category: "oto",
    subcategory: "Oto Servis",
    city: "İstanbul",
    district: "Ataşehir",
    address: "Örnek Mah. Sanayi Cad. No:30",
    phone: "0216 580 10 10",
    rating: 4.5,
    reviewCount: 1750,
    priceLevel: 2,
    tags: ["ekspertiz", "periyodik bakım", "lastik oteli", "ücretsiz çekici"],
    description:
      "Tüm marka periyodik bakım, fren-balata ve klima servisi. Şeffaf parça listesi, 1 yıl garanti.",
    hours: [{ days: "Pzt–Cmt", time: "08:30 – 19:00", openNow: true }],
    photos: [img("oto1"), img("oto2")],
    services: [
      { name: "Periyodik Bakım (10K)", price: 6500, unit: "₺", duration: "2 saat" },
      { name: "Detaylı Ekspertiz", price: 2000, unit: "₺" },
    ],
    reviews: [
      { id: "r1", author: "Okan V.", rating: 4, date: "1 hafta önce", text: "Bakım öncesi fiyat listesi verdiler, sürpriz çıkmadı.", helpful: 9 },
    ],
    premium: false,
    verified: true,
    distanceKm: 6.1,
    yearsActive: 16,
    employees: "20–50",
    languages: ["Türkçe"],
    acceptsAppointment: true,
    acceptsQuote: true,
    b2b: { founded: 2009, sector: "Otomotiv Servis", exportMarkets: ["Almanya"] },
  },
  {
    id: "pırıl-ev",
    name: "Pırıl Ev Temizlik",
    category: "temizlik",
    subcategory: "Ev Temizliği",
    city: "İstanbul",
    district: "Bakırköy",
    address: "Zuhuratbaba Mah. No:9",
    phone: "0533 200 10 20",
    rating: 4.7,
    reviewCount: 2890,
    priceLevel: 1,
    tags: ["evcil hayvan dostu", "eko ürün", "cam silme dahil", "sigortalı personel"],
    description:
      "Sigortalı ve eğitimli kadroyla dip köşe ev temizliği. Eko ürün seçeneği, memnuniyet garantisi.",
    hours: [{ days: "Her gün", time: "08:00 – 20:00", openNow: true }],
    photos: [img("piril1"), img("piril2")],
    services: [
      { name: "Standart Ev Temizliği (2+1)", price: 1800, unit: "₺", duration: "3 saat" },
      { name: "Dip Köşe + Cam (3+1)", price: 3200, unit: "₺", duration: "5 saat" },
    ],
    reviews: [
      { id: "r1", author: "Fatma L.", rating: 5, date: "dün", text: "Camlar, fırın içi her yer pırıl pırıl. Ekip çok nazikti.", helpful: 14 },
    ],
    premium: false,
    verified: true,
    distanceKm: 7.3,
    yearsActive: 6,
    employees: "50–100",
    languages: ["Türkçe"],
    acceptsAppointment: true,
    acceptsQuote: true,
  },
  {
    id: "aslan-nakliyat",
    name: "Aslan Şehirlerarası Nakliyat",
    category: "nakliyat",
    subcategory: "Evden Eve Nakliyat",
    city: "Ankara",
    district: "Yenimahalle",
    address: "OSTİM Sanayi Sitesi No:44",
    phone: "0312 395 55 55",
    rating: 4.6,
    reviewCount: 1320,
    priceLevel: 2,
    tags: ["asansörlü taşıma", "sigortalı", "şehirlerarası", "ambalaj dahil"],
    description:
      "Asansörlü, sigortalı evden eve nakliyat. Ücretsiz ekspertizli sabit fiyat garantisi. D&B tarzı kurumsal taşımacılık referansları.",
    hours: [{ days: "Her gün", time: "07:00 – 23:00", openNow: true }],
    photos: [img("aslan1"), img("aslan2")],
    services: [
      { name: "Şehir içi 2+1 taşıma", price: 12000, unit: "₺" },
      { name: "Ankara–İstanbul 3+1", price: 28000, unit: "₺" },
    ],
    reviews: [
      { id: "r1", author: "Burak E.", rating: 5, date: "1 hafta önce", text: "Eşyalara çok dikkat ettiler, çizik bile yok.", helpful: 11 },
    ],
    premium: false,
    verified: true,
    distanceKm: 9.4,
    yearsActive: 19,
    employees: "20–50",
    languages: ["Türkçe"],
    acceptsAppointment: false,
    acceptsQuote: true,
    b2b: { founded: 2006, sector: "Lojistik", exportMarkets: [] },
  },
  {
    id: "form34",
    name: "Form34 Fitness Club",
    category: "spor",
    subcategory: "Spor Salonu",
    city: "İstanbul",
    district: "Şişli",
    address: "Mecidiyeköy Mah. Büyükdere Cad. No:55",
    phone: "0212 211 34 34",
    rating: 4.4,
    reviewCount: 860,
    priceLevel: 2,
    tags: ["7/24 açık", "pilates", "havuz", "kişisel antrenör"],
    description:
      "2000 m², 7/24 açık fitness kulübü. Grup dersleri, reformer pilates ve havuz dahil üyelikler.",
    hours: [{ days: "Her gün", time: "00:00 – 24:00", openNow: true }],
    photos: [img("form1"), img("form2"), img("form3")],
    services: [
      { name: "Aylık Üyelik (tüm alan)", price: 2500, unit: "₺" },
      { name: "PT (10 seans)", price: 15000, unit: "₺" },
    ],
    reviews: [
      { id: "r1", author: "Gizem P.", rating: 4, date: "3 gün önce", text: "Akşam saatleri kalabalık ama sabah harika. Hocalar ilgili.", helpful: 7 },
    ],
    premium: false,
    verified: true,
    distanceKm: 5.2,
    yearsActive: 8,
    employees: "20–50",
    languages: ["Türkçe", "İngilizce"],
    acceptsAppointment: true,
    acceptsQuote: false,
  },
  {
    id: "patiklinik",
    name: "PatiKlinik Veteriner",
    category: "evcil",
    subcategory: "Veteriner Kliniği",
    city: "İstanbul",
    district: "Kadıköy",
    address: "Rasimpaşa Mah. Duatepe Sok. No:3",
    phone: "0216 336 78 78",
    rating: 4.9,
    reviewCount: 1105,
    priceLevel: 2,
    tags: ["7/24 acil", "kısırlaştırma", "pet kuaför", "evcil otel"],
    description:
      "Kedi-köpek acil, cerrahi ve pet kuaför hizmetleri. Şeffaf tedavi planı ve WhatsApp bilgilendirme.",
    hours: [{ days: "Her gün", time: "00:00 – 24:00", openNow: true }],
    photos: [img("pati1"), img("pati2")],
    services: [
      { name: "Muayene", price: 750, unit: "₺" },
      { name: "Kısırlaştırma (kedi)", price: 4500, unit: "₺" },
      { name: "Pet Kuaför (tam bakım)", price: 1200, unit: "₺" },
    ],
    reviews: [
      { id: "r1", author: "Derya U.", rating: 5, date: "2 gün önce", text: "Kedim gece hastalandı, sabaha kadar başında durdular. İyi ki varlar.", helpful: 33 },
    ],
    premium: true,
    verified: true,
    distanceKm: 1.8,
    yearsActive: 10,
    employees: "10–20",
    languages: ["Türkçe", "İngilizce"],
    acceptsAppointment: true,
    acceptsQuote: false,
  },
  {
    id: "hukuk-ates",
    name: "Ateş Hukuk & Danışmanlık",
    category: "hukuk",
    subcategory: "Avukatlık Bürosu",
    city: "İstanbul",
    district: "Levent",
    address: "Nispetiye Cad. No:24 Kat:8",
    phone: "0212 352 66 66",
    rating: 4.7,
    reviewCount: 420,
    priceLevel: 3,
    tags: ["şirketler hukuku", "kira davaları", "online görüşme", "İngilizce sözleşme"],
    description:
      "Şirketler, kira ve tüketici hukukunda uzman büro. İlk 30 dk online ön görüşme ücretsiz.",
    hours: [{ days: "Pzt–Cmt", time: "09:00 – 18:00", openNow: true }],
    photos: [img("hukuk1")],
    services: [
      { name: "Online Ön Görüşme (30 dk)", price: 0, unit: "₺" },
      { name: "Kira Uyarı + Dava Paketi", price: 25000, unit: "₺" },
    ],
    reviews: [
      { id: "r1", author: "Serkan G.", rating: 5, date: "2 hafta önce", text: "Kira davamı 4 ayda sonuçlandırdılar, sürekli bilgilendirdiler.", helpful: 13 },
    ],
    premium: false,
    verified: true,
    distanceKm: 6.8,
    yearsActive: 15,
    employees: "5–10",
    languages: ["Türkçe", "İngilizce"],
    acceptsAppointment: true,
    acceptsQuote: true,
    b2b: { founded: 2010, sector: "Hukuk", exportMarkets: [] },
  },
  {
    id: "kare-anı",
    name: "Kare Anı Fotoğraf Stüdyosu",
    category: "etkinlik",
    subcategory: "Düğün Fotoğrafçısı",
    city: "İzmir",
    district: "Karşıyaka",
    address: "Bahriye Üçok Bulvarı No:21",
    phone: "0232 330 45 45",
    rating: 4.8,
    reviewCount: 530,
    priceLevel: 2,
    tags: ["düğün", "dış çekim", "drone", "albüm dahil"],
    description:
      "Houzz tarzı görsel portföy: düğün, dış çekim ve ürün fotoğrafçılığı. Drone ve premium albüm dahil paketler.",
    hours: [{ days: "Her gün", time: "10:00 – 20:00", openNow: true }],
    photos: [img("kare1"), img("kare2"), img("kare3")],
    services: [
      { name: "Dış Çekim (2 saat)", price: 12000, unit: "₺" },
      { name: "Tam Gün Düğün + Albüm", price: 35000, unit: "₺" },
    ],
    reviews: [
      { id: "r1", author: "Merve & Ali", rating: 5, date: "1 ay önce", text: "Fotoğraflar dergi gibi! Çekim günü çok rahattık.", helpful: 20 },
    ],
    premium: true,
    verified: true,
    distanceKm: 8.0,
    yearsActive: 9,
    employees: "5–10",
    languages: ["Türkçe", "İngilizce"],
    acceptsAppointment: true,
    acceptsQuote: true,
  },
  {
    id: "dem-kahve",
    name: "Dem Kahve Kavurma Evi",
    category: "restoran",
    subcategory: "3. Dalga Kahveci",
    city: "Ankara",
    district: "Kızılay",
    address: "Meşrutiyet Cad. No:88",
    phone: "0312 425 33 44",
    rating: 4.6,
    reviewCount: 1980,
    priceLevel: 1,
    tags: ["çalışmaya uygun", "nitro cold brew", "çekirdek satışı", "tatlı"],
    description:
      "Kendi kavurduğu çekirdekler, sessiz çalışma katı ve hızlı wifi. Öğrenci dostu fiyatlar.",
    hours: [{ days: "Her gün", time: "08:00 – 23:00", openNow: true }],
    photos: [img("dem1"), img("dem2")],
    services: [
      { name: "Filtre Kahve", price: 120, unit: "₺" },
      { name: "Kahvaltı Tabağı", price: 280, unit: "₺" },
    ],
    reviews: [
      { id: "r1", author: "Ece B.", rating: 5, date: "4 gün önce", text: "Çalışmak için en iyi kafe, priz bol, kahve taze.", helpful: 16 },
    ],
    premium: false,
    verified: true,
    distanceKm: 3.0,
    yearsActive: 5,
    employees: "10–20",
    languages: ["Türkçe", "İngilizce"],
    acceptsAppointment: false,
    acceptsQuote: false,
  },
  {
    id: "kompass-metal",
    name: "Kompass Metal San. Tic. A.Ş.",
    category: "ev-hizmet",
    subcategory: "B2B Endüstriyel Tedarik",
    city: "Bursa",
    district: "Nilüfer",
    address: "NOSAB 12. Sok. No:7",
    phone: "0224 411 00 00",
    rating: 4.5,
    reviewCount: 210,
    priceLevel: 2,
    tags: ["B2B", "toptan", "ihracat", "ISO 9001"],
    description:
      "Kompass/D&B tarzı B2B profil: sac işleme, lazer kesim ve toptan metal tedarik. 14 ülkeye ihracat, ISO 9001.",
    hours: [{ days: "Pzt–Cmt", time: "08:00 – 18:00", openNow: true }],
    photos: [img("metal1"), img("metal2")],
    services: [
      { name: "Lazer Kesim (saat)", price: 1800, unit: "₺" },
      { name: "Toptan Sac Tedarik", price: 0, unit: "₺" },
    ],
    reviews: [
      { id: "r1", author: "Endüstriyel Tedarik A.Ş.", rating: 5, date: "1 ay önce", text: "Teslimat takvimi şaşmadı, kalite raporları düzenli.", helpful: 8 },
    ],
    premium: false,
    verified: true,
    distanceKm: 15.0,
    yearsActive: 22,
    employees: "100–250",
    languages: ["Türkçe", "İngilizce", "Almanca"],
    acceptsAppointment: false,
    acceptsQuote: true,
    b2b: { founded: 2003, sector: "Metal İşleme", exportMarkets: ["Almanya", "İtalya", "Polonya"] },
  },
  {
    id: "yesil-vadi",
    name: "Yeşil Vadi Peyzaj & Bahçe",
    category: "ev-hizmet",
    subcategory: "Peyzaj",
    city: "İstanbul",
    district: "Sarıyer",
    address: "Maslak Mah. No:3",
    phone: "0212 276 40 40",
    rating: 4.7,
    reviewCount: 640,
    priceLevel: 2,
    tags: ["ücretsiz keşif", "otomatik sulama", "villa bahçesi", "bakım anlaşması"],
    description:
      "Villa bahçe tasarımı, otomatik sulama ve düzenli bakım anlaşmaları. Ücretsiz keşif + 3D tasarım.",
    hours: [{ days: "Pzt–Cmt", time: "09:00 – 18:00", openNow: true }],
    photos: [img("yesil1"), img("yesil2")],
    services: [
      { name: "Keşif + 3D Tasarım", price: 0, unit: "₺" },
      { name: "100m² Bahçe Kurulumu", price: 95000, unit: "₺" },
    ],
    reviews: [
      { id: "r1", author: "Nil K.", rating: 5, date: "3 hafta önce", text: "Bahçemiz dergiden çıkmış gibi oldu.", helpful: 10 },
    ],
    premium: false,
    verified: true,
    distanceKm: 9.9,
    yearsActive: 13,
    employees: "10–20",
    languages: ["Türkçe"],
    acceptsAppointment: false,
    acceptsQuote: true,
  },
];

export const POPULAR_SEARCHES = [
  "Kadıköy'de pazar açık kuaför",
  "7/24 tesisatçı yakınımda",
  "Uygun fiyatlı implant",
  "Şehirlerarası nakliyat teklifi",
  "Kahvaltı yapılacak teraslı restoran",
  "Acil veteriner",
];

export function categoryLabel(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

export function priceText(level: number) {
  return "₺".repeat(level) + "·".repeat(3 - level);
}
