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
  if (!narration) return ''
  const trimmed = narration.trim()

  // 1. Standard Indian UPI Pattern: UPI/(CR|DR)/<ref>/<Name>/<Bank>/<VPA>/<Remark>
  const upiFullMatch = trimmed.match(/UPI\/(?:CR|DR)\/\d+\/([^/]+)/i)
  if (upiFullMatch && upiFullMatch[1]) {
    const name = cleanMerchantName(upiFullMatch[1])
    if (name) return name
  }

  // 2. UPI Pattern: UPI/<ref>/<Name>/... or UPI/<Name>/<ref>/...
  const upiRefNameMatch = trimmed.match(/UPI\/\d+\/([^/]+)/i)
  if (upiRefNameMatch && upiRefNameMatch[1]) {
    const name = cleanMerchantName(upiRefNameMatch[1])
    if (name) return name
  }

  const upiNameMatch = trimmed.match(/UPI\/([^/]+)/i)
  if (upiNameMatch && upiNameMatch[1]) {
    const candidate = upiNameMatch[1]
    if (!/^\d+$/.test(candidate) && !/^(?:CR|DR)$/i.test(candidate)) {
      const name = cleanMerchantName(candidate)
      if (name) return name
    }
  }

  // 3. IMPS / NEFT / RTGS
  const impsMatch = trimmed.match(/(?:IMPS|NEFT|RTGS)[/-](?:[A-Z0-9]+[/-])?([^/\-|]+)/i)
  if (impsMatch && impsMatch[1]) {
    const name = cleanMerchantName(impsMatch[1])
    if (name) return name
  }

  // 4. POS / Card Transactions
  const posMatch = trimmed.match(/POS\s+(?:\d+\s+)?([^/\-|]+)/i)
  if (posMatch && posMatch[1]) {
    const name = cleanMerchantName(posMatch[1])
    if (name) return name
  }

  // 5. NACH / ACH / Auto-debit / Mandate
  const achMatch = trimmed.match(/(?:ACH|NACH|ECS)[/-](?:[A-Z0-9]+[/-])?([^/\-|]+)/i)
  if (achMatch && achMatch[1]) {
    const name = cleanMerchantName(achMatch[1])
    if (name) return name
  }

  // 6. Generic Fallback: strip dates, long account/ref numbers, prefixes
  let cleaned = trimmed
    .replace(/\b\d{2}[\/\-]\d{2}[\/\-]\d{2,4}\b/g, '') // remove dates
    .replace(/^(?:WDL\s+TFR|DEP\s+TFR|TRANSFER\s+TO|TRANSFER\s+FROM|CHQ\s+TFR|BY\s+TRANSFER|TO\s+TRANSFER)\s+/i, '')
    .replace(/\b[0-9]{6,}\b/g, '') // remove long numbers
    .replace(/\b(?:AT\s+\d+|PEYADU|BRANCH|MUMBAI|DELHI|BANGALORE|CHENNAI)\b/gi, '') // remove branch/location artifacts
    .replace(/[|/\\:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return cleanMerchantName(cleaned.slice(0, 50))
}

function cleanMerchantName(raw: string): string {
  let name = raw.replace(/[|/\\:]/g, ' ').replace(/\s+/g, ' ').trim()
  if (/^Tata\s*Pla$/i.test(name)) return 'Tata Play'
  if (/^Navi\s*Lim$/i.test(name)) return 'Navi Limited'
  if (/^Kerala\s*S$/i.test(name)) return 'Kerala State'
  return name.slice(0, 50)
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
