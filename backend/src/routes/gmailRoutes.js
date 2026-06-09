import express from 'express'
import { syncTransactions } from '../controllers/gmailController.js'
import protect from '../middleware/authMiddleware.js'

const router = express.Router()

router.post('/sync', protect, syncTransactions)

export default router