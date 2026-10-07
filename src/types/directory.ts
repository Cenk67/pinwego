export type BusinessCategory = 
  | 'restaurants' 
  | 'home-services' 
  | 'beauty-wellness' 
  | 'b2b-consulting' 
  | 'automotive' 
  | 'health-medical' 
  | 'tech-creative';

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes?: number;
  priceType: 'fixed' | 'hourly' | 'starting_at' | 'quote_required';
  category?: string;
  instantBookable: boolean;
}

export interface ReviewItem {
  id: string;
  authorName: string;
  authorAvatar?: string;
  rating: number; // 1 to 5
  date: string;
  comment: string;
  verifiedCustomer: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
  tags: string[];
  serviceUsed?: string;
}

export interface BusinessItem {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: BusinessCategory;
  categoryName: string;
  subcategory: string;
  logo: string;
  coverImage: string;
  gallery: string[];
  
  // Location & Contact (Loc8NearMe, MapQuest, Cybo, Whitepages)
  location: {
    address: string;
    city: string;
    state?: string;
    country: string;
    countryCode: string;
    zipCode: string;
    lat: number;
    lng: number;
    neighborhood?: string;
  };
  phone: string;
  website: string;
  email: string;
  hours: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
    isOpenNow: boolean;
  };

  // Reputation & Reviews (Yelp, Tripadvisor)
  rating: number;
  reviewCount: number;
  priceLevel: '$' | '$$' | '$$$' | '$$$$';
  verified: boolean;
  foundedYear: number;
  employeeCount: string;

  // B2B & Intelligence (Dun & Bradstreet, Kompass, Brownbook)
  b2bData?: {
    dunsNumber?: string;
    creditTrustScore: number; // 1-100
    riskLevel: 'Low' | 'Moderate' | 'High';
    taxVerified: boolean;
    annualRevenueRange?: string;
    exportMarkets?: string[];
    complianceStatus: 'Active & In Good Standing' | 'Pending Review';
  };

  // Service, Booking & Quotes (Booksy, Thumbtack, Angi, TaskRabbit)
  instantBookingEnabled: boolean;
  rfqEnabled: boolean; // Request for Quote / Teklif Al
  estimatedResponseTime: string; // e.g. "within 15 mins"
  services: ServiceItem[];

  // Houzz / Portfolio (Projects & Visuals)
  portfolio?: {
    id: string;
    title: string;
    imageUrl: string;
    costEstimate?: string;
    completionTime?: string;
  }[];

  // AI-Powered Synthesis & Analysis
  aiScore: number; // 0-100 overall AI index
  aiSummary: {
    strengths: string[];
    highlightQuote: string;
    bestFor: string[];
    sentimentSummary: string;
    recommendedServices: string[];
  };

  // Matching tags for natural language search
  keywords: string[];
  promoted?: boolean;
}

export interface SearchFilterState {
  query: string;
  category: BusinessCategory | 'all';
  location: string;
  priceLevel: string;
  ratingMin: number;
  instantBookingOnly: boolean;
  verifiedOnly: boolean;
  b2bOnly: boolean;
  sortBy: 'recommended' | 'rating' | 'reviews' | 'distance' | 'ai_score';
}

export interface QuoteRequestFormData {
  businessId?: string;
  businessName?: string;
  category?: string;
  serviceNeeded: string;
  zipOrCity: string;
  preferredDate?: string;
  budgetRange: string;
  details: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

export interface BookingFormData {
  businessId: string;
  businessName: string;
  serviceId: string;
  serviceName: string;
  price: number;
  date: string;
  timeSlot: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes?: string;
}
