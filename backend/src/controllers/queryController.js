import Transaction from '../models/Transaction.js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

const askQuestion = async (req, res) => {
  try {
    const { question } = req.body

    if (!question) {
      return res.status(400).json({ error: 'Question is required' })
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const transactions = await Transaction.find({
      userId: req.user._id,
      date: { $gte: startOfMonth }
    }).sort({ date: -1 }).limit(100)

    if (transactions.length === 0) {
      return res.json({ answer: 'No transactions found for this month yet. Try syncing your Gmail first.' })
    }

    const transactionSummary = transactions.map(t => ({
      amount: t.amount,
      vendor: t.normalizedVendor,
      category: t.category,
      type: t.type,
      date: t.date.toDateString()
    }))

    const prompt = `You are a personal finance assistant. Based on the following transaction data, answer the user's question in a clear, concise, friendly way. Use ₹ for currency. If the answer involves a total, state it clearly.

Transaction data (current month):
${JSON.stringify(transactionSummary, null, 2)}

User question: ${question}

Answer in 1-3 sentences maximum.`

    const result = await model.generateContent(prompt)
    const answer = result.response.text().trim()

    res.json({ answer })

  } catch (error) {
    console.error('Query error:', error.message)
    res.status(500).json({ error: 'Failed to process question' })
  }
}

export { askQuestion }