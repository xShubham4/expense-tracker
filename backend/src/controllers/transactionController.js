import Transaction from '../models/Transaction.js'
import redis from '../config/redis.js'

const CACHE_TTL = 3600 // 1 hour

const getTransactions = async (req, res) => {
  try {
    const { category, vendor, type, startDate, endDate, page = 1, limit = 20 } = req.query

    const cacheKey = `transactions:${req.user._id}:${JSON.stringify(req.query)}`
    const cached = await redis.get(cacheKey)
    if (cached) return res.json(JSON.parse(cached))

    const filter = { userId: req.user._id }

    if (category) filter.category = category
    if (vendor) filter.normalizedVendor = new RegExp(vendor, 'i')
    if (type) filter.type = type

    if (startDate || endDate) {
      filter.date = {}
      if (startDate) filter.date.$gte = new Date(startDate)
      if (endDate) filter.date.$lte = new Date(endDate)
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments(filter)
    ])

    const response = {
      transactions,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    }

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(response))

    res.json(response)

  } catch (error) {
    console.error('Get transactions error:', error.message)
    res.status(500).json({ error: 'Failed to fetch transactions' })
  }
}

const getTransactionSummary = async (req, res) => {
  try {
    const now = new Date()
    const { month = now.getMonth() + 1, year = now.getFullYear() } = req.query

    const cacheKey = `summary:${req.user._id}:${month}:${year}`
    const cached = await redis.get(cacheKey)
    if (cached) return res.json(JSON.parse(cached))

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    const [categoryTotals, overallTotal, dailySpend] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            userId: req.user._id,
            type: 'debit',
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),

      Transaction.aggregate([
        {
          $match: {
            userId: req.user._id,
            type: 'debit',
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),

      Transaction.aggregate([
        {
          $match: {
            userId: req.user._id,
            type: 'debit',
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: { $dayOfMonth: '$date' },
            total: { $sum: '$amount' }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ])

    const response = {
      month: parseInt(month),
      year: parseInt(year),
      overall: overallTotal[0]?.total || 0,
      totalTransactions: overallTotal[0]?.count || 0,
      categoryBreakdown: categoryTotals,
      dailySpend
    }

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(response))

    res.json(response)

  } catch (error) {
    console.error('Summary error:', error.message)
    res.status(500).json({ error: 'Failed to fetch summary' })
  }
}

const getVendors = async (req, res) => {
  try {
    const cacheKey = `vendors:${req.user._id}`
    const cached = await redis.get(cacheKey)
    if (cached) return res.json(JSON.parse(cached))

    const vendors = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          type: 'debit'
        }
      },
      {
        $group: {
          _id: '$normalizedVendor',
          totalSpend: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
          category: { $first: '$category' },
          lastTransaction: { $max: '$date' }
        }
      },
      { $sort: { totalSpend: -1 } }
    ])

    const response = { vendors }

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(response))

    res.json(response)

  } catch (error) {
    console.error('Get vendors error:', error.message)
    res.status(500).json({ error: 'Failed to fetch vendors' })
  }
}

export { getTransactions, getTransactionSummary, getVendors }