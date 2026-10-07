import { BusinessItem } from '@/types/directory';

export const MOCK_BUSINESSES: BusinessItem[] = [
  {
    id: 'biz-1',
    slug: 'lumiere-artisanal-bistro',
    name: 'Lumière Artisanal Bistro & Lounge',
    tagline: 'Modern French fusion with farm-to-table organic ingredients',
    category: 'restaurants',
    categoryName: 'Restoran & Yeme-İçme',
    subcategory: 'Fransız & Akdeniz Mutfağı',
    logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=120&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800&auto=format&fit=crop&q=80'
    ],
    location: {
      address: 'Abdi İpekçi Cad. No: 42, Nişantaşı',
      city: 'İstanbul',
      country: 'Türkiye',
      countryCode: 'TR',
      zipCode: '34367',
      lat: 41.0487,
      lng: 28.9939,
      neighborhood: 'Şişli / Nişantaşı'
    },
    phone: '+90 212 345 8890',
    website: 'https://lumierebistro.example.com',
    email: 'reservation@lumierebistro.com',
    hours: {
      monday: '12:00 - 23:30',
      tuesday: '12:00 - 23:30',
      wednesday: '12:00 - 23:30',
      thursday: '12:00 - 00:30',
      friday: '12:00 - 01:00',
      saturday: '11:00 - 01:00',
      sunday: '11:00 - 22:30',
      isOpenNow: true
    },
    rating: 4.9,
    reviewCount: 348,
    priceLevel: '$$$',
    verified: true,
    foundedYear: 2018,
    employeeCount: '25-50',
    b2bData: {
      dunsNumber: '78-392-1049',
      creditTrustScore: 94,
      riskLevel: 'Low',
      taxVerified: true,
      annualRevenueRange: '$1.2M - $2.5M',
      complianceStatus: 'Active & In Good Standing'
    },
    instantBookingEnabled: true,
    rfqEnabled: true,
    estimatedResponseTime: '10 dk içinde',
    services: [
      {
        id: 'srv-101',
        name: 'Şefin Tadım Menüsü (5 Aşamalı)',
        description: 'Mevsimsel gurme lezzetler, özel soslar ve şarap eşleşmesi opsiyonu.',
        price: 2400,
        durationMinutes: 120,
        priceType: 'fixed',
        instantBookable: true
      },
      {
        id: 'srv-102',
        name: 'Özel Salon & VIP Masa Rezervasyonu',
        description: 'İş yemekleri ve özel kutlamalar için 8-12 kişilik özel oda tahsisi.',
        price: 7500,
        durationMinutes: 180,
        priceType: 'starting_at',
        instantBookable: true
      },
      {
        id: 'srv-103',
        name: 'Kurumsal Etkinlik & Catering Hizmeti',
        description: 'Ofis ve özel mekanlarınız için tam kapsamlı şef ve kokteyl servisi.',
        price: 15000,
        priceType: 'quote_required',
        instantBookable: false
      }
    ],
    aiScore: 97,
    aiSummary: {
      strengths: [
        'Kusursuz taze deniz ürünleri ve el yapımı ekşi mayalı ekmekler',
        'Son 90 günde %98 pozitif misafir memnuniyeti',
        'Romantik akşam yemekleri ve üst düzey iş toplantıları için ideal akustik'
      ],
      highlightQuote: 'İstanbul’da Fransız bistro atmosferini yerel gurme tatlarla harmanlayan en başarılı mekan.',
      bestFor: ['Romantik Akşam Yemeği', 'Kurumsal İş Toplantısı', 'Gurme Tadım'],
      sentimentSummary: 'Yorumların %94’ü servis hızı ve şefin tabaklama sanatını övüyor.',
      recommendedServices: ['Şefin Tadım Menüsü (5 Aşamalı)', 'Özel Salon Rezervasyonu']
    },
    keywords: ['fransız', 'restoran', 'bistro', 'nişantaşı', 'gurme', 'şarap', 'romantik', 'tadım menüsü', 'lüks', 'istanbul'],
    promoted: true
  },
  {
    id: 'biz-2',
    slug: 'apex-craftsman-home-renovation',
    name: 'Apex Yapı & Akıllı Ev Dönüşümü',
    tagline: 'A’dan Z’ye mimari tadilat, iç mimarlık ve enerji verimli akıllı ev sistemleri',
    category: 'home-services',
    categoryName: 'Ev Hizmetleri & Tadilat',
    subcategory: 'İç Mimarlık & Komple Yenileme',
    logo: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=120&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80'
    ],
    location: {
      address: 'Bağdat Caddesi No: 218/4, Kadıköy',
      city: 'İstanbul',
      country: 'Türkiye',
      countryCode: 'TR',
      zipCode: '34728',
      lat: 40.9634,
      lng: 29.0682,
      neighborhood: 'Kadıköy / Suadiye'
    },
    phone: '+90 216 450 1920',
    website: 'https://apexyapi.example.com',
    email: 'info@apexyapi.com',
    hours: {
      monday: '08:30 - 18:30',
      tuesday: '08:30 - 18:30',
      wednesday: '08:30 - 18:30',
      thursday: '08:30 - 18:30',
      friday: '08:30 - 18:30',
      saturday: '09:00 - 16:00',
      sunday: 'Kapalı',
      isOpenNow: true
    },
    rating: 4.8,
    reviewCount: 184,
    priceLevel: '$$$$',
    verified: true,
    foundedYear: 2012,
    employeeCount: '50-100',
    b2bData: {
      dunsNumber: '53-901-8422',
      creditTrustScore: 96,
      riskLevel: 'Low',
      taxVerified: true,
      annualRevenueRange: '$4.5M - $10M',
      complianceStatus: 'Active & In Good Standing'
    },
    instantBookingEnabled: true,
    rfqEnabled: true,
    estimatedResponseTime: '15 dk içinde',
    services: [
      {
        id: 'srv-201',
        name: 'Ücretsiz Yerinde Keşif & 3D Render Ön Proje',
        description: 'Mimarımız mekanınıza gelir, ölçüm alır ve 48 saatte ön bütçe ve 3D konsept sunar.',
        price: 0,
        durationMinutes: 60,
        priceType: 'fixed',
        instantBookable: true
      },
      {
        id: 'srv-202',
        name: 'Mutfak & Banyo Premium Yenileme',
        description: 'Su tesisatı, İtalyan seramik kaplama, özel imalat lake dolaplar ve ankastre montajı.',
        price: 85000,
        priceType: 'starting_at',
        instantBookable: false
      },
      {
        id: 'srv-203',
        name: 'Komple Daire Tadilatı & Akıllı Ev Otomasyonu',
        description: 'Yalıtım, elektrik, aydınlatma otomasyonu, zemin kaplama ve mimari teslimat.',
        price: 320000,
        priceType: 'starting_at',
        instantBookable: false
      }
    ],
    portfolio: [
      {
        id: 'p-1',
        title: 'Suadiye 4+1 Dubleks Modern Minimalist Proje',
        imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
        costEstimate: '750.000 ₺',
        completionTime: '45 Gün'
      },
      {
        id: 'p-2',
        title: 'Bebek Sahil Rezidans Akıllı Aydınlatma & Mutfak',
        imageUrl: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=800&auto=format&fit=crop&q=80',
        costEstimate: '420.000 ₺',
        completionTime: '25 Gün'
      }
    ],
    aiScore: 98,
    aiSummary: {
      strengths: [
        'Sözleşmeli sabit fiyat garantisi ve gecikme tazminatı taahhüdü',
        'ISO 9001 ve TMMOB onaylı mimar ve mühendis kadrosu',
        '3D VR gözlük ile bitmiş hali önceden deneyimleme olanağı'
      ],
      highlightQuote: 'Bütçe aşımı yapmadan tam taahhüt edilen günde anahtar teslim ettiler.',
      bestFor: ['Komple Ev Tadilatı', 'Lüks Villa Renovasyonu', 'Ofis Dönüşümü'],
      sentimentSummary: 'Yorumlarda %97 oranında şeffaf fiyatlandırma ve işçilik kalitesi öne çıkıyor.',
      recommendedServices: ['Ücretsiz Yerinde Keşif & 3D Render Ön Proje']
    },
    keywords: ['tadilat', 'iç mimar', 'ev dekorasyon', 'mutfak yenileme', 'banyo', 'kadıköy', 'inşaat', 'akıllı ev', 'usta', 'teklif'],
    promoted: true
  },
  {
    id: 'biz-3',
    slug: 'aurora-spa-aesthetic-clinic',
    name: 'Aurora Aesthetic & Holistic Wellness Clinic',
    tagline: 'Kişiselleştirilmiş medikal estetik, anti-aging ve holistik spa terapileri',
    category: 'beauty-wellness',
    categoryName: 'Güzellik & Sağlık',
    subcategory: 'Medikal Estetik & Spa',
    logo: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=120&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?w=800&auto=format&fit=crop&q=80'
    ],
    location: {
      address: 'Zorlu Center Terrazzo Katı No: 12, Beşiktaş',
      city: 'İstanbul',
      country: 'Türkiye',
      countryCode: 'TR',
      zipCode: '34340',
      lat: 41.0664,
      lng: 29.0177,
      neighborhood: 'Levazım / Beşiktaş'
    },
    phone: '+90 212 998 7744',
    website: 'https://auroraclinic.example.com',
    email: 'contact@auroraclinic.com',
    hours: {
      monday: '10:00 - 20:00',
      tuesday: '10:00 - 20:00',
      wednesday: '10:00 - 20:00',
      thursday: '10:00 - 20:00',
      friday: '10:00 - 20:00',
      saturday: '10:00 - 20:00',
      sunday: '11:00 - 18:00',
      isOpenNow: true
    },
    rating: 4.95,
    reviewCount: 412,
    priceLevel: '$$$',
    verified: true,
    foundedYear: 2017,
    employeeCount: '20-30',
    b2bData: {
      dunsNumber: '44-129-8831',
      creditTrustScore: 92,
      riskLevel: 'Low',
      taxVerified: true,
      complianceStatus: 'Active & In Good Standing'
    },
    instantBookingEnabled: true,
    rfqEnabled: true,
    estimatedResponseTime: '5 dk içinde',
    services: [
      {
        id: 'srv-301',
        name: 'Hydra-Glow Derin Cilt Bakımı & Kolajen Terapisi',
        description: 'Vakum teknolojisiyle gözenek temizleme, antioksidan serum ve LED ışık terapisi.',
        price: 2200,
        durationMinutes: 75,
        priceType: 'fixed',
        instantBookable: true
      },
      {
        id: 'srv-302',
        name: 'Aromaterapi Sıcak Taş Masajı',
        description: 'Organik esansiyel yağlar ve volkanik bazalt taşlarla derin kas gevşetici masaj.',
        price: 1850,
        durationMinutes: 60,
        priceType: 'fixed',
        instantBookable: true
      },
      {
        id: 'srv-303',
        name: 'Dermatolog Konsültasyonu & AI Cilt Analizi',
        description: '3D spektrofotometrik cilt taraması ve hekim kontrolünde tedavi planlaması.',
        price: 1500,
        durationMinutes: 45,
        priceType: 'fixed',
        instantBookable: true
      }
    ],
    aiScore: 96,
    aiSummary: {
      strengths: [
        'FDA onaylı cihaz parkuru ve uzman dermatolog kadrosu',
        'Booksy standartlarında anında SMS ve takvim teyitli randevu',
        'Kişiselleştirilmiş organik serum formülasyonları'
      ],
      highlightQuote: 'Cilt sağlığımda gördüğüm en hızlı ve etkili medikal dönüşüm.',
      bestFor: ['Derin Cilt Bakımı', 'Stres Yönetimi ve Spa', 'Anti-Aging'],
      sentimentSummary: 'Kullanıcıların %99’u hijyen standartlarını ve uzmanların ilgisini tam puanla değerlendirdi.',
      recommendedServices: ['Hydra-Glow Derin Cilt Bakımı', 'Aromaterapi Sıcak Taş Masajı']
    },
    keywords: ['spa', 'güzellik', 'cilt bakımı', 'masaj', 'dermatolog', 'estetik', 'beşiktaş', 'zorlu', 'wellness', 'randevu'],
    promoted: false
  },
  {
    id: 'biz-4',
    slug: 'novasphere-cloud-ai-consulting',
    name: 'NovaSphere Cloud & Enterprise AI Solutions',
    tagline: 'Kurumsal yapay zeka dönüşümü, büyük veri mimarisi ve bulut güvenlik danışmanlığı',
    category: 'b2b-consulting',
    categoryName: 'B2B & Kurumsal Danışmanlık',
    subcategory: 'Yapay Zeka & Bulut Bilişim',
    logo: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=120&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80'
    ],
    location: {
      address: 'Büyükdere Caddesi Spine Tower K:26, Maslak',
      city: 'İstanbul',
      country: 'Türkiye',
      countryCode: 'TR',
      zipCode: '34398',
      lat: 41.1105,
      lng: 29.0212,
      neighborhood: 'Sarıyer / Maslak'
    },
    phone: '+90 212 288 3300',
    website: 'https://novasphere.example.com',
    email: 'enterprise@novasphere.com',
    hours: {
      monday: '09:00 - 18:30',
      tuesday: '09:00 - 18:30',
      wednesday: '09:00 - 18:30',
      thursday: '09:00 - 18:30',
      friday: '09:00 - 18:30',
      saturday: 'Kapalı',
      sunday: 'Kapalı',
      isOpenNow: true
    },
    rating: 4.9,
    reviewCount: 96,
    priceLevel: '$$$$',
    verified: true,
    foundedYear: 2016,
    employeeCount: '100-250',
    b2bData: {
      dunsNumber: '32-841-9920',
      creditTrustScore: 99,
      riskLevel: 'Low',
      taxVerified: true,
      annualRevenueRange: '$12M - $25M',
      exportMarkets: ['Almanya', 'Birleşik Krallık', 'Hollanda', 'BAE', 'ABD'],
      complianceStatus: 'Active & In Good Standing'
    },
    instantBookingEnabled: true,
    rfqEnabled: true,
    estimatedResponseTime: '30 dk içinde',
    services: [
      {
        id: 'srv-401',
        name: 'Kurumsal AI & Veri Stratejisi Keşif Çalıştayı',
        description: 'Üst yönetim ve IT ekipleri için 2 günlük odak grup analizi ve yol haritası dokümanı.',
        price: 45000,
        priceType: 'fixed',
        instantBookable: true
      },
      {
        id: 'srv-402',
        name: 'Özel LLM / Yapay Zeka Ajanı Geliştirme',
        description: 'Şirket içi veri tabanlarınız üzerinde çalışan güvenli, regülasyona uyumlu yapay zeka.',
        price: 180000,
        priceType: 'starting_at',
        instantBookable: false
      },
      {
        id: 'srv-403',
        name: 'AWS & Azure Bulut Maliyet & Güvenlik Denetimi',
        description: 'Altyapı audit raporu, FinOps optimizasyonu ile %35 e varan fatura tasarrufu garantisi.',
        price: 65000,
        priceType: 'starting_at',
        instantBookable: false
      }
    ],
    aiScore: 99,
    aiSummary: {
      strengths: [
        'Dun & Bradstreet kurumsal güven skoru 99/100, Tier-1 banka referansları',
        'ISO 27001 ve SOC 2 Type II uluslararası sertifikasyon',
        'Büyük ölçekli veri gölü ve agentic AI mimarisinde kanıtlanmış ROI'
      ],
      highlightQuote: 'Şirketimizin müşteri destek süreçlerini AI ile otomatikleştirerek maliyetimizi %40 düşürdüler.',
      bestFor: ['Kurumsal Yapay Zeka', 'Cloud FinOps', 'Büyük Veri Mimarisi'],
      sentimentSummary: 'B2B karar vericilerin %100’ü teknik yetkinlik ve proje teslim disiplinini onaylıyor.',
      recommendedServices: ['Kurumsal AI Keşif Çalıştayı', 'Özel LLM Geliştirme']
    },
    keywords: ['b2b', 'yapay zeka', 'ai', 'danışmanlık', 'bulut', 'maslak', 'yazılım', 'kurumsal', 'duns', 'büyük veri'],
    promoted: true
  },
  {
    id: 'biz-5',
    slug: 'voltan-german-auto-tech',
    name: 'Voltan Pro Otomotiv & Hibrit Servis',
    tagline: 'Alman otomobilleri ve elektrikli araçlar için yetkili standartta özel servis ve ekspertiz',
    category: 'automotive',
    categoryName: 'Otomotiv & Araç Bakım',
    subcategory: 'Özel Servis & Diagnostik',
    logo: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=120&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=1200&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&auto=format&fit=crop&q=80'
    ],
    location: {
      address: 'Atatürk Oto Sanayi Sitesi 2. Kısım 34. Sok No: 18, Maslak',
      city: 'İstanbul',
      country: 'Türkiye',
      countryCode: 'TR',
      zipCode: '34398',
      lat: 41.1158,
      lng: 29.0294,
      neighborhood: 'Maslak Oto Sanayi'
    },
    phone: '+90 212 276 9011',
    website: 'https://voltanoto.example.com',
    email: 'servis@voltanoto.com',
    hours: {
      monday: '08:00 - 18:30',
      tuesday: '08:00 - 18:30',
      wednesday: '08:00 - 18:30',
      thursday: '08:00 - 18:30',
      friday: '08:00 - 18:30',
      saturday: '08:30 - 15:30',
      sunday: 'Kapalı',
      isOpenNow: true
    },
    rating: 4.85,
    reviewCount: 228,
    priceLevel: '$$',
    verified: true,
    foundedYear: 2009,
    employeeCount: '15-30',
    b2bData: {
      dunsNumber: '19-482-7711',
      creditTrustScore: 88,
      riskLevel: 'Low',
      taxVerified: true,
      complianceStatus: 'Active & In Good Standing'
    },
    instantBookingEnabled: true,
    rfqEnabled: true,
    estimatedResponseTime: '10 dk içinde',
    services: [
      {
        id: 'srv-501',
        name: 'Bilgisayarlı Diagnostik & Genel Periyodik Bakım',
        description: 'Motor yağı, filtreler, fren hidroliği, 40 nokta güvenlik kontrolü ve bilgisayar testi.',
        price: 4200,
        durationMinutes: 90,
        priceType: 'starting_at',
        instantBookable: true
      },
      {
        id: 'srv-502',
        name: 'Elektrikli & Hibrit Araç Batarya & İnvertör Sağlık Testi',
        description: 'Yüksek voltaj batarya hücre balansı, şarj protokolü testi ve termal sistem kontrolü.',
        price: 3500,
        durationMinutes: 60,
        priceType: 'fixed',
        instantBookable: true
      },
      {
        id: 'srv-503',
        name: 'Şanzıman & Mekatronik Revizyonu',
        description: 'DSG, S-Tronic ve ZF 8HP şanzıman yazılımı ve mekanik onarım garantisi.',
        price: 24000,
        priceType: 'quote_required',
        instantBookable: false
      }
    ],
    aiScore: 94,
    aiSummary: {
      strengths: [
        'Orijinal parça garantisi ve şeffaf video/fotoğraflı WhatsApp onay süreci',
        'Elektrikli ve hibrit araçlarda yetkili servis tecrübesine sahip usta başı',
        'İkame araç desteği ve aynı gün periyodik bakım teslimi'
      ],
      highlightQuote: 'Yetkili servisin yarı fiyatına orijinal parça ve çok daha ilgili bir servis deneyimi.',
      bestFor: ['BMW, Audi, Mercedes Bakımı', 'Elektrikli Araç Kontrolü', 'Hızlı Periyodik Bakım'],
      sentimentSummary: 'Kullanıcılar özellikle değişen parçaların eski hallerinin teslim edilmesini ve dürüstlüğü övüyor.',
      recommendedServices: ['Bilgisayarlı Diagnostik & Periyodik Bakım']
    },
    keywords: ['oto servis', 'maslak', 'oto sanayi', 'araba tamiri', 'bmw', 'audi', 'mercedes', 'periyodik bakım', 'fren', 'hibrit'],
    promoted: false
  },
  {
    id: 'biz-6',
    slug: 'medident-dental-implant-clinic',
    name: 'MediDent Estetik Diş & İmplantoloji Merkezi',
    tagline: 'Dijital gülüş tasarımı, 3D tomografi ve ağrısız lazer destekli diş hekimliği',
    category: 'health-medical',
    categoryName: 'Sağlık & Medikal',
    subcategory: 'Diş Kliniği & Gülüş Tasarımı',
    logo: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=120&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1200&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop&q=80'
    ],
    location: {
      address: 'Teşvikiye Cad. No: 18 Daire 4, Nişantaşı',
      city: 'İstanbul',
      country: 'Türkiye',
      countryCode: 'TR',
      zipCode: '34365',
      lat: 41.0498,
      lng: 28.9912,
      neighborhood: 'Şişli / Teşvikiye'
    },
    phone: '+90 212 234 6060',
    website: 'https://medident.example.com',
    email: 'hello@medident.com',
    hours: {
      monday: '09:00 - 19:30',
      tuesday: '09:00 - 19:30',
      wednesday: '09:00 - 19:30',
      thursday: '09:00 - 19:30',
      friday: '09:00 - 19:30',
      saturday: '09:30 - 17:00',
      sunday: 'Kapalı',
      isOpenNow: true
    },
    rating: 4.96,
    reviewCount: 389,
    priceLevel: '$$$',
    verified: true,
    foundedYear: 2014,
    employeeCount: '20-40',
    b2bData: {
      dunsNumber: '61-709-3318',
      creditTrustScore: 95,
      riskLevel: 'Low',
      taxVerified: true,
      annualRevenueRange: '$2M - $5M',
      complianceStatus: 'Active & In Good Standing'
    },
    instantBookingEnabled: true,
    rfqEnabled: true,
    estimatedResponseTime: '5 dk içinde',
    services: [
      {
        id: 'srv-601',
        name: 'Dijital Röntgen & Kapsamlı Muayene',
        description: 'Panoramik röntgen çekimi, çene ve diş eti sağlığı haritalandırması.',
        price: 750,
        durationMinutes: 30,
        priceType: 'fixed',
        instantBookable: true
      },
      {
        id: 'srv-602',
        name: 'Ofis Tipi Lazerli Diş Beyazlatma (Zoom)',
        description: 'Tek seansta 4-6 tona kadar beyazlık sağlayan güvenli klinik uygulama.',
        price: 4500,
        durationMinutes: 60,
        priceType: 'fixed',
        instantBookable: true
      },
      {
        id: 'srv-603',
        name: 'Zirkonyum / E-Max Porselen Kaplama',
        description: 'Doğal diş ışık geçirgenliğine sahip, bilgisayar destekli CAD-CAM üretimi.',
        price: 6000,
        priceType: 'starting_at',
        instantBookable: false
      }
    ],
    aiScore: 97,
    aiSummary: {
      strengths: [
        'Korkusuz ve ağrısız tedavi garantisi sunan sedasyon ünitesi',
        'Avrupa Diş Hekimleri Birliği (EDA) akreditasyonu ve uluslararası hasta portföyü',
        'Aynı gün içinde porselen restorasyon (In-house CAD/CAM laboratuvarı)'
      ],
      highlightQuote: 'Dişçi fobimi 1 günde yendim, gülüş tasarımı beklentimin çok ötesinde oldu.',
      bestFor: ['Gülüş Tasarımı', 'İmplant Cerrahisi', 'Diş Beyazlatma'],
      sentimentSummary: 'Yorumların %98’i hekimlerin güler yüzü ve sterilizasyon standartlarından hayranlıkla bahsediyor.',
      recommendedServices: ['Lazerli Diş Beyazlatma', 'Dijital Muayene']
    },
    keywords: ['diş hekimi', 'implant', 'gülüş tasarımı', 'zirkonyum', 'nişantaşı', 'beyazlatma', 'diş kliniği', 'doktor', 'randevu'],
    promoted: false
  },
  {
    id: 'biz-7',
    slug: 'pixelcraft-digital-agency',
    name: 'PixelCraft Creative & Growth Studio',
    tagline: 'Global ölçekli UI/UX tasarım, mobil uygulama geliştirme ve büyüme odaklı SEO pazarlama',
    category: 'tech-creative',
    categoryName: 'Teknoloji & Tasarım',
    subcategory: 'Yazılım, Mobil & Dijital Pazarlama',
    logo: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=120&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80'
    ],
    location: {
      address: 'Kolektif House Levent, Talatpaşa Cad. No: 5, Levent',
      city: 'İstanbul',
      country: 'Türkiye',
      countryCode: 'TR',
      zipCode: '34394',
      lat: 41.0784,
      lng: 29.0118,
      neighborhood: 'Beşiktaş / Levent'
    },
    phone: '+90 212 371 8840',
    website: 'https://pixelcraft.example.com',
    email: 'growth@pixelcraft.com',
    hours: {
      monday: '09:00 - 18:00',
      tuesday: '09:00 - 18:00',
      wednesday: '09:00 - 18:00',
      thursday: '09:00 - 18:00',
      friday: '09:00 - 18:00',
      saturday: 'Kapalı',
      sunday: 'Kapalı',
      isOpenNow: true
    },
    rating: 4.88,
    reviewCount: 114,
    priceLevel: '$$$',
    verified: true,
    foundedYear: 2019,
    employeeCount: '25-50',
    b2bData: {
      dunsNumber: '82-641-0019',
      creditTrustScore: 91,
      riskLevel: 'Low',
      taxVerified: true,
      annualRevenueRange: '$1M - $3M',
      complianceStatus: 'Active & In Good Standing'
    },
    instantBookingEnabled: true,
    rfqEnabled: true,
    estimatedResponseTime: '20 dk içinde',
    services: [
      {
        id: 'srv-701',
        name: '30 Dakikalık Büyüme & Web Audit Görüşmesi',
        description: 'Sitenizin hız, SEO ve dönüşüm oranı eksikliklerini canlı inceliyoruz.',
        price: 0,
        durationMinutes: 30,
        priceType: 'fixed',
        instantBookable: true
      },
      {
        id: 'srv-702',
        name: 'Kurumsal Web Sitesi & Next.js Headless Mimari',
        description: 'Mobil uyumlu, ultra hızlı ve modern CMS entegrasyonlu uçtan uca web platformu.',
        price: 45000,
        priceType: 'starting_at',
        instantBookable: false
      },
      {
        id: 'srv-703',
        name: 'Performans Pazarlaması & Google / Meta Reklam Yönetimi',
        description: 'Veri odaklı funnel optimizasyonu ve aylık ROAS garantili reklam idaresi.',
        price: 25000,
        priceType: 'starting_at',
        instantBookable: false
      }
    ],
    aiScore: 95,
    aiSummary: {
      strengths: [
        'Awwwards ve Red Dot tasarım ödüllü kreatif kadro',
        'Next.js, React ve iOS/Android Native geliştirme yetkinliği',
        'Dönüşüm odaklı landing page ve B2B SaaS büyüme uzmanlığı'
      ],
      highlightQuote: 'Sitemizi yeniledikten sonra organik lead sayımız 3 ayda 2.5 katına çıktı.',
      bestFor: ['Startup MVP Geliştirme', 'SEO & Dijital Pazarlama', 'UI/UX Yenileme'],
      sentimentSummary: 'Müşteriler hızlı sprint teslimatlarını ve yüksek iletişim kalitesini takdir ediyor.',
      recommendedServices: ['30 Dakikalık Büyüme & Web Audit', 'Kurumsal Web Sitesi']
    },
    keywords: ['ajans', 'yazılım', 'web tasarım', 'seo', 'dijital pazarlama', 'mobil uygulama', 'levent', 'b2b', 'yaratıcı'],
    promoted: false
  },
  {
    id: 'biz-8',
    slug: 'bosphorus-event-catering',
    name: 'Bosphorus Gala & Gourmet Catering',
    tagline: 'Boğaz manzaralı düğünler, lüks resepsiyonlar ve diplomatik davetler için kurumsal gastronomi',
    category: 'restaurants',
    categoryName: 'Restoran & Yeme-İçme',
    subcategory: 'Gala & Organizasyon Catering',
    logo: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=120&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1555244162-803834f70033?w=800&auto=format&fit=crop&q=80'
    ],
    location: {
      address: 'Kuruçeşme Cad. No: 64, Beşiktaş',
      city: 'İstanbul',
      country: 'Türkiye',
      countryCode: 'TR',
      zipCode: '34345',
      lat: 41.0589,
      lng: 29.0345,
      neighborhood: 'Kuruçeşme / Beşiktaş'
    },
    phone: '+90 212 263 1120',
    website: 'https://bosphorusgala.example.com',
    email: 'events@bosphorusgala.com',
    hours: {
      monday: '09:00 - 20:00',
      tuesday: '09:00 - 20:00',
      wednesday: '09:00 - 20:00',
      thursday: '09:00 - 20:00',
      friday: '09:00 - 20:00',
      saturday: '09:00 - 20:00',
      sunday: '10:00 - 18:00',
      isOpenNow: true
    },
    rating: 4.92,
    reviewCount: 205,
    priceLevel: '$$$$',
    verified: true,
    foundedYear: 2011,
    employeeCount: '50-100',
    b2bData: {
      dunsNumber: '92-104-5821',
      creditTrustScore: 97,
      riskLevel: 'Low',
      taxVerified: true,
      annualRevenueRange: '$3M - $7M',
      complianceStatus: 'Active & In Good Standing'
    },
    instantBookingEnabled: true,
    rfqEnabled: true,
    estimatedResponseTime: '15 dk içinde',
    services: [
      {
        id: 'srv-801',
        name: 'Etkinlik Menüsü Tadım Randevusu (2 Kişilik)',
        description: 'Düğün ve gala öncesi mutfağımızda şef eşliğinde özel menü tadımı.',
        price: 1500,
        durationMinutes: 90,
        priceType: 'fixed',
        instantBookable: true
      },
      {
        id: 'srv-802',
        name: 'Kokteyl Prolonge Menü (Kişi Başı)',
        description: 'Sıcak & soğuk finger-food lezzetler, barmen kokteylleri ve servis personeli.',
        price: 1200,
        priceType: 'starting_at',
        instantBookable: false
      }
    ],
    aiScore: 96,
    aiSummary: {
      strengths: [
        'Uluslararası lider zirvelerinde ve düğünlerde kanıtlanmış operasyonel başarı',
        'Mobil lüks mutfak tırları ile her noktada taze sıcak servis',
        'Kişiye özel sommelier ve miksoloji eşleşmeleri'
      ],
      highlightQuote: '500 kişilik şirket kutlamamızda bir tek pürüz bile yaşanmadı, yemekler sıcacıktı.',
      bestFor: ['Düğün & Nişan Organizasyonu', 'Kurumsal Gala Yemeği', 'VIP Kokteyl'],
      sentimentSummary: 'Yorumların tamamı servis zarafeti ve lezzet kalitesini vurguluyor.',
      recommendedServices: ['Etkinlik Menüsü Tadım Randevusu']
    },
    keywords: ['catering', 'düğün', 'etkinlik', 'gala', 'kuruçeşme', 'boğaz', 'yemek servisi', 'organizasyon', 'teklif al'],
    promoted: false
  }
];

export const MOCK_REVIEWS = [
  {
    id: 'rev-1',
    businessId: 'biz-1',
    authorName: 'Selin Yılmaz',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    rating: 5,
    date: '3 gün önce',
    comment: 'Nişan yıldönümümüz için şefin tadım menüsünü tercih ettik. Atmosfer, müzik seçimi ve özellikle trüflü başlangıçlar büyüleyiciydi. Rezervasyonumuz Booksy entegrasyonu sayesinde saniyeler içinde onaylandı.',
    verifiedCustomer: true,
    sentiment: 'positive' as const,
    tags: ['Tadım Menüsü', 'Romantik', 'Hızlı Rezervasyon'],
    serviceUsed: 'Şefin Tadım Menüsü'
  },
  {
    id: 'rev-2',
    businessId: 'biz-2',
    authorName: 'Emre Karaca (Şirket Yöneticisi)',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    rating: 5,
    date: '1 hafta önce',
    comment: 'Kadıköy’deki 3+1 dairemizin komple banyo ve mutfak tadilatını yaptırdık. AI teklif aracı üzerinden aldığımız ön fiyat neredeyse kuruşu kuruşuna tuttu. Mimar Burak Bey ve ustaları tertemiz teslim ettiler.',
    verifiedCustomer: true,
    sentiment: 'positive' as const,
    tags: ['Zamanında Teslim', 'Fiyat Garantisi', 'Mükemmel İşçilik'],
    serviceUsed: 'Mutfak & Banyo Yenileme'
  },
  {
    id: 'rev-3',
    businessId: 'biz-4',
    authorName: 'Dr. Ahmet Özkan (CTO, FinTech)',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    rating: 5,
    date: '2 hafta önce',
    comment: 'D&B skoru yüksek bir B2B danışmanlık arıyorduk. NovaSphere ekibi 4 haftada iç dokümanlarımızla konuşan özel LLM ajanımızı yayına aldı. Güvenlik protokolleri ve SOC 2 uyumlulukları içimizi çok rahatlattı.',
    verifiedCustomer: true,
    sentiment: 'positive' as const,
    tags: ['B2B Güvenilir', 'Agentic AI', 'SOC 2 Uyumlu'],
    serviceUsed: 'Özel LLM Geliştirme'
  }
];

export const DIRECTORY_CATEGORIES = [
  { id: 'all', name: 'Tüm Sektörler', icon: 'Sparkles', count: 8 },
  { id: 'restaurants', name: 'Restoran & Yeme-İçme', icon: 'Utensils', count: 2 },
  { id: 'home-services', name: 'Ev & Tadilat', icon: 'Home', count: 1 },
  { id: 'beauty-wellness', name: 'Güzellik & Spa', icon: 'Flower2', count: 1 },
  { id: 'b2b-consulting', name: 'B2B & Danışmanlık', icon: 'Briefcase', count: 1 },
  { id: 'automotive', name: 'Otomotiv & Servis', icon: 'Car', count: 1 },
  { id: 'health-medical', name: 'Sağlık & Medikal', icon: 'HeartPulse', count: 1 },
  { id: 'tech-creative', name: 'Teknoloji & Tasarım', icon: 'Laptop', count: 1 }
];

export const TOP_GLOBAL_DIRECTORIES_SYNTHESIS = [
  { name: 'Yelp & Tripadvisor', feature: 'Doğrulanmış Müşteri Yorumları & Duygu Analizi', icon: 'Star' },
  { name: 'MapQuest & Loc8NearMe', feature: 'İnteraktif Mesafe, Harita & Yakınımda Arama', icon: 'MapPin' },
  { name: 'Booksy & TaskRabbit', feature: 'Anında Online Randevu & Takvim Rezervasyonu', icon: 'CalendarCheck' },
  { name: 'Thumbtack & Angi', feature: 'Yapay Zeka Destekli Fiyat Teklifi (Instant RFQ)', icon: 'FileSpreadsheet' },
  { name: 'Dun & Bradstreet & Kompass', feature: 'Kurumsal Güven Skoru & B2B Ticari İstihbarat', icon: 'ShieldCheck' },
  { name: 'Houzz', feature: 'Önce & Sonra Portfolyo Galerisi ve Bütçe Tahmini', icon: 'Palette' }
];
