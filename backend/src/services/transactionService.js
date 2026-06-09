import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

const vendorNormalizationMap = {
  'zomato': 'Zomato',
  'swiggy': 'Swiggy',
  'amazon': 'Amazon',
  'flipkart': 'Flipkart',
  'uber': 'Uber',
  'ola': 'Ola',
  'netflix': 'Netflix',
  'spotify': 'Spotify',
  'blinkit': 'Blinkit',
  'zepto': 'Zepto',
  'bigbasket': 'BigBasket',
  'irctc': 'IRCTC',
  'makemytrip': 'MakeMyTrip',
  'bookmyshow': 'BookMyShow',
  'paytm': 'Paytm',
  'phonepe': 'PhonePe',
  'dunzo': 'Dunzo',
  'instamart': 'Swiggy Instamart',
  'myntra': 'Myntra',
  'nykaa': 'Nykaa',
  'ajio': 'Ajio',
  'hotstar': 'Hotstar',
  'prime video': 'Amazon Prime',
  'youtube': 'YouTube Premium',
  'jiocinema': 'JioCinema',
  'ola electric': 'Ola Electric',
  'rapido': 'Rapido',
  'redbus': 'RedBus',
  'cleartrip': 'Cleartrip',
  'goibibo': 'Goibibo',
  'byju': 'Byjus',
  'unacademy': 'Unacademy',
  'cure.fit': 'Cult.fit',
  'cult.fit': 'Cult.fit',
  'lenskart': 'Lenskart',
  'pharmeasy': 'PharmEasy',
  'netmeds': 'Netmeds',
  '1mg': '1mg',
  'apollo': 'Apollo Pharmacy',
  'electricity': 'Electricity Bill',
  'airtel': 'Airtel',
  'jio': 'Jio',
  'bsnl': 'BSNL',
  'vi ': 'Vi',
  'vodafone': 'Vodafone'
}

const normalizeVendorName = (vendor) => {
  const lower = vendor.toLowerCase().trim()

  for (const [key, value] of Object.entries(vendorNormalizationMap)) {
    if (lower.includes(key)) return value
  }

  let cleaned = vendor.replace(/\(?\d{10}\)?/g, '').trim()
  cleaned = cleaned.replace(/\s+\d+$/, '').trim()

  return cleaned
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim()
}

const categorizeTransaction = async (vendor, description) => {
  try {
    const prompt = `Categorize this transaction into exactly one of these categories: food, groceries, travel, entertainment, utilities, shopping, health, other.
Vendor: ${vendor}
Description: ${description}
Reply with only the category word, nothing else.`

    const result = await model.generateContent(prompt)
    const category = result.response.text().trim().toLowerCase()

    const validCategories = ['food', 'groceries', 'travel', 'entertainment', 'utilities', 'shopping', 'health', 'other']
    return validCategories.includes(category) ? category : 'other'

  } catch (error) {
    return 'other'
  }
}

export { normalizeVendorName, categorizeTransaction }