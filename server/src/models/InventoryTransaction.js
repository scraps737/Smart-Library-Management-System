import mongoose from 'mongoose'

/**
 * Append-only ledger of every stock movement. Inventory quantities on the Book
 * document are the source of truth; this ledger explains how they got there.
 */
const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['acquire', 'adjust', 'discard', 'borrow', 'return'],
      index: true,
    },
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    loan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', default: null },
    delta: { type: Number, required: true },
    availableDelta: { type: Number, default: 0 },
    totalBefore: { type: Number, required: true },
    totalAfter: { type: Number, required: true },
    availableBefore: { type: Number, required: true },
    availableAfter: { type: Number, required: true },
    reason: { type: String, default: '' },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

export const InventoryTransaction = mongoose.model('InventoryTransaction', transactionSchema)
