import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const ROLES = ['scholar', 'librarian', 'admin']

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'scholar', index: true },
    affiliation: { type: String, trim: true, default: '' },
    discipline: { type: String, trim: true, default: '' },
    avatarUrl: { type: String, default: '/assets/stitch/de813fd7de.jpg' },
    membershipTier: { type: String, default: 'Charter Pass' },
    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
    containsActiveLoan: { type: Boolean, default: false },
  },
  { timestamps: true }
)

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim()
})

userSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash)
}

userSchema.statics.hashPassword = function (plain) {
  return bcrypt.hash(plain, 12)
}

userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id.toString(),
    firstName: this.firstName,
    lastName: this.lastName,
    fullName: `${this.firstName} ${this.lastName}`.trim(),
    email: this.email,
    role: this.role,
    affiliation: this.affiliation,
    discipline: this.discipline,
    avatarUrl: this.avatarUrl,
    membershipTier: this.membershipTier,
    bookmarkCount: this.bookmarks?.length || 0,
    createdAt: this.createdAt,
  }
}

export const User = mongoose.model('User', userSchema)
export { ROLES }
