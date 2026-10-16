import { allSectors } from "@/lib/sectors"
import type { CategoryId } from "@/lib/types"

export type NeedHint = {
  category: CategoryId
  categories: CategoryId[]
  focus: string
  phrases: string[]
  /** A priority hint wins even when a sector phrase also matches ("sigorta attı" is electrical, not insurance). */
  priority?: boolean
}

function hint(categories: CategoryId[], focus: string, phrases: string[], priority = false): NeedHint {
  return { category: categories[0], categories, focus, phrases, priority }
}

/**
 * Everyday sentences that do not name a trade. Phrases are folded (lowercase, ASCII) and matched as
 * substrings of the folded query. Longer matches win.
 */
export const needHints: NeedHint[] = [
  hint(["enerji"], "kombi", ["sicak olmuyor", "isinmiyor", "ev soguk", "evim soguk", "petek soguk", "petekler isinmiyor", "kalorifer soguk", "kombi ariza", "kombi calismiyor", "kombi su akitiyor", "sicak su gelmiyor", "sicak su yok", "dogalgaz kokusu", "kombi bakim"], true),
  hint(["usta"], "tesisat", ["su patladi", "boru patladi", "su borusu", "su akiyor", "su kacagi", "musluk tikan", "lavabo tikan", "gider tikan", "tuvalet tikan", "klozet tikan", "kanalizasyon tikan", "musluk damlatiyor", "musluk akitiyor", "sifon bozuk", "petek akitiyor", "su basti", "su tesisati"], true),
  hint(["usta"], "elektrik", ["sigorta atti", "sigortalar atiyor", "sigortam atiyor", "sigorta atiyor", "elektrik kesildi", "elektrik yok", "elektrikler gitti", "priz calismiyor", "priz yanmiyor", "lamba yanmiyor", "kisa devre", "avize takilacak", "elektrik ariza"], true),
  hint(["usta"], "kilit", ["cilingir", "kapida kaldim", "anahtar icerde kaldi", "anahtarim icerde", "kilit bozuldu", "kilit degisim", "kapi kilidi", "kapim acilmiyor", "kapi acilmiyor"]),
  hint(["usta"], "klima", ["klima sogutmuyor", "klima calismiyor", "klima bakim", "klima montaj", "klima gaz", "klima kokuyor"]),
  hint(["usta"], "tamir", ["beyaz esya", "camasir makinesi", "bulasik makinesi", "buzdolabi", "firin bozuldu", "makine bozuldu", "makinem bozuldu", "televizyon bozuldu", "tv bozuldu"]),
  hint(["teknoloji"], "web", ["web sitesi", "internet sitesi", "site yaptir", "e ticaret sitesi", "eticaret sitesi", "online magaza", "mobil uygulama yaptir", "uygulama yaptir", "yazilim yaptir", "web tasarim", "google da cikmak", "seo"], true),
  hint(["teknoloji"], "bilgisayar", ["bilgisayarim acilmiyor", "bilgisayar bozuldu", "laptop bozuldu", "laptop tamir", "virus temizle", "format at", "veri kurtarma"]),
  hint(["gsm"], "telefon", ["ekran kirildi", "ekranim kirildi", "telefonum bozuldu", "telefonum kirildi", "telefon ekrani", "sarj olmuyor", "batarya degisim", "telefon tamir", "ekran degisim"]),
  hint(["iletisim"], "internet", ["internetim kesildi", "internet kesildi", "internet yok", "internet yavas", "fiber bagla", "internet aboneligi", "modem bozuk", "wifi cekmiyor"], true),
  hint(["eglence", "cocuk", "yeme"], "aile", ["cocuklarla gide", "cocukla gide", "cocuklarla gidil", "cocuklarla gidecek", "hafta sonu cocuk", "cocuklarla ne yap", "cocuklar icin etkinlik", "aile ile gide", "ailece gide", "cocuklarla vakit"]),
  hint(["cocuk"], "bakici", ["bebek bakicisi", "cocuk bakicisi", "bakici ariyorum", "bakici lazim"]),
  hint(["finans"], "sigorta", ["kasko yaptir", "kasko", "trafik sigortasi", "konut sigortasi", "saglik sigortasi", "dask", "arac sigortasi", "araba sigortasi", "sigorta yaptir", "sigorta teklif", "police yenile", "tamamlayici saglik"]),
  hint(["finans"], "muhasebe", ["vergi", "beyanname", "sirket kurmak", "sirket kurulusu", "sirket acmak", "defter tutma", "e fatura", "mali musavir", "sgk"]),
  hint(["finans"], "kredi", ["kredi cekmek", "konut kredisi", "ihtiyac kredisi", "tasit kredisi", "kredi notu"]),
  hint(["hukuk"], "avukat", ["bosanma", "nafaka", "velayet", "icra takibi", "icralik", "miras davasi", "tazminat", "is davasi", "kira davasi", "tahliye", "sozlesme hazirla", "dava acmak"]),
  hint(["noter"], "noter", ["vekalet", "tasdik", "arac satisi noter", "imza beyani"]),
  hint(["ev"], "boya", ["duvar boya", "evi boyat", "ev boyat", "daire boyat", "badana", "alci", "kartonpiyer", "duvar kagidi"]),
  hint(["ev"], "parke", ["parke", "laminat", "zemin kaplama", "fayans", "banyo yenile", "mutfak yenile", "tadilat"]),
  hint(["temizlik"], "temizlik", ["koltuk yikama", "ev temizligi", "cam silme", "insaat sonrasi temizlik", "yorgan yikama", "hali yika", "detayli temizlik", "ofis temizligi", "merdiven temizligi"]),
  hint(["ilaclama"], "ilaclama", ["bocek", "hamam bocegi", "fare", "karinca", "tahtakurusu", "hasere", "pire", "sivrisinek", "ilaclama"]),
  hint(["ulasim"], "nakliye", ["evden eve", "tasinma", "tasinacagim", "esya tasima", "nakliyat", "sehirler arasi tasima"]),
  hint(["cekici"], "cekici", ["aracim calismiyor", "arabam calismiyor", "yolda kaldim", "aku bitti", "lastik patladi", "arabam bozuldu", "aracim bozuldu", "cekici lazim"]),
  hint(["oto"], "servis", ["arac bakim", "araba bakim", "periyodik bakim", "muayene oncesi", "lastik degisim", "kis lastigi", "yag degisim", "kaporta", "arabam ses yapiyor", "arac ses yapiyor", "fren sesi"]),
  hint(["kiralama"], "arac kiralama", ["arac kirala", "araba kirala", "gunluk arac", "rent a car", "kiralik araba", "kiralik arac"]),
  hint(["saglik"], "dis", ["dis agrisi", "disim agriyor", "dolgu", "implant", "dis teli", "kanal tedavisi", "dis cekimi", "dis beyazlatma", "20 lik dis", "dis hekimi", "disci"]),
  hint(["saglik"], "doktor", ["doktora git", "muayene ol", "check up", "checkup", "tahlil yaptir", "kan tahlili", "ultrason", "mr cektir"]),
  hint(["saglik"], "fizyoterapi", ["bel agrisi", "boyun agrisi", "sirt agrisi", "bel fitigi", "fizik tedavi", "fizyoterapi", "masaj terapi"]),
  hint(["saglik"], "diyetisyen", ["diyetisyen", "diyet", "kilo vermek", "zayiflamak", "beslenme programi"]),
  hint(["hastane"], "acil", ["acil servis", "hastaneye git", "en yakin hastane", "nobetci"]),
  hint(["eczane"], "eczane", ["nobetci eczane", "ilac almam", "recete yazdir", "ilac lazim"]),
  hint(["optik"], "gozluk", ["gozluk yaptir", "gozlugum kirildi", "numarali gozluk", "gunes gozlugu", "lens almak", "goz muayene"]),
  hint(["psikoloji"], "psikolog", ["psikolog", "terapi", "kaygi", "panik atak", "depresyon", "uyku sorunu", "cift terapisi", "psikiyatr"]),
  hint(["hayvan"], "veteriner", ["kedim hasta", "kopegim hasta", "veteriner", "asi yaptir", "pet kuafor", "kedi kumu", "kopek mamasi", "kedi mamasi", "kisirlastirma"]),
  hint(["bakim"], "evde bakim", ["yasli bakimi", "hasta bakimi", "evde bakim", "refakatci", "yasli bakici", "hasta bakici"]),
  hint(["egitim"], "kurs", ["ingilizce ogren", "ingilizce kurs", "almanca kurs", "dil ogren", "yabanci dil", "ehliyet al", "ehliyet kursu", "surucu kursu", "lgs hazirlik", "yks hazirlik", "universite hazirlik", "matematik ders", "ozel ders", "etut merkezi", "kodlama kursu"]),
  hint(["spor"], "spor", ["spor salonu", "fitness", "pilates", "yoga", "yuzme kursu", "kilo vermek icin spor", "kisisel antrenor", "boks"]),
  hint(["guzellik"], "kuafor", ["sac kestir", "sac boyat", "kuafor", "berber", "sakal tiras", "manikur", "pedikur", "kas", "kirpik", "lazer epilasyon", "cilt bakimi", "gelin sac"]),
  hint(["hamam"], "hamam", ["hamam", "sauna", "kese", "termal", "spa gunu"]),
  hint(["yeme"], "yemek", ["kebap", "doner", "pide", "lahmacun", "burger", "pizza", "cig kofte", "kofte", "iskender", "tatli", "baklava", "dondurma", "corba", "esnaf lokanta", "ev yemegi", "deniz urunleri", "balik yemek", "aksam yemegi", "ogle yemegi", "kahvalti", "serpme kahvalti", "brunch", "kafe", "kahve ic", "pastane", "firin", "yemek yiyecek yer", "nerede yemek", "yemek siparis"]),
  hint(["gece"], "bar", ["bar", "pub", "kulup", "gece hayati", "canli muzik gece", "nargile"]),
  hint(["eglence"], "eglence", ["sinema", "tiyatro", "konser", "oyun salonu", "bowling", "kacis oyunu", "lunapark", "aktivite", "etkinlik"]),
  hint(["konaklama"], "otel", ["otel", "konaklama", "bungalov", "pansiyon", "butik otel", "tatil koyu", "apart", "gecelik kal", "kalacak yer", "kalacak bir yer", "nerede kalab"]),
  hint(["turizm"], "tur", ["ucak bileti", "vize", "tur paketi", "tatil paketi", "balayi", "seyahat acentesi", "pasaport"]),
  hint(["emlak"], "emlak", ["kiralik daire", "satilik daire", "ev ariyorum", "ev bakiyorum", "kiralik ev", "satilik ev", "dukkan kirala", "ofis kirala", "emlakci"]),
  hint(["insaat"], "insaat", ["ev yaptir", "bina yaptir", "kat karsiligi", "kaba insaat", "muteahhit", "kentsel donusum"]),
  hint(["mimarlik"], "mimar", ["mimari proje", "ic mimar", "ruhsat", "proje cizdir", "mimar"]),
  hint(["cati"], "cati", ["cati akiyor", "catim akiyor", "dam akiyor", "su yalitimi", "mantolama", "izolasyon", "cati tamir"]),
  hint(["cam"], "cam", ["cam kirildi", "camim kirildi", "pencere degis", "pvc pencere", "cam balkon", "dusakabin"]),
  hint(["dekor"], "mobilya", ["mobilya", "koltuk takimi", "yatak odasi", "yemek masasi", "perde", "aydinlatma", "dekorasyon", "bahce duzenleme", "peyzaj"]),
  hint(["dugun"], "organizasyon", ["dugun salonu", "dugun organizasyon", "nikah", "kina gecesi", "nisan organizasyon", "dogum gunu organizasyon", "dugun fotografcisi", "gelinlik", "davet organizasyon"]),
  hint(["cicek"], "cicek", ["cicek gonder", "cicek siparis", "buket", "cicekci", "hediye al", "dogum gunu hediyesi"]),
  hint(["kuyum"], "kuyumcu", ["altin al", "altin boz", "alyans", "pirlanta yuzuk", "saat tamir", "kuyumcu"]),
  hint(["alisveris"], "magaza", ["ayakkabi al", "kiyafet al", "elbise al", "market", "elektronik magaza", "beyaz esya al", "telefon al", "bilgisayar al"]),
  hint(["ikinciel"], "ikinci el", ["ikinci el", "2 el", "sahibinden", "antika", "spot esya", "esya sat"]),
  hint(["kurutemizleme"], "kuru temizleme", ["kuru temizleme", "takim elbise temizle", "gelinlik temizle", "camasirhane", "utu"]),
  hint(["tekstil"], "terzi", ["terzi", "paca kisalt", "pantolon daralt", "elbise dikim", "nakis"]),
  hint(["medya"], "reklam", ["reklam ajansi", "sosyal medya yonet", "instagram yonet", "logo tasarim", "kurumsal kimlik", "tanitim filmi", "fotograf cekimi", "urun cekimi"]),
  hint(["matbaa"], "baski", ["kartvizit", "tabela", "afis bas", "brosur", "dijital baski", "davetiye bas", "sticker"]),
  hint(["b2b"], "tedarik", ["toptan", "tedarikci", "ambalaj", "koli", "palet", "toptanci", "fason uretim"]),
  hint(["depolama"], "depo", ["esya depola", "depo kirala", "arsiv depola", "kiralik depo"]),
  hint(["guvenlik"], "guvenlik", ["kamera taktir", "guvenlik kamerasi", "alarm sistemi", "guvenlik gorevlisi", "hirsiz alarm"]),
  hint(["yangin"], "yangin", ["yangin tupu", "yangin sondurme", "yangin alarmi", "sprinkler"]),
  hint(["isguvenligi"], "isg", ["is guvenligi", "isg", "osgb", "isyeri hekimi", "risk analizi"]),
  hint(["danismanlik"], "danismanlik", ["is kurmak", "girisimcilik", "hibe", "kosgeb", "kariyer kocu", "yonetim danismanligi", "insan kaynaklari"]),
  hint(["tercume"], "tercume", ["tercume", "ceviri", "yeminli tercuman", "noter onayli ceviri", "apostil"]),
  hint(["kirtasiye"], "kirtasiye", ["okul malzemesi", "kirtasiye", "fotokopi", "cikti al", "ciltleme"]),
  hint(["kitap"], "kitap", ["kitap al", "kitapci", "sahaf", "kitabevi"]),
  hint(["muzik"], "muzik", ["gitar kursu", "piyano kursu", "bateri", "muzik kursu", "ses kaydi", "studyo", "enstruman"]),
  hint(["dans"], "dans", ["dans kursu", "salsa", "bale", "dugun dansi", "zumba"]),
  hint(["sanat"], "sanat", ["resim kursu", "seramik atolyesi", "sergi", "galeri", "hobi atolyesi"]),
  hint(["tarim"], "tarim", ["fide", "fidan", "sera", "gubre", "tohum", "ziraat", "arici", "ciftlik"]),
  hint(["gida"], "catering", ["catering", "toplu yemek", "yemek fabrikasi", "kumanya", "dugun yemegi"]),
  hint(["cevre"], "atik", ["moloz at", "moloz", "geri donusum", "atik", "hurda"]),
  hint(["hafriyat"], "hafriyat", ["kazi", "hafriyat", "is makinesi", "kepce"]),
  hint(["jenerator"], "jenerator", ["jenerator", "ups", "kesintisiz guc", "elektrik kesintisi icin"]),
  hint(["asansor"], "asansor", ["asansor bozuldu", "asansor bakim", "asansor"]),
  hint(["havuz"], "havuz", ["havuz bakim", "havuz yaptir", "havuz kimyasal", "jakuzi"]),
  hint(["otopark"], "otopark", ["otopark", "park yeri", "vale"]),
  hint(["cenaze"], "cenaze", ["cenaze", "defin", "mezar", "taziye", "cenaze yemegi"]),
  hint(["prefabrik"], "prefabrik", ["prefabrik", "konteyner", "santiye ofisi", "tiny house"]),
  hint(["metal"], "kaynak", ["kaynak isi", "demir dograma", "ferforje", "korkuluk", "celik kapi", "metal"]),
  hint(["hirdavat"], "hirdavat", ["hirdavat", "nalbur", "vida", "matkap", "el aleti"]),
  hint(["laboratuvar"], "laboratuvar", ["su analizi", "gida analizi", "laboratuvar", "kalite testi"]),
  hint(["belgelendirme"], "belgelendirme", ["iso belgesi", "ce belgesi", "tse belgesi", "kalite belgesi", "helal belgesi"]),
  hint(["sogukhava"], "soguk hava", ["soguk hava deposu", "soguk zincir", "soguk depo"]),
  hint(["cagri"], "cagri merkezi", ["cagri merkezi", "musteri hizmetleri hizmeti", "outbound", "telefonla satis ekibi"]),
  hint(["denizcilik"], "tekne", ["tekne kirala", "yat kirala", "marina", "tekne bakim", "balik avi turu"]),
  hint(["havacilik"], "havacilik", ["pilot egitimi", "ucak bakim", "drone", "yer hizmetleri"]),
  hint(["ithalat"], "gumruk", ["gumruk", "ithalat", "ihracat", "dis ticaret"]),
  hint(["yayincilik"], "yayinevi", ["kitap bastir", "kitabimi bas", "yayinevi", "dergi bas"]),
]

/**
 * Everyday words that the catalog and sector phrases spell differently. Keys are folded single
 * tokens; values may be several words. Suffix stripping lets "aracim" reach "arac".
 */
export const needSynonyms: Record<string, string> = {
  arac: "oto",
  araba: "oto",
  otomobil: "oto",
  arabaci: "oto",
  muslukcu: "tesisatci",
  sucu: "tesisatci",
  tesisatcisi: "tesisatci",
  kombici: "kombi",
  petekci: "kombi",
  elektrikcisi: "elektrikci",
  disci: "dis",
  dishekimi: "dis hekimi",
  vet: "veteriner",
  veterineri: "veteriner",
  ehliyet: "surucu kursu",
  ingilizce: "dil kursu",
  almanca: "dil kursu",
  fransizca: "dil kursu",
  nakliyat: "nakliye",
  nakliyeci: "nakliye",
  pastane: "firin",
  pastaci: "firin",
  kahveci: "kafe",
  cayci: "kafe",
  restorant: "restoran",
  restourant: "restoran",
  restaurant: "restoran",
  lokantaci: "lokanta",
  otelci: "otel",
  hostel: "pansiyon",
  motel: "otel",
  diyetisyeni: "diyetisyen",
  doktoru: "doktor",
  hekim: "doktor",
  hekimi: "doktor",
  avukati: "avukat",
  avukatlik: "avukat",
  muhasebeci: "muhasebe",
  sigortaci: "sigorta",
  emlakci: "emlak",
  gayrimenkulcu: "emlak",
  taksici: "taksi",
  kuryeci: "kurye",
  camci: "cam",
  camcisi: "cam",
  boyaci: "boya",
  badanaci: "boya",
  marangoz: "mobilya",
  mobilyaci: "mobilya",
  dograma: "pvc dograma",
  klimaci: "klima",
  tamirci: "tamir",
  tamirhane: "tamir",
  teknisyen: "servis",
  bilgisayarci: "bilgisayar",
  telefoncu: "telefon",
  gozlukcu: "gozluk",
  eczaneci: "eczane",
  kresci: "kres",
  anaokul: "anaokulu",
  catici: "cati",
  temizlikci: "temizlik",
  hizmetli: "temizlik",
  berberi: "berber",
  guzellikci: "guzellik",
  fitnes: "fitness",
  jimnastik: "spor",
  cicekci: "cicek",
  kuyumcusu: "kuyumcu",
  sarraf: "kuyumcu",
  fotografcisi: "fotografci",
  dugunculer: "dugun",
  terzisi: "terzi",
  matbaaci: "matbaa",
  tabelaci: "tabela",
  nalbur: "hirdavat",
  nalburiye: "hirdavat",
  demirci: "kaynak",
  kaynakci: "kaynak",
  cilingirci: "cilingir",
  anahtarci: "cilingir",
  izolasyoncu: "izolasyon",
  mantolamaci: "mantolama",
  hafriyatci: "hafriyat",
  kepceci: "hafriyat",
  depocu: "depo",
  ardiye: "depo",
  toptanci: "toptan",
  tedarikcisi: "tedarik",
  gumrukcu: "gumruk",
  tercuman: "tercume",
  ceviri: "tercume",
  cevirmen: "tercume",
  psikologu: "psikolog",
  terapist: "terapi",
  fizyoterapist: "fizyoterapi",
  veterinerlik: "veteriner",
  petshop: "pet",
  internetci: "internet",
}

const knownTypos: [RegExp, string][] = [
  [/\bsigrota\b/g, "sigorta"],
  [/\btesisart\b/g, "tesisat"],
  [/\bkombii\b/g, "kombi"],
  [/\bweb sitesii\b/g, "web sitesi"],
  [/\bwebsite(si)?\b/g, "web sitesi"],
  [/\bweb site\b/g, "web sitesi"],
  [/\be-?ticaret\b/g, "e ticaret"],
]

/** Common query words that are never "corrected" into a trade word. */
const PROTECTED = new Set([
  "ariyorum", "ariyoruz", "lazim", "istiyorum", "istiyoruz", "isterim", "gerek", "gerekiyor", "nerede", "nereden", "nereye",
  "hangi", "hangisi", "nasil", "nedir", "neden", "olmuyor", "calismiyor", "bozuldu", "patladi", "akiyor", "kesildi", "gelsin",
  "gelebilen", "gelebilir", "bugun", "yarin", "hafta", "sonu", "evim", "evimin", "evimiz", "evde", "evime", "isyerim", "isletmeme",
  "isletmem", "aracim", "arabam", "icin", "uygun", "ucuz", "pahali", "yakin", "yakinimda", "guzel", "iyi", "kotu", "buyuk", "kucuk",
  "yeni", "eski", "hizli", "hemen", "acil", "simdi", "aksam", "sabah", "ogle", "gece", "kisin", "yazin", "sicak", "soguk",
  "cocuklarla", "cocukla", "cocuk", "cocuklar", "ailem", "esim", "annem", "babam", "arkadas", "gidebilecegim", "gidilecek",
  "yapmak", "yaptirmak", "yaptir", "almak", "satmak", "bulmak", "gitmek", "kalmak", "yemek", "icmek", "olan", "olsun", "kadar",
  "sonra", "once", "fiyat", "fiyati", "butce", "butcem", "kalite", "tavsiye", "oneri", "deneyimli", "guvenilir", "ustasi", "usta",
  "manzarali", "manzara", "deniz", "sahil", "merkez", "merkezde", "yakinda", "civari", "civarinda", "burada", "bura", "orada",
])

const VOCAB_SUFFIXES = /(?:lerimiz|larimiz|leriniz|lariniz|lerim|larim|lerin|larin|imiz|umuz|iniz|unuz|ler|lar|dan|den|ten|tan|nin|nun|ya|ye|yi|yu|im|um|in|un|da|de|ta|te|a|e|i|u)$/

export type NeedCorrection = { from: string; to: string; kind: "yazim" | "esanlam" }

export type NeedCorrected = { text: string; changes: NeedCorrection[] }

function vocabulary() {
  const words = new Set<string>()
  for (const sector of allSectors()) {
    for (const phrase of sector.phrases) for (const word of phrase.split(" ")) if (word.length >= 4) words.add(word)
  }
  for (const item of needHints) {
    for (const phrase of item.phrases) for (const word of phrase.split(" ")) if (word.length >= 4) words.add(word)
    if (item.focus.length >= 4) words.add(item.focus)
  }
  for (const key of Object.keys(needSynonyms)) if (key.length >= 4) words.add(key)
  return words
}

export function editDistance(a: string, b: string, max = 2) {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > max) return max + 1
  const rows = a.length + 1
  const cols = b.length + 1
  const d: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0))
  for (let i = 0; i < rows; i += 1) d[i][0] = i
  for (let j = 0; j < cols; j += 1) d[0][j] = j
  for (let i = 1; i < rows; i += 1) {
    let rowMin = Number.POSITIVE_INFINITY
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let value = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) value = Math.min(value, d[i - 2][j - 2] + 1)
      d[i][j] = value
      rowMin = Math.min(rowMin, value)
    }
    if (rowMin > max) return max + 1
  }
  return d[a.length][b.length]
}

function closeWord(token: string, words: Set<string>) {
  if (token.length < 5 || /\d/.test(token)) return null
  if (words.has(token)) return null
  for (const word of words) {
    if (word.startsWith(token) || (token.length >= 4 && token.startsWith(word))) return null
  }
  const limit = token.length >= 8 ? 2 : 1
  let best: { word: string; distance: number } | null = null
  for (const word of words) {
    if (word[0] !== token[0]) continue
    const distance = editDistance(token, word, limit)
    if (distance > limit) continue
    if (!best || distance < best.distance || (distance === best.distance && word.length > best.word.length)) best = { word, distance }
  }
  return best?.word ?? null
}

function synonymFor(token: string) {
  if (needSynonyms[token]) return needSynonyms[token]
  let body = token
  for (let step = 0; step < 3; step += 1) {
    const next = body.replace(VOCAB_SUFFIXES, "")
    if (next === body || next.length < 3) break
    body = next
    if (needSynonyms[body]) return needSynonyms[body]
  }
  return null
}

/**
 * Fix known typos, repair near-misses against the trade vocabulary and map everyday words to the
 * catalog's wording. `protect` holds folded place names that must never change.
 */
export function correctNeedDetailed(text: string, protect: Iterable<string> = []): NeedCorrected {
  const changes: NeedCorrection[] = []
  let current = text
  for (const [pattern, word] of knownTypos) {
    const before = current
    current = current.replace(pattern, word)
    if (before !== current) {
      const hit = before.match(pattern)
      if (hit) changes.push({ from: hit[0], to: word, kind: "yazim" })
    }
  }
  const places = new Set<string>()
  for (const name of protect) for (const part of name.split(" ")) places.add(part)
  const words = vocabulary()
  const tokens = current.split(" ").filter(Boolean)
  const output = tokens.map((token) => {
    if (places.has(token) || PROTECTED.has(token)) return token
    const fixed = closeWord(token, words)
    if (fixed) {
      changes.push({ from: token, to: fixed, kind: "yazim" })
      return fixed
    }
    return token
  })
  const expanded = output.map((token) => {
    if (places.has(token)) return token
    const synonym = synonymFor(token)
    if (synonym && synonym !== token) {
      changes.push({ from: token, to: synonym, kind: "esanlam" })
      return synonym
    }
    return token
  })
  return { text: expanded.join(" "), changes }
}

export function correctNeedText(text: string, protect: Iterable<string> = []) {
  return correctNeedDetailed(text, protect).text
}

export function matchNeed(text: string, priorityOnly = false) {
  let best: { hint: NeedHint; length: number } | null = null
  for (const item of needHints) {
    if (priorityOnly && !item.priority) continue
    for (const phrase of item.phrases) {
      if (!text.includes(phrase)) continue
      if (!best || phrase.length > best.length) best = { hint: item, length: phrase.length }
    }
  }
  return best?.hint ?? null
}

export type NeedIntent = "isletme" | "bilgi"

const INFO_MARKERS = [
  "nasil yapilir", "nasil secilir", "nasil secmeli", "nasil olur", "nasil anlarim", "nasil anlasilir", "nasil temizlenir", "nasil onarilir",
  "nasil kullanilir", "nedir", "ne demek", "neden olur", "ne zaman", "ne yapmaliyim", "ne yapmali", "ne yapilir", "nelere dikkat",
  "farki ne", "farki nedir", "hangisi daha", "hangisini sec", "ipucu", "ipuclari", "tavsiye", "oneri", "rehber", "kendim yapabilir",
  "evde nasil", "ne kadar surer", "zararli mi", "gerekli mi", "sart mi", "kac yilda bir", "kac ayda bir", "ne siklikla",
]

export function needIntent(text: string): NeedIntent {
  const folded = ` ${text} `
  if (INFO_MARKERS.some((marker) => folded.includes(marker))) return "bilgi"
  if (/\bnasil\b/.test(text) && !/\b(giderim|gidilir|ulasirim|bulurum)\b/.test(text)) return "bilgi"
  return "isletme"
}

export type NeedDetails = {
  urgent: boolean
  budget: "ekonomik" | "luks" | null
  timing: "bugun" | "haftasonu" | "aksam" | null
}

export function needDetails(text: string): NeedDetails {
  const urgent = /\b(acil|hemen|simdi|su an|patladi|akiyor|kaldim|kesildi|basti|yaniyor|kanama)\b/.test(text) || text.includes("bugun gel")
  const budget = /\b(ucuz|ekonomik|uygun|butce|hesapli|indirim)\b/.test(text)
    ? "ekonomik"
    : /\b(luks|premium|en iyi|vip|ozel)\b/.test(text)
      ? "luks"
      : null
  const timing = text.includes("hafta sonu") || text.includes("haftasonu")
    ? "haftasonu"
    : /\b(bugun|bu aksam|bu gece)\b/.test(text)
      ? text.includes("aksam") || text.includes("gece")
        ? "aksam"
        : "bugun"
      : /\b(aksam)\b/.test(text)
        ? "aksam"
        : null
  return { urgent, budget, timing }
}

export const relatedCategories: Record<string, CategoryId[]> = {
  usta: ["ev", "enerji", "cam", "cati", "hirdavat", "asansor"],
  ev: ["usta", "dekor", "temizlik", "cati", "cam", "insaat"],
  enerji: ["usta", "ev", "cati", "jenerator"],
  temizlik: ["ev", "kurutemizleme", "ilaclama", "cevre"],
  saglik: ["hastane", "eczane", "optik", "psikoloji", "laboratuvar", "bakim"],
  hastane: ["saglik", "eczane", "laboratuvar"],
  eczane: ["saglik", "hastane", "optik"],
  optik: ["saglik", "eczane"],
  psikoloji: ["saglik", "danismanlik"],
  yeme: ["gida", "eglence", "gece", "konaklama"],
  konaklama: ["turizm", "yeme", "hamam"],
  turizm: ["konaklama", "ulasim", "kiralama", "havacilik", "denizcilik"],
  guzellik: ["hamam", "saglik", "spor"],
  hamam: ["guzellik", "spor", "konaklama"],
  spor: ["dans", "guzellik", "saglik"],
  dans: ["spor", "muzik", "sanat", "egitim"],
  muzik: ["sanat", "dans", "egitim", "eglence"],
  sanat: ["muzik", "dans", "egitim", "kitap"],
  egitim: ["cocuk", "danismanlik", "sanat", "muzik", "kitap", "kirtasiye"],
  cocuk: ["egitim", "eglence", "yeme", "bakim"],
  eglence: ["gece", "yeme", "muzik", "dugun", "cocuk"],
  gece: ["eglence", "yeme"],
  oto: ["cekici", "kiralama", "otopark", "finans"],
  cekici: ["oto", "ulasim"],
  kiralama: ["oto", "turizm", "b2b"],
  otopark: ["oto"],
  finans: ["danismanlik", "hukuk", "noter", "emlak"],
  hukuk: ["noter", "danismanlik", "finans"],
  noter: ["hukuk", "finans", "emlak"],
  emlak: ["noter", "insaat", "mimarlik", "finans"],
  insaat: ["mimarlik", "muhendislik", "hafriyat", "prefabrik", "ev"],
  mimarlik: ["insaat", "muhendislik", "dekor"],
  muhendislik: ["insaat", "mimarlik", "belgelendirme"],
  dekor: ["ev", "mimarlik", "cam", "ikinciel"],
  teknoloji: ["gsm", "medya", "iletisim", "cagri"],
  gsm: ["teknoloji", "iletisim"],
  iletisim: ["teknoloji", "gsm"],
  medya: ["matbaa", "teknoloji", "yayincilik"],
  matbaa: ["medya", "kirtasiye", "yayincilik"],
  yayincilik: ["kitap", "matbaa", "medya"],
  kitap: ["yayincilik", "kirtasiye", "sanat"],
  kirtasiye: ["kitap", "matbaa", "egitim"],
  b2b: ["depolama", "ulasim", "ithalat", "sogukhava", "gida"],
  depolama: ["b2b", "sogukhava", "ulasim"],
  sogukhava: ["depolama", "gida"],
  ithalat: ["b2b", "ulasim", "belgelendirme"],
  ulasim: ["cekici", "b2b", "kiralama", "turizm"],
  gida: ["yeme", "b2b", "tarim", "sogukhava"],
  tarim: ["gida", "cicek", "cevre"],
  cicek: ["dugun", "tarim", "alisveris"],
  dugun: ["cicek", "eglence", "medya", "dans", "kuyum"],
  kuyum: ["alisveris", "dugun"],
  alisveris: ["ikinciel", "tekstil", "kuyum", "hirdavat"],
  ikinciel: ["alisveris", "dekor"],
  tekstil: ["alisveris", "kurutemizleme"],
  kurutemizleme: ["temizlik", "tekstil"],
  hayvan: ["tarim", "alisveris"],
  bakim: ["saglik", "cocuk", "hastane"],
  guvenlik: ["yangin", "isguvenligi", "teknoloji"],
  yangin: ["guvenlik", "isguvenligi"],
  isguvenligi: ["guvenlik", "yangin", "belgelendirme", "danismanlik"],
  belgelendirme: ["isguvenligi", "danismanlik", "laboratuvar"],
  laboratuvar: ["saglik", "belgelendirme"],
  danismanlik: ["finans", "hukuk", "isguvenligi", "egitim"],
  cevre: ["hafriyat", "temizlik", "tarim"],
  hafriyat: ["insaat", "cevre"],
  prefabrik: ["insaat"],
  metal: ["hirdavat", "insaat", "usta"],
  hirdavat: ["usta", "metal", "ev"],
  cam: ["usta", "dekor", "ev"],
  cati: ["usta", "insaat", "ev"],
  asansor: ["usta", "insaat"],
  havuz: ["insaat", "usta"],
  jenerator: ["enerji", "usta"],
  cenaze: ["cicek", "noter"],
  tercume: ["noter", "danismanlik", "egitim"],
  cagri: ["teknoloji", "danismanlik"],
  havacilik: ["turizm", "ulasim"],
  denizcilik: ["turizm", "ulasim"],
  ilaclama: ["temizlik", "cevre"],
}

export function alternativeCategories(ids: CategoryId[], limit = 4): CategoryId[] {
  const out: CategoryId[] = []
  for (const id of ids) {
    for (const next of relatedCategories[id] ?? []) {
      if (ids.includes(next) || out.includes(next)) continue
      out.push(next)
      if (out.length >= limit) return out
    }
  }
  return out
}

const FINANCIAL = new Set(["sigorta", "kasko", "kredi", "police", "dask", "muhasebe"])

/** Insurance and credit needs go through a separate quote flow; results should say so. */
export function isFinancialNeed(categories: CategoryId[], focus: string[]) {
  if (!categories.includes("finans")) return false
  return focus.some((word) => word.split(" ").some((part) => FINANCIAL.has(part))) || focus.length === 0
}
