export type PageStatus = "taslak" | "incelemede" | "yayinda" | "arsiv"
export type PageGroup = "kurumsal" | "hukuk"

export type Block =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "a"; href: string; label: string }
  | { type: "img"; src: string; alt: string }

export type SitePage = {
  id: string
  slug: string
  title: string
  summary: string
  source: string
  blocks: Block[]
  seoTitle: string
  seoDescription: string
  canonical: string
  status: PageStatus
  publishedAt: string
  effectiveAt: string
  updatedAt: string
  version: string
  updatedBy: string
  footer: boolean
  group: PageGroup
  order: number
  legal: boolean
  index: boolean
  related: string[]
}

export type FaqItem = {
  id: string
  category: string
  question: string
  answer: string
  order: number
  status: PageStatus
  related: string
}

export type PageVersion = {
  pageId: string
  version: string
  at: string
  by: string
  title: string
  source: string
  status: PageStatus
  effectiveAt: string
}

export type Consent = {
  id: string
  accountId: string
  pageId: string
  version: string
  kind: "uyelik" | "pazarlama"
  accepted: boolean
  at: string
  context: "kayit"
}

export const pageStatuses: PageStatus[] = ["taslak", "incelemede", "yayinda", "arsiv"]
export const contentPaths = [
  "/hakkimizda",
  "/vizyon-misyon",
  "/nasil-calisir",
  "/sss",
  "/yasal-uyarilar",
  "/uyelik-sozlesmesi",
  "/uyelik-sozlesmesi-iade",
  "/iade-cayma",
  "/kullanim-kosullari",
  "/pazarlama-politikasi",
  "/gizlilik-cerez-politikasi",
  "/kvkk-aydinlatma-metni",
]

const stamp = "2026-10-14"
const legalNote =
  "Bu metin Pinwego taslağıdır. Tüzel kişi unvanı, MERSİS numarası, ticaret sicili ve açık adres bu tarihte yoktur. Hukuk incelemesi tamamlanmadan kesin metin sayılmaz."

function clip(value: string, max: number) {
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
}

export function safeHref(value: string) {
  const href = value.trim()
  if (href.startsWith("/") && !href.startsWith("//") && !href.includes("..") && !href.includes("\\") && href.length <= 160) return href
  if (/^https:\/\/(www\.)?pinwego\.com(\/|$)/.test(href) && href.length <= 200) return href
  return ""
}

export function parseBlocks(source: string): Block[] | null {
  if (typeof source !== "string" || source.length > 20000 || /[<>]/.test(source)) return null
  const blocks: Block[] = []
  let list: string[] | null = null
  const flush = () => {
    if (list?.length) blocks.push({ type: "ul", items: list })
    list = null
  }
  for (const raw of source.split("\n")) {
    const line = raw.trim()
    if (!line) {
      flush()
      continue
    }
    if (line.startsWith("## ")) {
      flush()
      const text = clip(line.slice(3), 160)
      if (text) blocks.push({ type: "h2", text })
      continue
    }
    if (line.startsWith("- ")) {
      if (!list) list = []
      const item = clip(line.slice(2), 400)
      if (item) list.push(item)
      continue
    }
    const image = line.match(/^!\[([^\]]{0,80})\]\(([^)]{1,160})\)$/)
    if (image) {
      flush()
      const src = image[2]
      if (!src.startsWith("/photos/") || src.includes("..")) return null
      blocks.push({ type: "img", src, alt: clip(image[1], 80) || "görsel" })
      continue
    }
    const link = line.match(/^\[([^\]]{1,120})\]\(([^)]{1,200})\)$/)
    if (link) {
      flush()
      const href = safeHref(link[2])
      if (!href) return null
      blocks.push({ type: "a", href, label: clip(link[1], 120) })
      continue
    }
    flush()
    const text = clip(line, 900)
    if (text) blocks.push({ type: "p", text })
  }
  flush()
  if (!blocks.length || blocks.length > 80) return null
  return blocks
}

function page(input: {
  slug: string
  title: string
  summary: string
  source: string
  seoDescription: string
  group: PageGroup
  order: number
  legal?: boolean
  footer?: boolean
  related?: string[]
}): SitePage {
  const blocks = parseBlocks(input.source)
  if (!blocks) throw new Error(`sayfa ayrışmadı: ${input.slug}`)
  return {
    id: input.slug,
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    source: input.source.trim(),
    blocks,
    seoTitle: `${input.title} | Pinwego`,
    seoDescription: input.seoDescription,
    canonical: `https://pinwego.com/${input.slug}`,
    status: "yayinda",
    publishedAt: stamp,
    effectiveAt: stamp,
    updatedAt: stamp,
    version: "1.0",
    updatedBy: "taslak",
    footer: input.footer !== false,
    group: input.group,
    order: input.order,
    legal: input.legal === true,
    index: true,
    related: input.related ?? [],
  }
}

export const seedPages: SitePage[] = [
  page({
    slug: "hakkimizda",
    title: "Hakkımızda",
    summary: "Pinwego, işletme keşfi ve dijital görünürlük için bir rehberdir.",
    seoDescription: "Pinwego işletmelerin bulunmasını ve kullanıcıların aradıkları hizmete ulaşmasını kolaylaştıran bir keşif rehberidir.",
    group: "kurumsal",
    order: 10,
    related: ["nasil-calisir", "vizyon-misyon", "sss"],
    source: `
Pinwego, işletmelerin dijital ortamda daha kolay bulunmasını ve kullanıcıların ihtiyaç duydukları işletme ile hizmete daha kısa yoldan ulaşmasını amaçlayan bir keşif ve işletme rehberi platformudur.
Platform; işletme profilleri, hizmet özeti, iletişim kanalları, kampanyalar ve dijital kartvizit ile QR kod araçlarını bir arada tutar. Amaç, işletme ile potansiyel müşteri arasında dijital bir köprü kurmaktır.
İşletme, profilini yayınlayarak ne yaptığını ve nerede olduğunu anlatır. Kullanıcı arama, kategori ve konum üzerinden kayıtlara bakar. İletişim, işletmenin profilde açtığı kanallardan kurulur.
Pinwego bir pazar yeri değildir. Sipariş, ödeme veya teslimat işletme ile kullanıcı arasındadır. Rehberdeki örnek kayıtlar ürünü göstermek için durur. İşletme sahibinin eklediği kayıt ayrıca işaretlenir.
İletişim için destek@pinwego.com adresi kullanılır. Satış soruları satis@pinwego.com adresine yazılabilir. Bu sayfadaki anlatım, sitede fiilen çalışan araçlarla sınırlıdır.
[Nasıl çalışır](/nasil-calisir)
[Sıkça sorulan sorular](/sss)
`,
  }),
  page({
    slug: "vizyon-misyon",
    title: "Vizyon ve misyon",
    summary: "Pinwego'nun yönü ve bugün hangi değer için çalıştığı.",
    seoDescription: "Pinwego'nun vizyonu, misyonu ve değerleri: erişilebilir keşif, şeffaf ücret ve güvenilir işletme bilgisi.",
    group: "kurumsal",
    order: 20,
    related: ["hakkimizda", "nasil-calisir"],
    source: `
## Vizyonumuz
İşletmelerin ve kullanıcıların güvenilir, erişilebilir ve anlaşılır biçimde buluşabildiği, Türkiye'den başlayıp dünyaya açık bir dijital keşif rehberi olmak.
## Misyonumuz
İşletmenin dijital görünürlüğünü, hizmet anlatımını ve müşterisine ulaşmasını kolaylaştıran araçlar sunmak. Kullanıcının aradığı işletmeyi kategori, konum ve profil üzerinden daha bilinçli seçmesini sağlamak.
## Değerlerimiz
- Erişilebilirlik: Keşfi sade tutmak ve hesabı olmayan ziyaretçinin rehberi izlemesine izin vermek.
- Şeffaflık: Ücretli bir paket satışta değilse satıştaymış gibi yazmamak. Örnek kayıt ile işletme kaydını ayırmak.
- Güven: Hesap güvenliği, hatalı bilgi bildirimi ve aydınlatma metnini gizlememek.
- Yenilikçilik: Arama, QR kod ve dijital kartvizit gibi araçları ürünün gerçek haline göre sunmak.
- Sürdürülebilirlik: İşletme için bir gecelik vitrin değil, güncellenebilir bir profil hedeflenir.
Bu değerler bir reklam vaadi değildir. Doğrulanmamış başarı, kullanıcı sayısı veya kazanç iddiası yayınlanmaz.
[Hakkımızda](/hakkimizda)
`,
  }),
  page({
    slug: "nasil-calisir",
    title: "Nasıl çalışır",
    summary: "Keşiften işletme kaydına Pinwego'da atılacak adımlar.",
    seoDescription: "Pinwego'da işletme arama, profil inceleme, iletişim, kampanya, kayıt ve QR kart adımları.",
    group: "kurumsal",
    order: 30,
    related: ["sss", "listele", "uyelik-sozlesmesi"],
    source: `
## 1. İşletmeleri keşfedin
Aradığınız işi yazın. Kategori, şehir ve filtreler mevcut kayıtlarda çalışır. Konum, seçtiğiniz il veya semte göre daralır. Rehberde hem örnek katalog hem işletme sahibinin eklediği kayıt bulunabilir.
## 2. Profili inceleyin
İşletme sayfasında tanıtım, hizmet, görsel ve açık olan iletişim seçenekleri durur. Bilgi işletme tarafından yazılmış, katalog örneği olarak hazırlanmış veya harici bir kaynaktan aktarılmış olabilir. Güncelliği her kayıt için ayrıca garanti edilmez.
## 3. İletişim kurun
Telefon, site veya yol tarifi profilde açıksa oradan ilerlersiniz. Yol tarifi Google Haritalar'ı açar. Misafir oturumunda iletişim kapalıdır; müşteri hesabı gerekir. Mesaj, randevu veya teklif talebi işletmeye gider. Pinwego siparişi teslim etmez.
## 4. Kampanyalara bakın
Yayındaki kampanyanın tarihi, koşulu ve varsa kodu kartında yazar. Panelden açılan yeni kampanya bu tarayıcıda durur. Örnek kampanyalar ürünle birlikte gelir. Süresi veya koşulu belirsiz bir ilanı kesin indirim saymayın.
## 5. İşletmenizi ekleyin
İşletme hesabı açın, ardından işletme ekle formunu kullanın. Kayıt sunucuya yazılır ve aramada görünür. Doğrulama ve öne çıkarma yönetici onayından sonra açılır. Yönetici bir işletme adına kayıt oluşturursa bu, o işletmenin reklam onayı verdiği anlamına gelmez.
## 6. Dijital kart ve QR
İşletme sayfasından QR kart üretilebilir. Kod, o işletmenin Pinwego sayfasına gider. Baskı dosyası bu tarayıcıda hazırlanır. Okutma sayacı da bu tarayıcıdadır; başka bir telefonun okutması aynı sayaca yazılmaz.
Bazı adımlar üyelik ister. Ücretli paket şu an satışta değildir. İletişim bilgisi müşteri hesabı olmadan açılmaz.
[İşletme ekle](/listele)
[Sıkça sorulan sorular](/sss)
`,
  }),
  page({
    slug: "sss",
    title: "Sıkça sorulan sorular",
    summary: "Üyelik, işletme kaydı, doğrulama, kampanya, QR ve gizlilik soruları.",
    seoDescription: "Pinwego hakkında kategorilere ayrılmış sorular ve kısa cevaplar.",
    group: "kurumsal",
    order: 40,
    related: ["nasil-calisir", "kvkk-aydinlatma-metni", "iade-cayma"],
    source: `
Sorular konuya göre ayrılmıştır. Cevaplar bu sürümde çalışan hali anlatır. Ücretli paket, resmi belge doğrulaması veya ticari ileti gönderimi yoksa yok diye yazılır.
Yeni bir soru yönetim panelindeki içerik bölümünden eklenebilir. Yayında olmayan soru bu sayfada görünmez.
[KVKK aydınlatma metni](/kvkk-aydinlatma-metni)
[İade ve cayma](/iade-cayma)
`,
  }),
  page({
    slug: "yasal-uyarilar",
    title: "Yasal uyarılar",
    summary: "Rehberin sınırı, işletme beyanı ve hatalı içerik bildirimi.",
    seoDescription: "Pinwego yasal uyarıları: bilgi kaynağı, kampanya, üçüncü taraf bağlantı ve bildirim yolu.",
    group: "hukuk",
    order: 50,
    legal: true,
    related: ["kullanim-kosullari", "kvkk-aydinlatma-metni"],
    source: `
${legalNote}
## Bilginin kaynağı
Rehberde iki tür kayıt vardır. Örnek katalog, ürünü göstermek için hazırlanmıştır. İşletme kaydı, işletme hesabı veya yönetici tarafından eklenir. İletişim, fiyat, stok, saat ve kampanya bilgisi ilgili kaydın sahibinin beyanıdır veya örnek metindir. Pinwego her kaydı yayın anında yerinde doğrulamaz.
## İşletme beyanı
İşletme, yayınladığı unvan, yetki, vergi, hizmet ve kampanya bilgisinden kendisi sorumludur. Yönetici ekranından bir işletme adına açılan kayıt, o işletmenin üyelik veya reklam onayını göstermez. Yetki belgesi bu sürümde tarayıcıda saklanır; sunucuya belge dosyası yüklenmez.
## Kampanya, fiyat ve stok
Kartta yazan koşul, tarih ve kısıt geçerlidir. Stok ve fiyat işletmede değişebilir. Pinwego tahsilat yapmaz ve kampanyayı işletme adına ifa etmez.
## Üçüncü taraf siteler
Yol tarifi, işletme sitesi ve sosyal bağlantı Pinwego dışına çıkar. Açılan sitenin içeriği ve çerezleri o siteye aittir.
## Hukuka uygun kullanım
Platform yasa dışı hizmet, yanıltıcı ticaret, hak ihlali veya spam için kullanılamaz. Ayrıntı kullanım koşullarındadır.
## Hatalı içerik
Hatalı veya yanıltıcı bir kayıt için destek@pinwego.com adresine işletme adı, sayfa bağlantısı ve düzeltme notu yazın. Bildirim incelenerek yayın durumu güncellenebilir. İnceleme süresi kaydın riskine göre değişir.
## Hizmet sınırı
Pinwego arama, profil, hesap, QR kart ve bu tarayıcıdaki kampanya aracını sunar. Ücretli paket satışı, SMS, telefonla arama ve otomatik sipariş yoktur. Sorumluluk, somut olayın niteliğine ve platformun o içerik üzerindeki fiili etkisine göre değerlendirilir. Her durumda sorumluluğu kaldıran genel bir feragat yazılmaz.
[Kullanım koşulları](/kullanim-kosullari)
`,
  }),
  page({
    slug: "uyelik-sozlesmesi",
    title: "Üyelik sözleşmesi",
    summary: "Hesap türleri, güvenlik, içerik ve üyeliğin sona ermesi.",
    seoDescription: "Pinwego üyelik sözleşmesi taslağı: taraflar, hesap türleri, güvenlik ve fesih.",
    group: "hukuk",
    order: 60,
    legal: true,
    related: ["iade-cayma", "kullanim-kosullari", "kvkk-aydinlatma-metni"],
    source: `
${legalNote}
## Taraflar
Bu sözleşme, pinwego.com işletmecisi ile hesap açan kişi arasındadır. İşletmecinin ticaret unvanı ve sicil bilgisi oluştuğunda bu metne işlenecektir. O tarihe kadar taraf, destek@pinwego.com üzerinden ulaşılabilen site işletmecisidir.
## Tanımlar
- Misafir: Hesabı olmadan rehberi izleyen kişidir. İletişim ve kayıt işlemleri kapalıdır.
- Müşteri: Keşif, mesaj, talep ve kayıtlı işlemler için hesap açan kişidir.
- İşletme: Profil, işletme kaydı ve dijital kart için hesap açan yetkilidir.
- Yönetici: Site işletmecisinin ayrıca doğruladığı yönetim oturumudur. Herkese açık bir üyelik değildir.
## Hesap açma
Kayıt, bu sözleşmenin ve kullanım koşullarının onaylanmasıyla tamamlanır. Onay kutusu boş gelir. Pazarlama izni üyelik şartı değildir ve ayrı kutudadır.
Müşteri kaydında ad, iletişim, kimlik numarası ve doğum tarihi istenir. İşletme kaydında yetkili, vergi kimliği, vergi dairesi, şehir ve adres istenir. Belge dosyası bu sürümde yalnızca tarayıcıda kalır.
## Güvenlik
Şifre ve doğrulama kodu başkasıyla paylaşılmaz. Hesabın yetkisiz kullanıldığını düşünüyorsanız destek@pinwego.com adresine yazın ve şifreyi yenileyin. Şifre sıfırlama bağlantısı e-posta ile gelir.
## İşletme yetkisi
İşletme hesabını açan kişi, o unvan adına işlem yapmaya yetkili olduğunu beyan eder. Yönetici onayı, resmi bir sicil teyidi değildir. Doğrulama ve öne çıkarma işaretini yalnızca yönetici açar.
## Ücret
Bu sözleşmenin tarihinde ücretli paket satışı yoktur. Satış açılırsa bedel, süre, yenileme ve cayma koşulları ödeme ekranından önce iade sayfasında ve satış adımında ayrıca gösterilir. Yenileme, açık onay olmadan kendiliğinden başlatılmaz.
## İçerik ve fikri hak
Kullanıcının yüklediği metin ve görsel için kullanıcı, gerekli hakka sahip olduğunu kabul eder. Pinwego markası, arayüz ve örnek katalog işletmeciye aittir. İzinsiz marka kullanımı durdurulabilir.
## Şikayet
Hak ihlali veya yanıltıcı kayıt bildirimi destek@pinwego.com adresine yazılır. Bildirimde sayfa bağlantısı ve gerekçe bulunmalıdır.
## Askıya alma ve fesih
Yanlış beyan, güvenlik riski veya kullanım koşullarının ihlali halinde hesap askıya alınabilir. Kullanıcı üyeliğini destek@pinwego.com adresine yazarak kapatılmasını isteyebilir. Yasal olarak saklanması gereken kayıtlar, kapanıştan sonra ilgili süre boyunca tutulabilir. Kapanış, işletme ile kullanıcı arasındaki borçları ortadan kaldırmaz.
## Uyuşmazlık
Tüketici işlemi varsa tüketicinin yerleşim yerindeki tüketici hakem heyeti ve tüketici mahkemesi başvuru yolları açıktır. Ticari işletmeler arasındaki uyuşmazlıkta, emredici kurallar saklı kalmak üzere İstanbul mahkemeleri yetkilidir. Bu yetki kaydı, tüketiciyi kanundaki başvuru hakkından vazgeçirmez.
[İade ve cayma](/iade-cayma)
[Kullanım koşulları](/kullanim-kosullari)
`,
  }),
  page({
    slug: "uyelik-sozlesmesi-iade",
    title: "Üyelik ve iade",
    summary: "Üyelik sözleşmesi ile iade koşullarının ayrı metinlerine giden sayfa.",
    seoDescription: "Pinwego üyelik sözleşmesi ve iade koşulları ayrı sayfalarda durur.",
    group: "hukuk",
    order: 61,
    legal: true,
    footer: false,
    related: ["uyelik-sozlesmesi", "iade-cayma"],
    source: `
${legalNote}
Üyelik sözleşmesi ile iade ve cayma koşulları ayrı metinlerdir. Biri hesap açmayı, diğeri ileride satılacak dijital hizmetin bedelini düzenler.
Bu tarihte ücretli paket satışı yoktur. İade uygulanacak bir tahsilat bulunmadığından iade sayfası, satış açıldığında hangi kuralların işleyeceğini anlatır.
[Üyelik sözleşmesi](/uyelik-sozlesmesi)
[İade ve cayma koşulları](/iade-cayma)
`,
  }),
  page({
    slug: "iade-cayma",
    title: "İade ve cayma koşulları",
    summary: "Ücretli hizmet satışı başlamadan önce geçerli olacak cayma çerçevesi.",
    seoDescription: "Pinwego iade ve cayma taslağı. Ücretli paket bu tarihte satılmaz. Tüketici ve ticari müşteri ayrılır.",
    group: "hukuk",
    order: 70,
    legal: true,
    related: ["uyelik-sozlesmesi", "pazarlama-politikasi"],
    source: `
${legalNote}
## Bugün satış yok
Pinwego bu metnin tarihinde ücretli paket, abonelik veya dijital ürün satmaz. Tahsil edilen bir bedel olmadığı için iade kuyruğu da yoktur. Aşağıdaki kurallar, satış açıldığında tüketiciye gösterilecek çerçevenin taslağıdır. Satış ekranı bu metinle çelişirse, tüketici lehine olan emredici hüküm uygulanır.
## Tüketici
Mesafeli sözleşme ile tüketiciye dijital hizmet satılırsa, kanunundaki istisnalar saklı kalmak üzere genel cayma süresi 14 gündür. Süre, sözleşmenin kurulduğu günden başlar. Hizmetin ifasına tüketicinin açık onayı ile cayma süresi dolmadan başlanmışsa ve tüketici bu durumda cayma hakkını kaybedeceği konusunda bilgilendirilmişse, ilgili istisna ayrıca değerlendirilir.
Cayma talebi destek@pinwego.com adresine yazılır. Talepte hesap, hizmet ve tarih bulunur. Bedel, tahsilat yapılan araca iade edilir. İade için ayrıca bir hizmet bedeli kesilmez.
## Ticari müşteri
Tacir veya işletme yetkilisi ile kurulan sözleşme, tüketici işlemi olmayabilir. Bu durumda cayma hakkı kendiliğinden doğmaz. Satış açılırsa ticari müşteriye, tüketici hükümlerinin uygulanıp uygulanmadığı ödeme adımında açıkça yazılır.
## İstisnalar
Tüketicinin onayıyla tamamen ifa edilmiş dijital hizmet, kişiye özel hazırlanmış edim ve kanunda sayılan diğer istisnalar cayma dışında kalabilir. İstisna, satış anında somut hizmete göre belirtilir. Bütün dijital hizmetlere peşinen iade yapılmaz yazılmaz.
## Ücretsiz kayıt
İşletme rehberi kaydı ve müşteri hesabı bu tarihte ücretsizdir. Ücretsiz hesap için bedel iadesi doğmaz. Hesap kapatma talebi üyelik sözleşmesindeki yoldan ilerler.
[Üyelik sözleşmesi](/uyelik-sozlesmesi)
`,
  }),
  page({
    slug: "kullanim-kosullari",
    title: "Site kullanım koşulları",
    summary: "İzin verilen kullanım, yasaklar ve moderasyon.",
    seoDescription: "Pinwego kullanım koşulları: yasak kullanım, hesap güvenliği, moderasyon ve fikri hak.",
    group: "hukuk",
    order: 80,
    legal: true,
    related: ["uyelik-sozlesmesi", "yasal-uyarilar"],
    source: `
${legalNote}
Bu metin üyelik sözleşmesini tekrar etmez. Platformun günlük kullanım kurallarını tamamlar.
## İzin verilen kullanım
Rehberi incelemek, aramak, müşteri veya işletme hesabı açmak, işletme kaydı oluşturmak, profildeki iletişim kanallarını kullanmak ve QR kart üretmek serbesttir. Kullanım, yürürlükteki hukuka ve bu kurallara uygun olmalıdır.
## Yasaklar
- Sahte işletme, başkasının unvanı veya yetkisiz profil açmak.
- Yanıltıcı fiyat, stok, kampanya veya belge beyanı.
- Spam, zincir mesaj ve otomatik istek yağmuru.
- Hesabı paylaşmak, başkasının oturumuna girmek veya güvenlik doğrulamasını aşmaya çalışmak.
- Rehberi toplu kopyalayan bot, kazıma veya hizmeti kesintiye uğratan yük.
- Hakaret, ayrımcılık, fikri hak ihlali ve suç oluşturan içerik.
## Moderasyon
Yönetici, şikayet veya risk üzerine kaydı gizleyebilir, doğrulama işaretini kaldırabilir veya hesabı askıya alabilir. Karar, bildirimin somut haline göre verilir. Gizlenen işletme aramada görünmez.
## Bakım
Hizmet bakım, güncelleme veya arıza nedeniyle kesilebilir. Kesinti öncesi duyuru hedeflenir; acil güvenlik müdahalesinde duyuru sonra yapılabilir.
## Fikri mülkiyet
Pinwego adı, işareti ve arayüzü izinsiz kullanılamaz. Örnek fotoğrafların kaynağı katalogda belirtildiği gibi üçüncü taraf görseller olabilir.
## İşletme ile kullanıcı
Randevu, teklif, ücret ve ifa işletme ile kullanıcı arasındadır. Pinwego bu ilişkinin tarafı olmaz. Anlaşmazlık önce işletmeye, platformu ilgilendiren bir ihlal ise destek@pinwego.com adresine yazılır.
## İhlal
İhlalde içerik yayından kaldırılabilir, hesap sınırlanabilir ve gerektiğinde yetkili makamlara bildirim yapılabilir. Ağırlık, ihlalin tekrarına ve zararına göre değişir.
[Yasal uyarılar](/yasal-uyarilar)
`,
  }),
  page({
    slug: "pazarlama-politikasi",
    title: "Pazarlama politikası",
    summary: "Ticari ileti ile hizmet postasının ayrımı ve onayın isteğe bağlı oluşu.",
    seoDescription: "Pinwego pazarlama politikası: ticari ileti onayı ayrıdır, önceden işaretli değildir ve İYS kurulmadan kampanya postası gitmez.",
    group: "hukuk",
    order: 90,
    legal: true,
    related: ["gizlilik-cerez-politikasi", "kvkk-aydinlatma-metni"],
    source: `
${legalNote}
## İki ayrı posta
Hizmet postası; hesap doğrulama, şifre yenileme, güvenlik kodu ve işlemin tamamlandığına dair bildirimdir. Üyelik için gereklidir ve pazarlama iznine bağlı değildir.
Ticari ileti; kampanya, duyuru ve tanıtım postasıdır. 6563 sayılı Kanun kapsamındaki ticari elektronik ileti, ayrıca onay ister. Onay vermemek üyeliği engellemez.
## Bu tarihte ne gönderilir
Doğrulama, şifre ve yönetici güvenlik postası hesap@pinwego.com adresinden gidebilir. SMS, telefon araması ve önceden onaylı ticari e-posta gönderimi yoktur. İleti Yönetim Sistemi kaydı tamamlanmadan, onay verilmiş olsa bile kampanya postası gönderilmez.
## Onay nasıl durur
Kayıt formundaki kampanya kutusu boş gelir. İşaretlenirse hesap kimliği, metin sürümü ve zaman saklanır. İşaretlenmezse ret de aynı şekilde kayda geçer. Kutu önceden seçili yapılamaz.
## Ret
Onay sonradan destek@pinwego.com adresine yazılarak geri alınır. Ret, daha önce gitmiş bir hizmet postasını durdurmaz. Ticari gönderim başladığında iletide de ret yolu bulunur.
## İşletmeye yönelik tanıtım
Ücretli görünürlük paketi bu tarihte satılmaz. Satış açılırsa paket, sponsorlu kayıt ve reklam ayrı işaretlenir. Bir kaydın öne çıkan olması, o işletmenin iddiasını Pinwego'nun doğruladığı anlamına gelmez.
## Veri
Pazarlama tercihi, aydınlatma metnindeki amaçla ve yalnızca e-posta kanalı için tutulur. Üçüncü bir reklam ağına devredilmez.
[Gizlilik ve çerez politikası](/gizlilik-cerez-politikasi)
`,
  }),
  page({
    slug: "gizlilik-cerez-politikasi",
    title: "Gizlilik ve çerez politikası",
    summary: "Hangi verinin neden tutulduğu ve sitede gerçekten kullanılan çerezler.",
    seoDescription: "Pinwego gizlilik ve çerez politikası: hesap verisi, tarayıcıda kalan belgeler ve zorunlu ile ziyaret çerezleri.",
    group: "hukuk",
    order: 100,
    legal: true,
    related: ["kvkk-aydinlatma-metni", "pazarlama-politikasi"],
    source: `
${legalNote}
Bu sayfa aydınlatma metninin yerine geçmez. Veri sorumlusunun kimliği ve haklar KVKK sayfasındadır. Burada veri türleri ve çerezler sade dille anlatılır.
## Tutulan veriler
- Hesap: ad, e-posta, telefon, rol ve şifrenin tek yönlü özeti.
- Müşteri kaydı: kimlik numarası ve doğum tarihi sunucuda durur.
- İşletme kaydı: yetkili, vergi kimliği, vergi dairesi, şehir ve adres sunucuda durur.
- İşletme ilanı: ad, semt, telefon, özet ve konum, ilanı açan hesabın kimliğiyle birlikte sunucuda durur.
- Belge dosyası: kimlik, vergi levhası ve benzeri yüklemeler bu tarayıcıda kalır. Sunucuya belge dosyası yazılmaz.
- Onay kaydı: hesap kimliği, metin sürümü, kabul veya ret ve zaman. E-posta bu kayda yazılmaz.
- Teknik kayıt: hız sınırı için kısa süreli bellek sayacı. Ziyaret ölçümü ayrıca ve yalnızca onayla açılır. İşletme sayfası görüntülenmesi, rastgele bir tarayıcı işaretiyle otuz dakikada bir sayılır; IP adresi bu sayaca yazılmaz.
## Amaç
Kayıt, güvenlik, destek, ilanın yayını ve yasal ispat. Pazarlama ancak ayrı onay varsa ve gönderim gerçekten başlarsa kullanılır.
## Paylaşım
Barındırma ve e-posta altyapısı Cloudflare üzerindedir. Yol tarifi Google Haritalar'a çıkar; o geçiş kullanıcının kendi tıklamasıdır. Reklam ağı veya veri satışı yoktur. Güvenlik doğrulaması açıksa Cloudflare Turnstile çalışır. Üretim ortamında bu doğrulama kapalı olabilir.
## Süre
Hesap, kapatma talebine kadar durur. Posta günlükleri kısa süre tutulur. Yönetici giriş kodu on dakika ve tek kullanımlıktır. Onay kayıtları, hangi metnin kabul edildiğini göstermek için silinmeden saklanır. Yeni metin, eski kabulün üzerine yazılmaz.
## Çerezler
Zorunlu çerezler oturum içindir. Ziyaret çerezi reklam değildir ama zorunlu da değildir. Onay verene kadar yazılmaz.
- pinwego_acct: girişten sonra hesap oturumu. HttpOnly, SameSite=Lax, 14 gün.
- pinwego_admin: yönetici oturumu. HttpOnly, SameSite=Lax, 12 saat.
- pinwego_visit: anonim ziyaret sayımı. HttpOnly. Yalnızca ziyaret ölçümünü kabul ederseniz yazılır.
- pinwego_gorunum: işletme sayfasında aynı tarayıcının otuz dakika içinde yeniden sayılmaması için rastgele işaret. HttpOnly, yaklaşık bir yıl. Ad, e-posta ve IP yazılmaz. Reklam çerezi değildir.
Reklam çerezi, üçüncü taraf analitik çerezi ve profilleme çerezi kullanılmaz. Dil, rehber ve kampanya tercihleri çerez değil, bu tarayıcının yerel kaydıdır.
## Tercih
Sayfanın altındaki çubukta ziyaret ölçümünü kabul edebilir veya yalnızca zorunlu çerezlerle devam edebilirsiniz. Seçim bu tarayıcıda durur ve aynı yerden değiştirilebilir.
[KVKK aydınlatma metni](/kvkk-aydinlatma-metni)
`,
  }),
  page({
    slug: "kvkk-aydinlatma-metni",
    title: "KVKK aydınlatma metni",
    summary: "Veri sorumlusunun kimliği, amaçlar, hukuki sebepler ve başvuru yolu.",
    seoDescription: "Pinwego KVKK aydınlatma metni taslağı: veri sorumlusu, amaç, sebep, aktarım ve ilgili kişi hakları.",
    group: "hukuk",
    order: 110,
    legal: true,
    related: ["gizlilik-cerez-politikasi", "pazarlama-politikasi"],
    source: `
${legalNote}
Bu metin 6698 sayılı Kanun'un aydınlatma yükümlülüğüne göre hazırlanmış bir taslaktır. Açık rıza gereken işlemler, bu metinden ayrı ve o işleme özel alınır.
## Veri sorumlusu
Veri sorumlusu, pinwego.com sitesini işleten gerçek kişidir. Tüzel kişi unvanı, MERSİS, ticaret sicil numarası ve açık adres bu tarihte yoktur. Başvuru adresi destek@pinwego.com'dur.
## Kişisel veriler
- Kimlik ve iletişim: ad, e-posta, telefon. Müşteri kaydında kimlik numarası ve doğum tarihi.
- İşletme: yetkili adı, vergi kimliği, vergi dairesi, şehir ve adres.
- İşlem: ilan içeriği, sözleşme sürümünün kabulü, pazarlama tercihi, destek yazışması.
- Teknik: güvenlik için kısa süreli istek sayacı. Ziyaret ölçümü yalnızca ayrıca onaylanırsa.
Belge görselleri sunucuya alınmaz. Özel nitelikli veri istenmez. Kimlik numarası, kimliği doğrulama amacıyla işlenir; pazarlama için kullanılmaz.
## Amaçlar
Hesabın açılması ve sürdürülmesi, işletme ilanının yayınlanması, güvenliğin sağlanması, destek talebinin cevaplanması, onayın ispatı ve mevzuattan doğacak yükümlülükler.
## Hukuki sebepler
- Bir sözleşmenin kurulması veya ifası: hesap ve kullanıcının yayınlanmasını istediği ilan.
- Hukuki yükümlülük: doğduğunda saklama ve yetkili merci talebi.
- Meşru menfaat: kötüye kullanımı önlemek ve hizmeti ayakta tutmak. Bu menfaat, kişinin temel haklarının önüne geçtiği iddiasıyla kullanılmaz.
- Açık rıza: ticari ileti ve zorunlu olmayan ziyaret çerezi. Rıza verilmemesi hizmetin sözleşmesel kısmını kapatmaz.
## Aktarım
Altyapı hizmeti için Cloudflare'e, e-posta iletimi için aynı işletmecinin e-posta hizmetine aktarım yapılabilir. Yurt dışı aktarım, kullanılan altyapının sunucu bölgesine bağlıdır ve satış amacıyla yapılmaz. Reklam ağına aktarım yoktur. Kullanıcı harita bağlantısını açarsa veri, o andan sonra ilgili harita hizmetinin kurallarına tabi olur.
## Yöntem
Veriler kayıt formu, ilan formu, çerez tercihi ve destek postası üzerinden otomatik veya kısmen otomatik yollarla toplanır.
## Haklar
Kanunun 11. maddesindeki haklar kullanılabilir: öğrenme, düzeltme, silme veya yok etme, aktarılanlara bildirilmesini isteme, otomatik analize itiraz ve zararın giderilmesini talep. Pinwego otomatik bir karar ile üyelik doğuran bir sistem çalıştırmaz.
Başvuru destek@pinwego.com adresine yazılır. Kimliği doğrulamak için makul ek bilgi istenebilir. Cevap, kanundaki süre içinde verilir. Başvuru hakkı, Kişisel Verileri Koruma Kurulu'na şikayet yolunu kapatmaz.
## Metin sürümü
Yürürlük tarihi sayfanın başında durur. Metin değişince sürüm numarası artar. Eski kabul kaydı eski sürümü göstermeye devam eder.
[Gizlilik ve çerez politikası](/gizlilik-cerez-politikasi)
`,
  }),
]

export const seedFaqs: FaqItem[] = [
  { id: "nedir", category: "Genel", question: "Pinwego nedir?", answer: "İşletme arayan kişi ile bulunmak isteyen işletmeyi aynı rehberde buluşturan bir keşif platformudur. Sipariş veya ödeme aracı değildir.", order: 10, status: "yayinda", related: "/hakkimizda" },
  { id: "ucretsiz", category: "Genel", question: "Pinwego ücretsiz mi?", answer: "Rehberi izlemek, müşteri hesabı ve işletme kaydı bu tarihte ücretsizdir. Ücretli paket satışı yoktur.", order: 20, status: "yayinda", related: "/iade-cayma" },
  { id: "kayit", category: "Kullanıcı hesabı", question: "Nasıl kayıt olurum?", answer: "Hesap sayfasından müşteri veya işletme kaydını seçin. Üyelik sözleşmesi kutusu boş gelir. Onaylamadan kayıt açılmaz. Pazarlama kutusu ayrıca ve isteğe bağlıdır.", order: 30, status: "yayinda", related: "/uyelik-sozlesmesi" },
  { id: "sifre", category: "Kullanıcı hesabı", question: "Şifremi nasıl yenilerim?", answer: "Giriş ekranındaki şifre yenileme adımı e-posta adresinize tek kullanımlık bağlantı gönderir. Bağlantı süreyle sınırlıdır.", order: 40, status: "yayinda", related: "/hesap" },
  { id: "ekle", category: "İşletme kaydı", question: "İşletmemi nasıl eklerim?", answer: "Önce işletme hesabı açın ve e-postayı doğrulayın. Sonra İşletme ekle formunu doldurun. Kayıt sunucuya yazılır, aramada ve işletme sayfasında görünür. Eski oturumda form yeniden giriş isteyebilir.", order: 50, status: "yayinda", related: "/listele" },
  { id: "yonetim", category: "İşletme kaydı", question: "İşletmemi kim yönetebilir?", answer: "Hesabı açan yetkili yönetir. Yönetici, doğrulama ve öne çıkarma işaretini değiştirebilir. Yönetici bir kayıt açarsa bu, işletmenin reklam onayı verdiği anlamına gelmez.", order: 60, status: "yayinda", related: "/yasal-uyarilar" },
  { id: "dogrulama", category: "Doğrulama", question: "İşletme doğrulaması nasıl yapılır?", answer: "Doğrulama işareti yönetim panelinden açılır. Bu sürüm, yüklenen belgeleri sunucuda inceleyen resmi bir sicil teyidi değildir. Belgeler tarayıcıda kalır.", order: 70, status: "yayinda", related: "/nasil-calisir" },
  { id: "kampanya", category: "Kampanyalar", question: "Kampanya nasıl yayınlanır?", answer: "Paneldeki kampanya bu tarayıcıda saklanır. Örnek kampanyalar ürünün içindedir. Kartta yazan tarih ve koşul geçerlidir.", order: 80, status: "yayinda", related: "/kampanyalar" },
  { id: "sure", category: "Kampanyalar", question: "Süresi dolan kampanya ne olur?", answer: "Tarihi geçen kampanya güncel ilan gibi sunulmamalıdır. Karttaki süre esas alınır. Tarayıcıdaki panel kaydı, o tarayıcıdan silinene kadar yerelde durabilir.", order: 90, status: "yayinda", related: "/yasal-uyarilar" },
  { id: "qr", category: "QR ve dijital kartvizit", question: "QR kod ne işe yarar?", answer: "Kod, işletmenin Pinwego sayfasını açar. Baskı dosyası bu tarayıcıda üretilir. Okutma günlüğü bu tarayıcıda durur. Sayfa görüntülenmesi sunucuda, reklamsız ve IP’siz sayılır.", order: 100, status: "yayinda", related: "/nasil-calisir" },
  { id: "paylas", category: "QR ve dijital kartvizit", question: "İşletme bilgileri nasıl paylaşılır?", answer: "Profildeki Paylaş, bağlantıyı WhatsApp, Instagram ve diğer kanallara götürür. Paylaşım sayısı görüntülenmeden ayrıdır. Misafir iletişim ayrıntısını görmez.", order: 110, status: "yayinda", related: "/nasil-calisir" },
  { id: "paket", category: "Ücretli paketler", question: "Paketler nelerdir?", answer: "Satışta olan bir paket yoktur. Öne çıkarma, yönetici işaretidir ve ücretli bir abonelik değildir.", order: 120, status: "yayinda", related: "/iade-cayma" },
  { id: "iptal", category: "Ücretli paketler", question: "Aboneliğimi nasıl yenilerim veya iptal ederim?", answer: "Yenilenecek bir abonelik yoktur. İleride satış açılırsa iptal ve cayma, ödeme adımında ve iade sayfasında ayrıca yazılır.", order: 130, status: "yayinda", related: "/iade-cayma" },
  { id: "veri", category: "Gizlilik", question: "Verilerim nasıl işlenir?", answer: "Amaç, sebep ve aktarım KVKK aydınlatma metninde anlatılır. Pazarlama izni ayrıdır. Ziyaret çerezi onay verilmeden yazılmaz. İşletme sayfasındaki görüntülenme işareti sayaç şişmesin diye yazılır; reklam çerezi değildir.", order: 140, status: "yayinda", related: "/kvkk-aydinlatma-metni" },
  { id: "kapat", category: "Gizlilik", question: "Hesabımı nasıl kapatırım?", answer: "destek@pinwego.com adresine hesap e-postanızla yazın. Panelde görülen yerel silme, sunucudaki hesabı kendiliğinden kaldırmaz. Saklanması gereken onay kaydı tutulabilir.", order: 150, status: "yayinda", related: "/uyelik-sozlesmesi" },
  { id: "hata", category: "Destek", question: "Hatalı işletme bilgisi nasıl bildirilir?", answer: "İşletme adı, sayfa bağlantısı ve düzeltme notuyla destek@pinwego.com adresine yazın.", order: 160, status: "yayinda", related: "/yasal-uyarilar" },
  { id: "sikayet", category: "Destek", question: "Şikayetimi nereye iletebilirim?", answer: "Platformu ilgilendiren şikayet destek@pinwego.com adresinedir. Tüketici uyuşmazlığında kanunundaki başvuru yolları açıktır.", order: 170, status: "yayinda", related: "/uyelik-sozlesmesi" },
]

export function publishedPages(pages: SitePage[]) {
  return pages.filter((item) => item.status === "yayinda").sort((a, b) => a.order - b.order)
}

export function footerPages(pages: SitePage[]) {
  return publishedPages(pages).filter((item) => item.footer)
}

export function publishedFaqs(items: FaqItem[]) {
  return items.filter((item) => item.status === "yayinda").sort((a, b) => a.order - b.order)
}

export function bumpVersion(version: string) {
  const [major, minor] = version.split(".").map((part) => Number(part))
  if (!Number.isFinite(major) || !Number.isFinite(minor)) return "1.1"
  return `${major}.${minor + 1}`
}
