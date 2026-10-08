#!/usr/bin/env python3
"""Refresh lib/zonguldak.ts from OpenStreetMap for Zonguldak province.

Google Maps Platform does not allow copying ratings, reviews, or photos into
another directory. This sync keeps the fields that can be stored: the business
name, address, coordinates, phone, website, and opening hours from OpenStreetMap
(ODbL), plus a Google Maps search link for the same name and place.
"""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo

MIRRORS = [
    "https://overpass.openstreetmap.fr/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass-api.de/api/interpreter",
]
NOMINATIM = "https://nominatim.openstreetmap.org/lookup?osm_ids=R223459&format=json&polygon_geojson=1"
USER_AGENT = "pinwego/1.0 (local business directory; zonguldak sync)"
OUT = "lib/zonguldak.ts"
RELATION = 223459

DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]
DAY_INDEX = {"Mo": 0, "Tu": 1, "We": 2, "Th": 3, "Fr": 4, "Sa": 5, "Su": 6}

AMENITY_OK = {
    "restaurant", "cafe", "fast_food", "bar", "pub", "ice_cream", "biergarten", "food_court",
    "bank", "bureau_de_change", "money_transfer", "pharmacy", "fuel", "clinic", "dentist",
    "doctors", "hospital", "veterinary", "car_repair", "car_wash", "vehicle_inspection",
    "car_rental", "cinema", "theatre", "nightclub", "taxi", "driving_school", "language_school",
    "music_school", "dance_school", "prep_school", "internet_cafe", "hookah_lounge", "marketplace",
    "post_office", "public_bath", "nursing_home", "dojo", "events_venue", "conference_centre",
    "boat_rental", "laundry", "dry_cleaning", "animal_boarding", "studio",
}
TOURISM_OK = {"hotel", "guest_house", "hostel", "motel", "apartment", "chalet", "camp_site", "caravan_site", "gallery", "theme_park", "zoo", "aquarium"}
LEISURE_OK = {
    "fitness_centre", "sports_centre", "sports_hall", "swimming_pool", "sauna", "dance",
    "horse_riding", "golf_course", "miniature_golf", "bowling_alley", "escape_game",
    "amusement_arcade", "water_park", "marina", "tanning_salon",
}
OFFICE_SKIP = {"government", "administrative", "political_party", "ngo", "quango", "religion", "diplomatic"}

# category, Turkish label, photo, booking
META = {
    "yeme": ("Yeme-İçme", "/photos/lokanta.jpg", "rezervasyon"),
    "konaklama": ("Konaklama", "/photos/hotel.jpg", "rezervasyon"),
    "guzellik": ("Güzellik", "/photos/salon.jpg", "randevu"),
    "ev": ("Ev hizmetleri", "/photos/paint.jpg", "teklif"),
    "usta": ("Usta & tamir", "/photos/plumber.jpg", "teklif"),
    "saglik": ("Sağlık", "/photos/dental.jpg", "randevu"),
    "eczane": ("Eczane", "/photos/chemistry.jpg", "randevu"),
    "optik": ("Optik", "/photos/clinic.jpg", "randevu"),
    "b2b": ("B2B & tedarik", "/photos/warehouse.jpg", "teklif"),
    "dekor": ("Dekor & mekân", "/photos/interior.jpg", "teklif"),
    "oto": ("Otomotiv", "/photos/repair.jpg", "teklif"),
    "alisveris": ("Alışveriş", "/photos/boutique.jpg", "teklif"),
    "egitim": ("Eğitim", "/photos/office.jpg", "randevu"),
    "spor": ("Spor & fitness", "/photos/physio.jpg", "randevu"),
    "eglence": ("Eğlence", "/photos/meyhane.jpg", "rezervasyon"),
    "emlak": ("Emlak", "/photos/konak.jpg", "teklif"),
    "hukuk": ("Hukuk", "/photos/office.jpg", "randevu"),
    "finans": ("Finans & sigorta", "/photos/office.jpg", "randevu"),
    "ulasim": ("Ulaşım & kargo", "/photos/logistics.jpg", "teklif"),
    "hayvan": ("Pet & veteriner", "/photos/clinic.jpg", "randevu"),
    "dugun": ("Düğün & organizasyon", "/photos/boutique.jpg", "rezervasyon"),
    "teknoloji": ("Teknoloji", "/photos/electric.jpg", "teklif"),
    "tarim": ("Tarım", "/photos/garden.jpg", "teklif"),
    "insaat": ("İnşaat", "/photos/paint.jpg", "teklif"),
    "medya": ("Reklam & medya", "/photos/office.jpg", "teklif"),
    "enerji": ("Enerji", "/photos/ac.jpg", "teklif"),
    "turizm": ("Turizm & seyahat", "/photos/hotel.jpg", "teklif"),
    "danismanlik": ("Danışmanlık", "/photos/office.jpg", "randevu"),
    "tekstil": ("Tekstil", "/photos/boutique.jpg", "teklif"),
    "gida": ("Gıda üretimi", "/photos/bakery.jpg", "teklif"),
    "kuyum": ("Kuyum & saat", "/photos/boutique.jpg", "teklif"),
    "cicek": ("Çiçek & hediye", "/photos/garden.jpg", "teklif"),
    "bakim": ("Bakım hizmeti", "/photos/clinic.jpg", "randevu"),
    "muhendislik": ("Mühendislik", "/photos/office.jpg", "teklif"),
    "mimarlik": ("Mimarlık", "/photos/interior.jpg", "teklif"),
    "matbaa": ("Matbaa", "/photos/office.jpg", "teklif"),
    "kiralama": ("Kiralama", "/photos/repair.jpg", "teklif"),
    "denizcilik": ("Denizcilik", "/photos/seafood.jpg", "teklif"),
    "hamam": ("Hamam & wellness", "/photos/spa.jpg", "rezervasyon"),
    "gsm": ("GSM & teknik servis", "/photos/electric.jpg", "teklif"),
    "kurutemizleme": ("Kuru temizleme", "/photos/cleaning.jpg", "teklif"),
    "sanat": ("Sanat & hobi", "/photos/interior.jpg", "randevu"),
    "muzik": ("Müzik", "/photos/meyhane.jpg", "randevu"),
    "gece": ("Gece hayatı", "/photos/meyhane.jpg", "rezervasyon"),
    "hirdavat": ("Hırdavat", "/photos/repair.jpg", "teklif"),
    "cati": ("Çatı & izolasyon", "/photos/paint.jpg", "teklif"),
    "cam": ("Cam & doğrama", "/photos/interior.jpg", "teklif"),
    "metal": ("Metal & kaynak", "/photos/repair.jpg", "teklif"),
    "dans": ("Dans", "/photos/salon.jpg", "randevu"),
    "noter": ("Noter", "/photos/office.jpg", "randevu"),
    "hastane": ("Hastane", "/photos/clinic.jpg", "randevu"),
    "psikoloji": ("Psikoloji", "/photos/clinic.jpg", "randevu"),
    "cenaze": ("Cenaze", "/photos/office.jpg", "teklif"),
    "kirtasiye": ("Kırtasiye", "/photos/office.jpg", "teklif"),
    "kitap": ("Kitabevi", "/photos/office.jpg", "teklif"),
    "yayincilik": ("Yayınevi", "/photos/office.jpg", "teklif"),
}

SHOP = {
    "supermarket": ("alisveris", "Market"), "convenience": ("alisveris", "Market"), "grocery": ("alisveris", "Market"),
    "general": ("alisveris", "Market"), "department_store": ("alisveris", "Mağaza"), "mall": ("alisveris", "AVM"),
    "variety_store": ("alisveris", "Mağaza"), "kiosk": ("alisveris", "Büfe"), "newsagent": ("alisveris", "Büfe"),
    "clothes": ("alisveris", "Giyim"), "shoes": ("alisveris", "Ayakkabı"), "boutique": ("alisveris", "Butik"),
    "bag": ("alisveris", "Çanta"), "fabric": ("tekstil", "Kumaş"), "tailor": ("tekstil", "Terzi"),
    "hairdresser": ("guzellik", "Kuaför"), "beauty": ("guzellik", "Güzellik"), "cosmetics": ("guzellik", "Kozmetik"),
    "perfumery": ("guzellik", "Parfümeri"), "tattoo": ("guzellik", "Dövme"),
    "car": ("oto", "Galeri"), "car_repair": ("oto", "Oto servis"), "car_parts": ("oto", "Yedek parça"),
    "tyres": ("oto", "Lastik"), "motorcycle": ("oto", "Motosiklet"),
    "hardware": ("hirdavat", "Hırdavat"), "doityourself": ("hirdavat", "Yapı market"), "trade": ("hirdavat", "Hırdavat"),
    "paint": ("hirdavat", "Boya"), "furniture": ("dekor", "Mobilya"), "interior_decoration": ("dekor", "Dekorasyon"),
    "houseware": ("dekor", "Ev gereçleri"), "kitchen": ("dekor", "Mutfak"), "carpet": ("dekor", "Halı"),
    "bakery": ("yeme", "Fırın"), "pastry": ("yeme", "Pastane"), "confectionery": ("yeme", "Şekerleme"),
    "butcher": ("gida", "Kasap"), "seafood": ("yeme", "Balık"), "greengrocer": ("gida", "Manav"),
    "deli": ("gida", "Şarküteri"), "cheese": ("gida", "Şarküteri"), "farm": ("tarim", "Çiftlik"),
    "florist": ("cicek", "Çiçekçi"), "gift": ("cicek", "Hediye"),
    "books": ("kitap", "Kitabevi"), "stationery": ("kirtasiye", "Kırtasiye"),
    "electronics": ("teknoloji", "Elektronik"), "computer": ("teknoloji", "Bilgisayar"),
    "mobile_phone": ("gsm", "Telefon"), "hifi": ("teknoloji", "Elektronik"),
    "optician": ("optik", "Optik"), "hearing_aids": ("saglik", "İşitme"), "medical_supply": ("saglik", "Medikal"),
    "nutrition_supplements": ("eczane", "Vitamin"), "chemist": ("eczane", "Eczane"),
    "travel_agency": ("turizm", "Acente"), "estate_agent": ("emlak", "Emlak"), "insurance": ("finans", "Sigorta"),
    "copyshop": ("matbaa", "Baskı"), "laundry": ("kurutemizleme", "Çamaşır"), "dry_cleaning": ("kurutemizleme", "Kuru temizleme"),
    "pet": ("hayvan", "Pet shop"), "pet_grooming": ("hayvan", "Pet bakım"),
    "sports": ("spor", "Spor"), "outdoor": ("spor", "Outdoor"),
    "jewelry": ("kuyum", "Kuyumcu"), "watches": ("kuyum", "Saat"),
    "art": ("sanat", "Sanat"), "craft": ("sanat", "Hobi"), "musical_instrument": ("muzik", "Enstrüman"),
    "funeral_directors": ("cenaze", "Cenaze"), "pawnbroker": ("finans", "Rehinci"), "money_lender": ("finans", "Finans"),
    "garden_centre": ("tarim", "Fidanlık"), "florist_wholesale": ("cicek", "Çiçek"),
    "wholesale": ("b2b", "Toptan"), "trade_wholesale": ("b2b", "Toptan"), "agrarian": ("tarim", "Ziraat"),
    "gas": ("oto", "Akaryakıt"), "fuel": ("oto", "Akaryakıt"),
    "ticket": ("eglence", "Bilet"), "video_games": ("eglence", "Oyun"),
    "e-cigarette": ("alisveris", "Market"), "tobacco": ("alisveris", "Market"), "lottery": ("alisveris", "Şans oyunu"),
    "photo": ("medya", "Fotoğraf"), "frame": ("dekor", "Çerçeve"), "window": ("cam", "Doğrama"),
    "glaziery": ("cam", "Cam"), "doors": ("cam", "Doğrama"), "tiles": ("insaat", "Seramik"),
    "electrical": ("usta", "Elektrik"), "plumbing": ("usta", "Tesisat"), "hvac": ("enerji", "İklimlendirme"),
    "energy": ("enerji", "Enerji"), "fireplace": ("enerji", "Isıtma"),
    "second_hand": ("alisveris", "İkinci el"), "antiques": ("alisveris", "Antika"),
    "yes": ("alisveris", "Mağaza"),
}
AMENITY = {
    "restaurant": ("yeme", "Restoran"), "cafe": ("yeme", "Kafe"), "fast_food": ("yeme", "Hızlı yemek"),
    "bar": ("gece", "Bar"), "pub": ("gece", "Pub"), "ice_cream": ("yeme", "Dondurma"),
    "biergarten": ("yeme", "Bahçe"), "food_court": ("yeme", "Yemek alanı"), "hookah_lounge": ("gece", "Nargile"),
    "nightclub": ("gece", "Kulüp"), "bank": ("finans", "Banka"), "bureau_de_change": ("finans", "Döviz"),
    "money_transfer": ("finans", "Havale"), "pharmacy": ("eczane", "Eczane"), "fuel": ("oto", "Akaryakıt"),
    "clinic": ("saglik", "Klinik"), "dentist": ("saglik", "Diş"), "doctors": ("saglik", "Muayenehane"),
    "hospital": ("hastane", "Hastane"), "veterinary": ("hayvan", "Veteriner"),
    "car_repair": ("oto", "Oto servis"), "car_wash": ("oto", "Oto yıkama"),
    "vehicle_inspection": ("oto", "Muayene"), "car_rental": ("kiralama", "Araç kiralama"),
    "cinema": ("eglence", "Sinema"), "theatre": ("eglence", "Tiyatro"), "taxi": ("ulasim", "Taksi"),
    "driving_school": ("egitim", "Sürücü kursu"), "language_school": ("egitim", "Dil kursu"),
    "music_school": ("muzik", "Müzik kursu"), "dance_school": ("dans", "Dans kursu"),
    "prep_school": ("egitim", "Etüt"), "internet_cafe": ("teknoloji", "İnternet kafe"),
    "marketplace": ("alisveris", "Pazar"), "post_office": ("ulasim", "Posta"),
    "public_bath": ("hamam", "Hamam"), "nursing_home": ("bakim", "Bakım"), "dojo": ("spor", "Dojo"),
    "events_venue": ("dugun", "Organizasyon"), "conference_centre": ("dugun", "Toplantı"),
    "boat_rental": ("denizcilik", "Tekne"), "laundry": ("kurutemizleme", "Çamaşır"),
    "dry_cleaning": ("kurutemizleme", "Kuru temizleme"), "animal_boarding": ("hayvan", "Pansiyon"),
    "studio": ("medya", "Stüdyo"),
}
TOURISM = {
    "hotel": ("konaklama", "Otel"), "guest_house": ("konaklama", "Pansiyon"), "hostel": ("konaklama", "Hostel"),
    "motel": ("konaklama", "Motel"), "apartment": ("konaklama", "Apart"), "chalet": ("konaklama", "Bungalov"),
    "camp_site": ("konaklama", "Kamp"), "caravan_site": ("konaklama", "Karavan"),
    "gallery": ("sanat", "Galeri"), "theme_park": ("eglence", "Tema park"),
    "zoo": ("eglence", "Hayvanat bahçesi"), "aquarium": ("eglence", "Akvaryum"),
}
OFFICE = {
    "lawyer": ("hukuk", "Avukat"), "notary": ("noter", "Noter"), "estate_agent": ("emlak", "Emlak"),
    "insurance": ("finans", "Sigorta"), "accountant": ("finans", "Muhasebe"), "tax_advisor": ("finans", "Mali müşavir"),
    "financial": ("finans", "Finans"), "architect": ("mimarlik", "Mimar"),
    "engineer": ("muhendislik", "Mühendis"), "construction_company": ("insaat", "Müteahhit"),
    "travel_agent": ("turizm", "Acente"), "advertising_agency": ("medya", "Ajans"),
    "graphic_design": ("medya", "Tasarım"), "it": ("teknoloji", "Bilişim"), "software": ("teknoloji", "Yazılım"),
    "company": ("b2b", "Şirket"), "consulting": ("danismanlik", "Danışmanlık"),
    "logistics": ("ulasim", "Lojistik"), "courier": ("ulasim", "Kargo"),
    "employment_agency": ("danismanlik", "İnsan kaynakları"), "newspaper": ("yayincilik", "Yayınevi"),
    "educational_institution": ("egitim", "Eğitim"), "coworking": ("b2b", "Ofis"),
    "publisher": ("yayincilik", "Yayınevi"), "telecommunication": ("teknoloji", "İletişim"),
    "lawyer_office": ("hukuk", "Avukat"), "yes": ("b2b", "Ofis"),
}
CRAFT = {
    "carpenter": ("dekor", "Marangoz"), "cabinet_maker": ("dekor", "Mobilya"), "furniture": ("dekor", "Mobilya"),
    "electrician": ("usta", "Elektrikçi"), "plumber": ("usta", "Tesisatçı"), "painter": ("ev", "Boya"),
    "plasterer": ("ev", "Sıva"), "roofer": ("cati", "Çatı"), "blacksmith": ("metal", "Demir"),
    "metal_construction": ("metal", "Metal"), "welder": ("metal", "Kaynak"),
    "glaziery": ("cam", "Camcı"), "window_construction": ("cam", "Doğrama"),
    "shoemaker": ("alisveris", "Ayakkabı"), "tailor": ("tekstil", "Terzi"), "dressmaker": ("tekstil", "Dikim"),
    "photographer": ("medya", "Fotoğraf"), "jeweller": ("kuyum", "Kuyumcu"), "watchmaker": ("kuyum", "Saatçi"),
    "bakery": ("yeme", "Fırın"), "caterer": ("gida", "Catering"), "beekeeper": ("tarim", "Arıcılık"),
    "agricultural": ("tarim", "Ziraat"), "hvac": ("enerji", "İklimlendirme"), "key_cutter": ("usta", "Çilingir"),
    "computer": ("teknoloji", "Bilgisayar"), "electronics": ("gsm", "Teknik servis"),
    "optician": ("optik", "Optik"), "builder": ("insaat", "Yapı"), "scaffolder": ("insaat", "İskele"),
    "gardener": ("dekor", "Bahçe"), "locksmith": ("usta", "Çilingir"), "pottery": ("sanat", "Seramik"),
    "tiler": ("ev", "Fayans"), "insulation": ("cati", "İzolasyon"), "stonemason": ("insaat", "Taş"),
    "sawmill": ("insaat", "Kereste"), "handicraft": ("sanat", "El sanatları"), "brewery": ("gida", "İmalat"),
    "winery": ("gida", "İmalat"), "clockmaker": ("kuyum", "Saatçi"),
}
HEALTH = {
    "pharmacy": ("eczane", "Eczane"), "doctor": ("saglik", "Muayenehane"), "dentist": ("saglik", "Diş"),
    "clinic": ("saglik", "Klinik"), "hospital": ("hastane", "Hastane"), "physiotherapist": ("saglik", "Fizik tedavi"),
    "psychologist": ("psikoloji", "Psikolog"), "psychotherapist": ("psikoloji", "Terapi"),
    "psychiatrist": ("psikoloji", "Psikiyatri"), "optometrist": ("optik", "Optik"),
    "laboratory": ("saglik", "Laboratuvar"), "alternative": ("saglik", "Sağlık"),
    "rehabilitation": ("saglik", "Rehabilitasyon"), "audiologist": ("saglik", "İşitme"),
    "speech_therapist": ("saglik", "Terapi"), "midwife": ("saglik", "Ebe"), "nurse": ("saglik", "Hemşire"),
}
LEISURE = {
    "fitness_centre": ("spor", "Fitness"), "sports_centre": ("spor", "Spor"), "sports_hall": ("spor", "Spor salonu"),
    "swimming_pool": ("spor", "Yüzme"), "sauna": ("hamam", "Sauna"), "dance": ("dans", "Dans"),
    "horse_riding": ("spor", "Binicilik"), "golf_course": ("spor", "Golf"), "miniature_golf": ("eglence", "Mini golf"),
    "bowling_alley": ("eglence", "Bowling"), "escape_game": ("eglence", "Kaçış oyunu"),
    "amusement_arcade": ("eglence", "Oyun"), "water_park": ("eglence", "Su parkı"),
    "marina": ("denizcilik", "Marina"), "tanning_salon": ("guzellik", "Solaryum"),
}


def fold(value: str) -> str:
    value = value.replace("İ", "i").replace("I", "ı")
    value = value.casefold()
    for source, target in zip("çğıöşüâîû", "cgiosuaiu"):
        value = value.replace(source, target)
    value = re.sub(r"[^a-z0-9\s]", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def slugify_key(value: str) -> str:
    return fold(value).replace(" ", "-") or "isletme"


def http_json(url: str, data: dict | None = None, timeout: int = 90) -> dict:
    payload = urllib.parse.urlencode(data).encode() if data else None
    request = urllib.request.Request(url, data=payload, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.load(response)


def overpass(query: str) -> dict:
    last = "overpass yanıt vermedi"
    for attempt in range(4):
        for url in MIRRORS:
            try:
                return http_json(url, {"data": query}, timeout=80)
            except Exception as error:
                last = f"{url}: {error}"
                print(f"  mirror fail {url}: {error}", flush=True)
        time.sleep(3 * (attempt + 1))
    raise RuntimeError(last)


def load_ring() -> list[tuple[float, float]]:
    data = http_json(NOMINATIM, timeout=40)
    geometry = data[0]["geojson"]
    if geometry["type"] != "Polygon":
        raise RuntimeError(f"beklenmeyen sınır tipi: {geometry['type']}")
    return [(point[0], point[1]) for point in geometry["coordinates"][0]]


def inside(lat: float, lng: float, ring: list[tuple[float, float]]) -> bool:
    x, y = lng, lat
    contained = False
    j = len(ring) - 1
    for i, (xi, yi) in enumerate(ring):
        xj, yj = ring[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-15) + xi):
            contained = not contained
        j = i
    return contained


def tiles(ring: list[tuple[float, float]]) -> list[tuple[float, float, float, float]]:
    lngs = [point[0] for point in ring]
    lats = [point[1] for point in ring]
    south, north = min(lats), max(lats)
    west, east = min(lngs), max(lngs)
    boxes = []
    lat = south
    while lat < north:
        lng = west
        while lng < east:
            boxes.append((lat, lng, min(lat + 0.16, north), min(lng + 0.2, east)))
            lng += 0.2
        lat += 0.16
    return boxes


def fetch_elements(ring: list[tuple[float, float]]) -> list[dict]:
    found: dict[str, dict] = {}
    boxes = tiles(ring)
    for index, (south, west, north, east) in enumerate(boxes, start=1):
        query = f"""
[out:json][timeout:55];
(
  nwr["name"]["shop"]({south},{west},{north},{east});
  nwr["name"]["craft"]({south},{west},{north},{east});
  nwr["name"]["office"]({south},{west},{north},{east});
  nwr["name"]["healthcare"]({south},{west},{north},{east});
  nwr["name"]["amenity"]({south},{west},{north},{east});
  nwr["name"]["tourism"]({south},{west},{north},{east});
  nwr["name"]["leisure"]({south},{west},{north},{east});
);
out tags center;
""".strip()
        print(f"tile {index}/{len(boxes)} {south:.2f},{west:.2f}", flush=True)
        data = overpass(query)
        for element in data.get("elements", []):
            found[f"{element['type']}/{element['id']}"] = element
        time.sleep(1.2)
    return list(found.values())


def day_span(token: str) -> list[int]:
    token = token.strip()
    if "-" in token:
        start, end = token.split("-", 1)
        if start not in DAY_INDEX or end not in DAY_INDEX:
            return []
        a, b = DAY_INDEX[start], DAY_INDEX[end]
        if a <= b:
            return list(range(a, b + 1))
        return list(range(a, 7)) + list(range(0, b + 1))
    return [DAY_INDEX[token]] if token in DAY_INDEX else []


def parse_hours(raw: str | None) -> list[str] | None:
    if not raw:
        return None
    text = raw.strip()
    if text in {"24/7", "00:00-24:00", "Mo-Su 00:00-24:00"}:
        return ["00:00–24:00"] * 7
    slots = [""] * 7
    seen = [False] * 7
    for part in text.split(";"):
        part = part.strip()
        if not part or part.startswith("PH") or part.startswith("SH"):
            continue
        match = re.match(r"^([A-Za-z]{2}(?:[-,][A-Za-z]{2})*)\s+(.+)$", part)
        if match:
            day_tokens = match.group(1).split(",")
            spec = match.group(2).strip()
            indexes: list[int] = []
            for token in day_tokens:
                indexes.extend(day_span(token))
        else:
            indexes = list(range(7))
            spec = part
        if spec in {"off", "closed"}:
            label = "Kapalı"
        else:
            ranges = re.findall(r"(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})", spec)
            if not ranges:
                continue
            label = ", ".join(f"{start}–{end}" for start, end in ranges)
        for index in indexes:
            seen[index] = True
            slots[index] = label
    if not any(seen):
        return None
    return [slots[index] or "Kayıtta yok" for index in range(7)]


def open_now(hours: list[str] | None, moment: datetime) -> bool:
    if not hours:
        return False
    label = hours[moment.weekday()]
    if label in {"", "Kapalı", "Kayıtta yok"}:
        return False
    if label == "00:00–24:00":
        return True
    current = moment.hour * 60 + moment.minute
    for start, end in re.findall(r"(\d{1,2}:\d{2})–(\d{1,2}:\d{2})", label):
        sh, sm = (int(part) for part in start.split(":"))
        eh, em = (int(part) for part in end.split(":"))
        begin = sh * 60 + sm
        finish = eh * 60 + em
        if finish <= begin:
            if current >= begin or current <= finish:
                return True
        elif begin <= current <= finish:
            return True
    return False


def classify(tags: dict) -> tuple[str, str] | None:
    if tags.get("shop"):
        return SHOP.get(tags["shop"], ("alisveris", "Mağaza"))
    if tags.get("craft"):
        return CRAFT.get(tags["craft"], ("usta", "Atölye"))
    if tags.get("office"):
        if tags["office"] in OFFICE_SKIP:
            return None
        return OFFICE.get(tags["office"], ("b2b", "Ofis"))
    if tags.get("healthcare"):
        return HEALTH.get(tags["healthcare"], ("saglik", "Sağlık"))
    if tags.get("amenity"):
        if tags["amenity"] not in AMENITY_OK:
            return None
        return AMENITY.get(tags["amenity"])
    if tags.get("tourism"):
        if tags["tourism"] not in TOURISM_OK:
            return None
        return TOURISM.get(tags["tourism"])
    if tags.get("leisure"):
        if tags["leisure"] not in LEISURE_OK:
            return None
        return LEISURE.get(tags["leisure"])
    return None


def point_of(element: dict) -> tuple[float, float] | None:
    if "lat" in element and "lon" in element:
        return float(element["lat"]), float(element["lon"])
    center = element.get("center")
    if center:
        return float(center["lat"]), float(center["lon"])
    return None


def first_tag(tags: dict, *keys: str) -> str:
    for key in keys:
        value = tags.get(key, "").strip()
        if value:
            return value.split(";")[0].strip()
    return ""


def website_of(tags: dict) -> str:
    raw = first_tag(tags, "website", "contact:website", "url")
    if not raw or " " in raw:
        return ""
    if raw.startswith("www."):
        raw = f"https://{raw}"
    if raw.startswith("http://") or raw.startswith("https://"):
        return raw
    return ""


def district_of(tags: dict) -> str:
    raw = first_tag(tags, "addr:district", "addr:city", "addr:town", "addr:suburb")
    key = fold(raw)
    named = {
        "eregli": "Karadeniz Ereğli",
        "karadeniz eregli": "Karadeniz Ereğli",
        "kdz eregli": "Karadeniz Ereğli",
        "caycuma": "Çaycuma",
        "devrek": "Devrek",
        "alapli": "Alaplı",
        "gokcebey": "Gökçebey",
        "kilimli": "Kilimli",
        "kozlu": "Kozlu",
        "zonguldak": "Merkez",
        "merkez": "Merkez",
    }
    if key in named:
        return named[key]
    return raw or "Zonguldak"


def address_of(tags: dict, district: str) -> str:
    street = " ".join(part for part in [tags.get("addr:street", "").strip(), tags.get("addr:housenumber", "").strip()] if part)
    pieces = [piece for piece in [street, district, "Zonguldak"] if piece and piece != "Zonguldak"]
    pieces.append("Zonguldak")
    return ", ".join(pieces)


def to_business(element: dict, moment: datetime, used_slugs: set[str]) -> dict | None:
    tags = element.get("tags") or {}
    name = (tags.get("name") or "").strip()
    if len(name) < 2 or len(name) > 80:
        return None
    kind = classify(tags)
    if not kind:
        return None
    category, subcategory = kind
    if category not in META:
        return None
    point = point_of(element)
    if not point:
        return None
    lat, lng = point
    district = district_of(tags)
    phone = first_tag(tags, "phone", "contact:phone", "contact:mobile")
    site = website_of(tags)
    hours = parse_hours(tags.get("opening_hours"))
    label, photo, booking = META[category]
    base = slugify_key(name)
    slug = base
    if slug in used_slugs:
        slug = f"{base}-{element['type']}-{element['id']}"
    used_slugs.add(slug)
    summary = f"{name}, {district} ilçesinde kayıtlı bir {subcategory.lower()}."
    bits = [summary, "Bilgiler OpenStreetMap açık harita kaydından alındı (ODbL)."]
    if phone:
        bits.append(f"Telefon: {phone}.")
    if tags.get("addr:street"):
        bits.append(f"Adres: {tags.get('addr:street', '').strip()}.")
    if tags.get("opening_hours"):
        bits.append(f"Çalışma saati: {tags['opening_hours']}.")
    if site:
        bits.append(f"Site: {site}.")
    bits.append("Google puanı, yorumu ve fotoğrafı kopyalanmadı. Google Haritalar bağlantısı aynı adı ve noktayı açar.")
    facts = [{"label": "İlçe", "value": district}, {"label": "Kayıt", "value": "Açık harita kaydı"}]
    if tags.get("opening_hours"):
        facts.append({"label": "Çalışma saati", "value": tags["opening_hours"]})
    if site:
        facts.append({"label": "Site", "value": site})
    facts.append({"label": "Senkron", "value": moment.date().isoformat()})
    query = urllib.parse.quote(f"{name} {district} Zonguldak")
    cuisine = tags.get("cuisine", "").replace(";", ", ")
    amenity_bits = ["Google Haritalar kaydı"]
    if cuisine:
        amenity_bits.append(cuisine)
    record = {
        "id": f"osm-{element['type']}-{element['id']}",
        "slug": slug,
        "name": name,
        "category": category,
        "subcategory": subcategory,
        "city": "Zonguldak",
        "district": district,
        "address": address_of(tags, district),
        "lat": round(lat, 6),
        "lng": round(lng, 6),
        "phone": phone,
        "rating": 0,
        "reviewCount": 0,
        "priceLevel": 2,
        "openNow": open_now(hours, moment),
        "summary": summary,
        "about": " ".join(bits),
        "services": [],
        "amenities": amenity_bits,
        "tags": ["zonguldak", tags.get("shop") or tags.get("amenity") or tags.get("tourism") or tags.get("office") or tags.get("craft") or tags.get("healthcare") or tags.get("leisure") or category],
        "reviews": [],
        "premium": False,
        "verified": False,
        "responseMinutes": 0,
        "founded": 0,
        "photo": photo,
        "photoPosition": "center",
        "booking": booking,
        "hours": [{"day": day, "hours": (hours[index] if hours else "Kayıtta yok")} for index, day in enumerate(DAYS)],
        "facts": facts,
        "source": "google",
        "googleUrl": f"https://www.google.com/maps/search/?api=1&query={query}",
    }
    if site:
        record["website"] = site
    return record


def self_check() -> None:
    parsed = parse_hours("Mo-Su 09:00-23:00")
    assert parsed == ["09:00–23:00"] * 7
    closed = parse_hours("Mo-Fr 09:00-18:00; Sa-Su off")
    assert closed is not None and closed[0] == "09:00–18:00" and closed[5] == "Kapalı"
    assert parse_hours("24/7") == ["00:00–24:00"] * 7
    assert classify({"amenity": "place_of_worship"}) is None
    assert classify({"shop": "bakery"}) == ("yeme", "Fırın")
    assert classify({"office": "government"}) is None
    noon = datetime(2026, 10, 8, 12, 0, tzinfo=ZoneInfo("Europe/Istanbul"))
    assert open_now(parsed, noon) is True
    assert open_now(["Kapalı"] * 7, noon) is False


def main() -> None:
    self_check()
    ring = load_ring()
    if not inside(41.4526765, 31.787598, ring):
        raise RuntimeError("Zonguldak merkez sınırın dışında kaldı")
    moment = datetime.now(ZoneInfo("Europe/Istanbul"))
    elements = fetch_elements(ring)
    used: set[str] = set()
    businesses = []
    skipped = 0
    for element in elements:
        point = point_of(element)
        if not point or not inside(point[0], point[1], ring):
            skipped += 1
            continue
        record = to_business(element, moment, used)
        if record:
            businesses.append(record)
        else:
            skipped += 1
    businesses.sort(key=lambda item: (fold(item["district"]), fold(item["name"]), item["id"]))
    if len(businesses) < 80:
        raise RuntimeError(f"senkron çok az kayıt döndürdü: {len(businesses)}")
    synced = moment.isoformat(timespec="seconds")
    body = json.dumps(businesses, ensure_ascii=False, indent=2)
    text = f"""import type {{ Business }} from "@/lib/types"

// Bu dosya scripts/sync-zonguldak.py ile üretilir.
// Senkron: {synced}
// Kaynak: OpenStreetMap ilişkisi {RELATION}, ODbL. © OpenStreetMap katkıları.
// Google puanı, yorumu ve fotoğrafı kopyalanmaz. googleUrl, aynı ad ve ilçe için Google Haritalar aramasıdır.
export const zonguldakSyncedAt = "{synced}"
export const zonguldakBusinesses: Business[] = {body}
"""
    with open(OUT, "w", encoding="utf-8") as handle:
        handle.write(text)
    print(f"wrote {len(businesses)} businesses, skipped {skipped}, tiles done")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"senkron başarısız: {error}", file=sys.stderr)
        sys.exit(1)
