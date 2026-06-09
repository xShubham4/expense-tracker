import Budget from '../models/Budget.js'
import Transaction from '../models/Transaction.js'

const getBudget = async (req, res) => {
  try {
    const now = new Date()
    const { month = now.getMonth() + 1, year = now.getFullYear() } = req.query

    const budget = await Budget.findOne({
      userId: req.user._id,
      month: parseInt(month),
      year: parseInt(year)
    })

    if (!budget) {
      return res.json({ budget: null })
    }

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    const spent = await Transaction.aggregate([
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
          total: { $sum: '$amount' }
        }
      }
    ])

    const spentMap = {}
    spent.forEach(item => { spentMap[item._id] = item.total })

    const totalSpent = Object.values(spentMap).reduce((a, b) => a + b, 0)

    res.json({
      budget,
      spent: spentMap,
      totalSpent,
      remainingOverall: budget.overall - totalSpent
    })

  } catch (error) {
    console.error('Get budget error:', error.message)
    res.status(500).json({ error: 'Failed to fetch budget' })
  }
}

const setBudget = async (req, res) => {
  try {
    const now = new Date()
    const {
      overall,
      categories = {},
      month = now.getMonth() + 1,
      year = now.getFullYear()
    } = req.body

    if (!overall) {
      return res.status(400).json({ error: 'Overall budget is required' })
    }

    const budget = await Budget.findOneAndUpdate(
      {
        userId: req.user._id,
        month: parseInt(month),
        year: parseInt(year)
      },
      {
        userId: req.user._id,
        overall,
        categories,
        month: parseInt(month),
        year: parseInt(year)
      },
      { upsert: true, new: true }
    )

    res.json({ budget })

  } catch (error) {
    console.error('Set budget error:', error.message)
    res.status(500).json({ error: 'Failed to set budget' })
  }
}

export { getBudget, setBudget }