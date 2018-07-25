/* eslint-disable func-names */
import crypto from 'crypto';
import validator from 'validator';
import mongoose from 'mongoose';

import { generateTokenValue } from '../../utils/common';

export const PUBLIC_EDITABLE_ATTRS = [
  'username',
  'firstName',
  'lastName',
  'middleName',
  'displayName',
  'email',
  'phone',
  'profileImageURI',
  'contextData',
];

export const UNIQUE_ATTRS = [
  'username',
  'email',
];

export const PASSWORD_ATTRS = [
  'hashedPassword',
  'password',
  'salt',
];

export const ADMIN_ROLE = 'admin';
export const USER_ROLE = 'user';

export const UserSchema = new mongoose.Schema({
  // ======================================================
  // AUTH
  // ======================================================
  username: {
    type: String,
    // у нас уникальность должна быть в рамках projectId, поэтому берем на себя проверку уникальности
    // unique: 'Username already exists',
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
    required: true,
    // у нас уникальность должна быть в рамках projectId, поэтому берем на себя проверку уникальности
    // unique: true,
    lowercase: true,
    trim: true,
    // match: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/
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
  contextData: {
    type: Map,
    of: String,
    default: {},
  },

  // ======================================================
  // MANAGER RIGHTS
  // ======================================================
  roles: {
    type: [{
      type: String,
    }],
    default: [USER_ROLE],
    required: 'Please provide at least one role',
  },
  permissions: {
    type: [{
      type: String,
    }],
    default: [],
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
  projectId: {
    type: String,
    required: true,
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

export const USER_MODEL_NAME = 'User';

export const User = mongoose.model(USER_MODEL_NAME, UserSchema);

export default User;
