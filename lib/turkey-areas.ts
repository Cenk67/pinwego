export type NamedPoint = { name: string; lat: number; lng: number; state: string }

export const turkeyRegions: { name: string; lat: number; lng: number; provinces: NamedPoint[] }[] = [
  {
    name: "Marmara Bölgesi",
    lat: 40.8,
    lng: 28.9,
    provinces: [
      { name: "İstanbul", lat: 41.015, lng: 28.979, state: "Istanbul Province" },
      { name: "Edirne", lat: 41.677, lng: 26.556, state: "Edirne Province" },
      { name: "Kırklareli", lat: 41.735, lng: 27.225, state: "Kırklareli Province" },
      { name: "Tekirdağ", lat: 40.978, lng: 27.511, state: "Tekirdağ Province" },
      { name: "Kocaeli", lat: 40.765, lng: 29.940, state: "Kocaeli Province" },
      { name: "Sakarya", lat: 40.774, lng: 30.394, state: "Sakarya Province" },
      { name: "Yalova", lat: 40.655, lng: 29.277, state: "Yalova Province" },
      { name: "Bursa", lat: 40.195, lng: 29.061, state: "Bursa Province" },
      { name: "Balıkesir", lat: 39.648, lng: 27.883, state: "Balıkesir Province" },
      { name: "Çanakkale", lat: 40.147, lng: 26.409, state: "Çanakkale Province" },
      { name: "Bilecik", lat: 40.142, lng: 29.979, state: "Bilecik Province" },
    ],
  },
  {
    name: "Ege Bölgesi",
    lat: 38.4,
    lng: 28.2,
    provinces: [
      { name: "İzmir", lat: 38.423, lng: 27.143, state: "İzmir Province" },
      { name: "Aydın", lat: 37.845, lng: 27.840, state: "Aydın Province" },
      { name: "Denizli", lat: 37.783, lng: 29.096, state: "Denizli Province" },
      { name: "Muğla", lat: 37.215, lng: 28.364, state: "Muğla Province" },
      { name: "Manisa", lat: 38.614, lng: 27.427, state: "Manisa Province" },
      { name: "Afyonkarahisar", lat: 38.757, lng: 30.539, state: "Afyonkarahisar Province" },
      { name: "Kütahya", lat: 39.420, lng: 29.985, state: "Kütahya Province" },
      { name: "Uşak", lat: 38.674, lng: 29.405, state: "Uşak Province" },
    ],
  },
  {
    name: "Akdeniz Bölgesi",
    lat: 36.9,
    lng: 32.8,
    provinces: [
      { name: "Antalya", lat: 36.896, lng: 30.713, state: "Antalya Province" },
      { name: "Mersin", lat: 36.812, lng: 34.641, state: "Mersin Province" },
      { name: "Adana", lat: 37.000, lng: 35.321, state: "Adana Province" },
      { name: "Hatay", lat: 36.202, lng: 36.160, state: "Hatay Province" },
      { name: "Isparta", lat: 37.765, lng: 30.556, state: "Isparta Province" },
      { name: "Burdur", lat: 37.721, lng: 30.291, state: "Burdur Province" },
      { name: "Osmaniye", lat: 37.074, lng: 36.248, state: "Osmaniye Province" },
      { name: "Kahramanmaraş", lat: 37.575, lng: 36.923, state: "Kahramanmaraş Province" },
    ],
  },
  {
    name: "İç Anadolu Bölgesi",
    lat: 39.2,
    lng: 33.6,
    provinces: [
      { name: "Ankara", lat: 39.920, lng: 32.854, state: "Ankara Province" },
      { name: "Konya", lat: 37.874, lng: 32.493, state: "Konya Province" },
      { name: "Kayseri", lat: 38.721, lng: 35.487, state: "Kayseri Province" },
      { name: "Eskişehir", lat: 39.777, lng: 30.521, state: "Eskişehir Province" },
      { name: "Sivas", lat: 39.750, lng: 37.015, state: "Sivas Province" },
      { name: "Yozgat", lat: 39.820, lng: 34.809, state: "Yozgat Province" },
      { name: "Aksaray", lat: 38.368, lng: 34.030, state: "Aksaray Province" },
      { name: "Niğde", lat: 37.970, lng: 34.679, state: "Niğde Province" },
      { name: "Nevşehir", lat: 38.624, lng: 34.714, state: "Nevşehir Province" },
      { name: "Kırşehir", lat: 39.146, lng: 34.164, state: "Kırşehir Province" },
      { name: "Kırıkkale", lat: 39.845, lng: 33.506, state: "Kırıkkale Province" },
      { name: "Karaman", lat: 37.181, lng: 33.215, state: "Karaman Province" },
      { name: "Çankırı", lat: 40.600, lng: 33.616, state: "Çankırı Province" },
    ],
  },
  {
    name: "Karadeniz Bölgesi",
    lat: 41.0,
    lng: 36.3,
    provinces: [
      { name: "Samsun", lat: 41.286, lng: 36.330, state: "Samsun Province" },
      { name: "Trabzon", lat: 41.003, lng: 39.717, state: "Trabzon Province" },
      { name: "Ordu", lat: 40.984, lng: 37.880, state: "Ordu Province" },
      { name: "Rize", lat: 41.025, lng: 40.518, state: "Rize Province" },
      { name: "Giresun", lat: 40.917, lng: 38.387, state: "Giresun Province" },
      { name: "Zonguldak", lat: 41.453, lng: 31.789, state: "Zonguldak Province" },
      { name: "Bolu", lat: 40.736, lng: 31.606, state: "Bolu Province" },
      { name: "Düzce", lat: 40.844, lng: 31.156, state: "Düzce Province" },
      { name: "Bartın", lat: 41.635, lng: 32.338, state: "Bartın Province" },
      { name: "Karabük", lat: 41.206, lng: 32.623, state: "Karabük Province" },
      { name: "Kastamonu", lat: 41.376, lng: 33.777, state: "Kastamonu Province" },
      { name: "Sinop", lat: 42.027, lng: 35.151, state: "Sinop Province" },
      { name: "Amasya", lat: 40.650, lng: 35.833, state: "Amasya Province" },
      { name: "Tokat", lat: 40.314, lng: 36.554, state: "Tokat Province" },
      { name: "Çorum", lat: 40.550, lng: 34.954, state: "Çorum Province" },
      { name: "Gümüşhane", lat: 40.460, lng: 39.481, state: "Gümüşhane Province" },
      { name: "Bayburt", lat: 40.256, lng: 40.223, state: "Bayburt Province" },
      { name: "Artvin", lat: 41.183, lng: 41.819, state: "Artvin Province" },
    ],
  },
  {
    name: "Doğu Anadolu Bölgesi",
    lat: 39.1,
    lng: 41.3,
    provinces: [
      { name: "Erzurum", lat: 39.905, lng: 41.265, state: "Erzurum Province" },
      { name: "Erzincan", lat: 39.747, lng: 39.493, state: "Erzincan Province" },
      { name: "Malatya", lat: 38.355, lng: 38.310, state: "Malatya Province" },
      { name: "Elazığ", lat: 38.675, lng: 39.223, state: "Elazığ Province" },
      { name: "Van", lat: 38.494, lng: 43.383, state: "Van Province" },
      { name: "Ağrı", lat: 39.720, lng: 43.051, state: "Ağrı Province" },
      { name: "Kars", lat: 40.602, lng: 43.098, state: "Kars Province" },
      { name: "Iğdır", lat: 39.924, lng: 44.045, state: "Iğdır Province" },
      { name: "Ardahan", lat: 41.111, lng: 42.702, state: "Ardahan Province" },
      { name: "Bingöl", lat: 38.885, lng: 40.498, state: "Bingöl Province" },
      { name: "Tunceli", lat: 39.107, lng: 39.548, state: "Tunceli Province" },
      { name: "Bitlis", lat: 38.401, lng: 42.108, state: "Bitlis Province" },
      { name: "Muş", lat: 38.734, lng: 41.491, state: "Muş Province" },
      { name: "Hakkâri", lat: 37.574, lng: 43.741, state: "Hakkâri Province" },
    ],
  },
  {
    name: "Güneydoğu Anadolu Bölgesi",
    lat: 37.5,
    lng: 39.8,
    provinces: [
      { name: "Gaziantep", lat: 37.066, lng: 37.383, state: "Gaziantep Province" },
      { name: "Şanlıurfa", lat: 37.160, lng: 38.791, state: "Şanlıurfa Province" },
      { name: "Diyarbakır", lat: 37.915, lng: 40.231, state: "Diyarbakır Province" },
      { name: "Mardin", lat: 37.313, lng: 40.735, state: "Mardin Province" },
      { name: "Batman", lat: 37.882, lng: 41.132, state: "Batman Province" },
      { name: "Siirt", lat: 37.927, lng: 41.942, state: "Siirt Province" },
      { name: "Şırnak", lat: 37.519, lng: 42.454, state: "Şırnak Province" },
      { name: "Adıyaman", lat: 37.764, lng: 38.279, state: "Adıyaman Province" },
      { name: "Kilis", lat: 36.716, lng: 37.115, state: "Kilis Province" },
    ],
  },
]

export function turkeyRegion(name: string) {
  return turkeyRegions.find((region) => region.name === name)
}

export function turkeyProvince(name: string) {
  for (const region of turkeyRegions) {
    const province = region.provinces.find((item) => item.name === name)
    if (province) return province
  }
  return undefined
}
