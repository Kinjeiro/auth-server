// import faker from 'faker';

export const CLIENTS = {
  mockServer: {
    clientId: 'mockServer',
    clientSecret: 'mockServermockServer',
    name: 'Mock Server',
  },
  frontCore: {
    clientId: '@reagentum/front-core',
    clientSecret: '@reagentum/front-core@reagentum/front-core',
    name: 'Front Core app',
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

    // есть значение по умолчанию
    // roles: [],
    // permissions: [],

    provider: 'local',
    projectId: CLIENTS.mockServer.clientId,
  },
  korolevaU: {
    username: 'korolevaU',
    password: '123456',

    displayName: 'Koroleva U. A.',
    firstName: 'Uliya',
    middleName: 'Alexsandrovna',
    lastName: 'Koroleva',
    email: 'korolevaU@local.com',

    roles: [
      'user',
      'testRole',
    ],
    permissions: [
      'TEST_PERMISSION',
    ],

    provider: 'local',
    projectId: CLIENTS.mockServer.clientId,
  },
};

export default {
  CLIENTS,
  USERS,
};
