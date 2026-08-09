const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['operator', 'admin', 'superadmin'], default: 'operator' },
  name: { type: String },
  email: { type: String },
  // Plants this user may access. Empty [] => no plants for operators;
  // admins/superadmins are granted every plant implicitly via plantService.
  plants: { type: [String], default: [] },
  last_login: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', UserSchema);