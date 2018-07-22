// import faker from 'faker';

export const CLIENTS = {
  dashboard: {
    clientId: 'dashboard',
    clientSecret: 'dashboarddashboard',
    name: 'Dashboard API v1',
  },
  android: {
    clientId: 'android',
    clientSecret: 'androidandroid',
    name: 'Android App',
  },
  frontCore: {
    clientId: 'frontCore',
    clientSecret: 'frontCorefrontCore',
    name: 'Front Core App',
  },
};

export const USERS = {
  ivanovI: {
    username: 'ivanovI',
    password: '123456',

    displayName: 'Ivanov I. I.',
    firstName: 'Ivan',
    middleName: 'Ivanovich',
    lastName: 'Ivanov',
    email: 'ivanovI@local.com',
    // todo @ANKU @LOW - profileImageURI

    provider: 'local',
    permissions: [],
  },
  korolevaU: {
    username: 'korolevaU',
    password: '123456',

    displayName: 'Koroleva U. A.',
    firstName: 'Uliya',
    middleName: 'Alexsandrovna',
    lastName: 'Koroleva',
    email: 'korolevaU@local.com',

    provider: 'local',
    roles: [
      'user',
      'testRole',
    ],
    permissions: [
      'TEST_PERMISSION',
    ],
  },
};

export default {
  CLIENTS,
  USERS,
};
