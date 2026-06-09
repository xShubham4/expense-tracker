import express from 'express'
import { getTransactions, getTransactionSummary, getVendors } from '../controllers/transactionController.js'
import protect from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', protect, getTransactions)
router.get('/summary', protect, getTransactionSummary)
router.get('/vendors', protect, getVendors)

export default router