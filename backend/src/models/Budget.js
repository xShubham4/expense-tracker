import mongoose from 'mongoose'

const budgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  overall: {
    type: Number,
    required: true
  },
  categories: {
    food: { type: Number, default: 0 },
    groceries: { type: Number, default: 0 },
    travel: { type: Number, default: 0 },
    entertainment: { type: Number, default: 0 },
    utilities: { type: Number, default: 0 },
    shopping: { type: Number, default: 0 },
    health: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  month: {
    type: Number,
    required: true
  },
  year: {
    type: Number,
    required: true
  }
}, { timestamps: true })

export default mongoose.model('Budget', budgetSchema)