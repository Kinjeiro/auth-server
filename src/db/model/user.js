/* eslint-disable func-names */
import crypto from 'crypto';
import validator from 'validator';
import mongoose from 'mongoose';

import { generateTokenValue } from '../../utils/common';

export const UserSchema = new mongoose.Schema({
  // ======================================================
  // AUTH
  // ======================================================
  username: {
    type: String,
    unique: 'Username already exists',
    required: 'Please fill in a username',
    trim: true,
  },
  hashedPassword: {
    type: String,
    // required: true,
  },
  salt: {
    type: String,
    // required: true,
  },

  // ======================================================
  // DISPLAY INFO
  // ======================================================
  firstName: {
    type: String,
    trim: true,
    default: '',
  },
  lastName: {
    type: String,
    trim: true,
    default: '',
  },
  middleName: {
    type: String,
    trim: true,
    default: '',
  },
  displayName: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    validate: [
      (email) => validator.isEmail(email, { require_tld: false }),
      'Please fill a valid email address',
    ],
  },
  phone: {
    type: String,
    validate: [
      (phone) => validator.isMobilePhone(phone),
      'Please fill a valid phone',
    ],
  },
  profileImageURI: {
    type: String,
  },

  // ======================================================
  // PROVIDER INFO
  // ======================================================
  provider: {
    type: String,
    required: 'Provider is required',
  },
  providerData: {},
  additionalProvidersData: {},

  // ======================================================
  // MANAGER RIGHTS
  // ======================================================
  roles: {
    type: [{
      type: String,
    }],
    default: ['user'],
    required: 'Please provide at least one role',
  },
  permissions: {
    type: [{
      type: String,
    }],
    default: [],
  },

  // ======================================================
  // HISTORY
  // ======================================================
  updated: {
    type: Date,
    default: Date.now,
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

// ======================================================
// VIRTUAL
// ======================================================
UserSchema.virtual('userId')
  .get(function () {
    return this.id;
  });

UserSchema.virtual('password')
  .set(function (password) {
    // todo @ANKU @LOW - _plainPassword
    this._plainPassword = password;
    this.salt = generateTokenValue();
    // более секьюрно - this.salt = generateTokenValue(128);
    this.hashedPassword = this.encryptPassword(password);
  })
  .get(function () {
    return this._plainPassword;
  });

// ======================================================
// METHODS
// ======================================================
UserSchema.methods.encryptPassword = function (password) {
  return crypto.createHmac('sha1', this.salt)
    .update(password)
    .digest('hex');
  // более секьюрно - return crypto.pbkdf2Sync(password, this.salt, 10000, 512).toString('hex');
};

UserSchema.methods.checkPassword = function (password) {
  return this.encryptPassword(password) === this.hashedPassword;
};

export const User = mongoose.model('User', UserSchema);

export const PASSWORD_ATTRS = [
  'hashedPassword',
  'password',
  'salt',
];

export default User;
