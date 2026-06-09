import express from 'express'
import { getBudget, setBudget } from '../controllers/budgetController.js'
import protect from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', protect, getBudget)
router.post('/', protect, setBudget)

export default router