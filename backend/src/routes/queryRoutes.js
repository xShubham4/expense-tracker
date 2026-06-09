import express from 'express'
import { askQuestion } from '../controllers/queryController.js'
import protect from '../middleware/authMiddleware.js'

const router = express.Router()

router.post('/ask', protect, askQuestion)

export default router