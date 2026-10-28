import mongoose from 'mongoose'

export const LOAN_PERIOD_DAYS = 21

const loanSchema = new mongoose.Schema(
  {
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    borrowedAt: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, required: true },
    returnedAt: { type: Date, default: null },
    status: { type: String, enum: ['active', 'returned'], default: 'active', index: true },
    renewals: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: '' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
)

// A given scholar may only hold one active loan per title.
loanSchema.index(
  { book: 1, user: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
)

loanSchema.virtual('isOverdue').get(function () {
  return this.status === 'active' && this.dueDate && this.dueDate.getTime() < Date.now()
})

loanSchema.virtual('isDueSoon').get(function () {
  if (this.status !== 'active' || !this.dueDate) return false
  const ms = this.dueDate.getTime() - Date.now()
  return ms > 0 && ms < 3 * 24 * 60 * 60 * 1000
})

loanSchema.virtual('daysOverdue').get(function () {
  if (!this.isOverdue) return 0
  return Math.floor((Date.now() - this.dueDate.getTime()) / (24 * 60 * 60 * 1000))
})

export const Loan = mongoose.model('Loan', loanSchema)
