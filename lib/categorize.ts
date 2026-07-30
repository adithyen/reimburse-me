/**
 * Auto-categorization engine for Indian bank transactions.
 * Keyword matching with priority — more specific keywords first.
 */

export interface CategoryMatch {
  categorySlug: string
  confidence: number // 0-1
}

const CATEGORY_RULES: Record<string, string[]> = {
  food: [
    'swiggy', 'zomato', 'kfc', 'mcdonald', 'dominos', 'pizza hut', 'burger king',
    'subway', 'hotel', 'restaurant', 'cafe', 'coffee', 'tea stall', 'dhaba',
    'biryani', 'nilgiris', 'bigbasket', 'big basket', 'blinkit', 'zepto',
    'grofers', 'dunzo', 'milkbasket', 'instamart', 'grocery', 'bakery',
    'haldiram', 'amul', 'fresh to home', 'licious', 'uber eats', 'food',
    'canteen', 'mess', 'tiffin', 'lunch', 'dinner', 'breakfast',
  ],
  travel: [
    'ola', 'uber', 'rapido', 'auto', 'taxi', 'cab', 'bus', 'ksrtc', 'apsrtc',
    'msrtc', 'irctc', 'indian railways', 'train', 'flight', 'airline', 'indigo',
    'air india', 'spicejet', 'vistara', 'go first', 'makemytrip', 'yatra',
    'goibibo', 'cleartrip', 'parking', 'toll', 'metro', 'dmrc', 'bmtc',
    'redbus', 'abhibus', 'blablacar',
  ],
  fuel: [
    'petrol', 'diesel', 'cng', 'fuel', 'hp petrol', 'bharat petroleum', 'indian oil',
    'iocl', 'hpcl', 'bpcl', 'shell', 'nayara', 'petrol pump', 'filling station',
    'reliance petrol',
  ],
  medical: [
    'apollo', 'medplus', 'pharmacy', 'hospital', 'clinic', 'doctor', 'medicine',
    'lab', 'diagnostic', 'health', 'pharma', 'netmeds', '1mg', 'practo',
    'lybrate', 'manipal', 'fortis', 'aiims', 'columbia', 'narayana', 'medanta',
    'thyrocare', 'dr lal', 'srl diagnostics', 'dentist', 'optician',
    'eye care', 'blood test', 'scan', 'x-ray', 'nursing home', 'icu',
  ],
  education: [
    'udemy', 'coursera', 'unacademy', 'byju', 'vedantu', 'khan academy',
    'book', 'stationery', 'college', 'university', 'school', 'tuition', 'coaching',
    'fee', 'exam', 'neet', 'jee', 'upsc', 'skillshare', 'linkedin learning',
    'pluralsight', 'datacamp', 'edx', 'simplilearn',
  ],
  shopping: [
    'flipkart', 'amazon', 'myntra', 'meesho', 'ajio', 'nykaa', 'tata cliq',
    'reliance digital', 'croma', 'vijay sales', 'dmart', 'd-mart', 'd mart',
    'supermarket', 'big bazaar', 'more', 'spencer', 'lifestyle', 'shoppers stop',
    'pantaloons', 'westside', 'h&m', 'zara', 'brand factory', 'max fashion',
  ],
  electronics: [
    'apple', 'samsung', 'oneplus', 'mi', 'xiaomi', 'realme', 'oppo', 'vivo',
    'laptop', 'mobile', 'phone', 'tablet', 'earphones', 'headphones', 'charger',
    'cable', 'electronics', 'computer', 'keyboard', 'mouse', 'monitor',
    'processor', 'ram', 'ssd', 'hard disk', 'printer', 'camera',
  ],
  entertainment: [
    'pvr', 'inox', 'cinepolis', 'netflix', 'spotify', 'prime video', 'hotstar',
    'disney', 'zee5', 'sony liv', 'amazon prime', 'apple tv', 'youtube premium',
    'gaming', 'steam', 'playstation', 'xbox', 'concert', 'event', 'show',
    'bowling', 'fun world', 'amusement', 'movie', 'theatre', 'cinema',
  ],
  subscriptions: [
    'subscription', 'monthly', 'renewal', 'annual', 'membership', 'premium',
    'plan', 'pack',
  ],
  recharge: [
    'recharge', 'topup', 'top-up', 'mobile recharge', 'dth', 'tatasky', 'dish tv',
    'airtel dth', 'videocon d2h', 'sun direct', 'prepaid',
  ],
  utilities: [
    'electricity', 'water bill', 'internet', 'broadband', 'jio', 'airtel',
    'vodafone', 'vi', 'bsnl', 'gas', 'lpg', 'indane', 'hp gas', 'bharat gas',
    'municipal', 'bill payment', 'biller', 'utility',
  ],
  insurance: [
    'insurance', 'lic', 'hdfc life', 'sbi life', 'icici prudential', 'bajaj allianz',
    'star health', 'niva bupa', 'care health', 'policy', 'premium payment',
    'term plan', 'mediclaim',
  ],
  investment: [
    'zerodha', 'groww', 'upstox', 'angel broking', 'iifl', 'sbi mutual fund',
    'hdfc mutual fund', 'icici mutual fund', 'ppf', 'nps', 'fixed deposit',
    'fd', 'rd', 'recurring deposit', 'sip', 'mutual fund', 'stocks', 'shares',
    'gold', 'digital gold', 'coin', 'etf',
  ],
  rent: [
    'rent', 'rental', 'house rent', 'pg', 'hostel', 'accommodation', 'lease',
    'maintenance', 'society', 'apartment', 'flat rent',
  ],
}

export function categorizeTransaction(narration: string): CategoryMatch {
  const lower = narration.toLowerCase().trim()

  for (const [slug, keywords] of Object.entries(CATEGORY_RULES)) {
    const matchedKeyword = keywords.find((kw) => lower.includes(kw))
    if (matchedKeyword) {
      // Higher confidence for longer, more specific keyword matches
      const confidence = Math.min(0.95, 0.6 + (matchedKeyword.length / narration.length) * 0.4)
      return { categorySlug: slug, confidence }
    }
  }

  return { categorySlug: 'others', confidence: 0.1 }
}

export function extractMerchant(narration: string): string {
  // Common Indian bank narration patterns:
  // UPI/SWIGGY TECHNOLOGIES PR/UPI REF/...
  // IMPS/123456/Swiggy/...
  // POS/AMAZON/...
  // NEFT/HDFC/John Doe/...

  const patterns = [
    // UPI pattern: UPI/MERCHANT NAME/...
    /^UPI[/-]([^/\-|]+)/i,
    // IMPS/NEFT: IMPS/ref/NAME/...
    /^(?:IMPS|NEFT|RTGS)[/-]\d+[/-]([^/\-|]+)/i,
    // POS: POS/MERCHANT/...
    /^POS[/-]([^/\-|]+)/i,
    // ATM: ATM/...
    /^(?:ATW|ATM)[/-]([^/\-|]+)/i,
  ]

  for (const pattern of patterns) {
    const match = narration.match(pattern)
    if (match?.[1]) {
      return match[1].trim().slice(0, 50)
    }
  }

  // Fallback: take first meaningful part
  const cleaned = narration
    .replace(/[0-9]{6,}/g, '') // remove long numbers
    .replace(/[|/\\]/g, ' ')
    .trim()

  return cleaned.slice(0, 50)
}

export const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', slug: 'food', icon: 'utensils', color: '#f97316' },
  { name: 'Travel', slug: 'travel', icon: 'navigation', color: '#3b82f6' },
  { name: 'Fuel', slug: 'fuel', icon: 'fuel', color: '#f59e0b' },
  { name: 'Medical', slug: 'medical', icon: 'heart-pulse', color: '#ef4444' },
  { name: 'Education', slug: 'education', icon: 'graduation-cap', color: '#8b5cf6' },
  { name: 'Shopping', slug: 'shopping', icon: 'shopping-bag', color: '#ec4899' },
  { name: 'Electronics', slug: 'electronics', icon: 'monitor', color: '#06b6d4' },
  { name: 'Entertainment', slug: 'entertainment', icon: 'clapperboard', color: '#a855f7' },
  { name: 'Subscriptions', slug: 'subscriptions', icon: 'repeat', color: '#14b8a6' },
  { name: 'Recharge', slug: 'recharge', icon: 'smartphone', color: '#22c55e' },
  { name: 'Utilities', slug: 'utilities', icon: 'zap', color: '#eab308' },
  { name: 'Insurance', slug: 'insurance', icon: 'shield', color: '#64748b' },
  { name: 'Investment', slug: 'investment', icon: 'trending-up', color: '#10b981' },
  { name: 'Rent', slug: 'rent', icon: 'home', color: '#6366f1' },
  { name: 'Others', slug: 'others', icon: 'tag', color: '#94a3b8' },
]
