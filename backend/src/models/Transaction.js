import mongoose from 'mongoose'

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  vendor: {
    type: String,
    required: true
  },
  normalizedVendor: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['food', 'groceries', 'travel', 'entertainment', 'utilities', 'shopping', 'health', 'other'],
    default: 'other'
  },
  type: {
    type: String,
    enum: ['debit', 'credit'],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  description: {
    type: String
  },
  gmailMessageId: {
    type: String,
    unique: true
  }
}, { timestamps: true })

export default mongoose.model('Transaction', transactionSchema)