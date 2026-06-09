import { syncGmailTransactions } from '../services/gmailService.js'

const syncTransactions = async (req, res) => {
  try {
    const savedCount = await syncGmailTransactions(req.user)
    res.json({ message: `Synced successfully`, newTransactions: savedCount })
  } catch (error) {
    console.error('Sync error:', error.message)
    res.status(500).json({ error: 'Failed to sync transactions' })
  }
}

export { syncTransactions }