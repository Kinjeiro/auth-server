/* eslint-disable func-names,no-underscore-dangle */
import crypto from 'crypto';
import validator from 'validator';
import mongoose from 'mongoose';
import shortid from 'shortid';
import omit from 'lodash/omit';
import pick from 'lodash/pick';

import { generateTokenValue } from '../../utils/common';

export const PUBLIC_TO_ALL_ATTRS = [
  'userId',
  'displayName',
  'aliasId',
  'description',
  'computedDisplayName',
  // 'profileImageURI', - получать через отдельное api
];
export const PROTECTED_ATTRS = [
  ...PUBLIC_TO_ALL_ATTRS,
  // 'username',
  'firstName',
  'lastName',
  'middleName',
  'email',
  'phone',
  'address',
];

export const EDITABLE_ATTRS = [
  'username', // нужно проверить уникальность
  'aliasId', // нужно проверить уникальность
  'email', // нужно проверить уникальность
  'firstName',
  'lastName',
  'middleName',
  'displayName',
  'phone',
  'address',
  'description',
  'comment',
  'profileImageURI',
  'contextData',
];

export const UNIQUE_ATTRS = [
  'username',
  'email',
  'aliasId',
];

export const PASSWORD_ATTRS = [
  'hashedPassword',
  'password',
  'salt',
  '_plainPassword',
];

export const OMIT_USER_ATTRS = [
  ...PASSWORD_ATTRS,
  'profileImageURI',
];

export const ADMIN_ROLE = 'admin';
export const USER_ROLE = 'user';
export const GET_PROTECTED_INFO_ROLE = 'protector';

export function isUserIdValid(userId) {
  return shortid.isValid(userId);
}

export const UserSchema = new mongoose.Schema({
  // ======================================================
  // AUTH
  // ======================================================

  /*
   Можно авторизоваться по userId \ username \ email
  */
  // userId: {
  //   type: Number,
  //   unique: true,
  //   default: () => Math
  // },
  _id: {
    type: String,
    default: shortid.generate,
  },
  username: {
    type: String,
    // у нас уникальность должна быть в рамках projectId, поэтому берем на себя проверку уникальности
    // unique: 'Username already exists',
    // required: 'Please fill in a username',
    required: false,
    trim: true,
  },
  email: {
    type: String,
    required: false, // может и не быть почты
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
  phone: {
    type: String,
    validate: [
      // без локали падает: phone: Invalid locale 'undefined'
      // todo @ANKU @LOW - подумать над универсальным не зависящим от локали
      (phone) => (!phone ? true : validator.isMobilePhone(phone, 'ru-RU', { strictMode: true })),
      'Please fill a valid phone',
    ],
  },
  address: {
    type: String,
  },
  description: {
    type: String,
  },

  /**
   * имя страниц, которое выдят все пользователи вместо userId (username - это логин и может не совпадать)
   */
  aliasId: {
    type: String,
    // у нас уникальность должна быть в рамках projectId, поэтому берем на себя проверку уникальности
    // unique: true,
    lowercase: true,
    trim: true,
  },
  profileImageURI: {
    type: String,
    validate: [
      (dataUrl) => /data:(.*);base64,(.*)/i.test(dataUrl),
      'Please fill a valid profileImageURI as base64 dataUrl, like as: data:image/jpeg;base64,iVBORw0KG...',
    ],
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
  isSystem: {
    type: Boolean,
  },

  // ======================================================
  // PROVIDER INFO
  // ======================================================
  provider: {
    type: String,
    default: 'local',
    required: 'Provider is required',
  },
  providerScopes: {
    type: [{
      type: String,
    }],
  },
  providerData: {
    type: Map,
  },
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
  comments: {
    type: String,
  },
});

// ======================================================
// VIRTUAL
// ======================================================
UserSchema.virtual('userId')
  .set(function (userId) {
    // this._id = mongoose.Types.ObjectId.fromString(userId);
    if (!isUserIdValid(userId)) {
      throw new Error('Not valid userId format (see "shortid" package)');
    }
    this._id = userId;
  })
  .get(function () {
    // return this.id;
    return this._id;
  });

UserSchema.virtual('password')
  .set(function (password) {
    this._plainPassword = password;
    this.salt = generateTokenValue();
    // более секьюрно - this.salt = generateTokenValue(128);
    this.hashedPassword = this.encryptPassword(password);
  })
  .get(function () {
    return this._plainPassword;
  });

UserSchema.virtual('computedDisplayName')
  .get(function () {
    return this.get('displayName') || this.get('aliasId') || this.get('userId');
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
UserSchema.methods.getSafeUser = function () {
  return omit(this.toJSON({ virtuals: true }), OMIT_USER_ATTRS);
};
UserSchema.methods.getPublicInfo = function () {
  return pick(this.toJSON({ virtuals: true }), PUBLIC_TO_ALL_ATTRS);
};

export const USER_MODEL_NAME = 'User';

export const User = mongoose.model(USER_MODEL_NAME, UserSchema);

export default User;
