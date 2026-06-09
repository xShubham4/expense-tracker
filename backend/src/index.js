import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import connectDatabase from './config/database.js'
import authRoutes from './routes/authRoutes.js'
import gmailRoutes from './routes/gmailRoutes.js'
import transactionRoutes from './routes/transactionRoutes.js'
import budgetRoutes from './routes/budgetRoutes.js'
import queryRoutes from './routes/queryRoutes.js'
import protect from './middleware/authMiddleware.js'
import startCronJobs from './services/cronService.js'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

connectDatabase()
startCronJobs()

app.use('/api/auth', authRoutes)
app.use('/api/gmail', gmailRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/budget', budgetRoutes)
app.use('/api/query', queryRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/protected', protect, (req, res) => {
  res.json({ message: `Hello ${req.user.name}` })
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})