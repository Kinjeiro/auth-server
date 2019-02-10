// import faker from 'faker';

const {
  PROJECT_ID,
  USE_MOCK,
  NODE_ENV,
  // EMAIL_AS_LOGIN,
} = process.env;

export const projectId = PROJECT_ID || 'mockServer';
export const useMock = !!USE_MOCK || NODE_ENV === 'test';

export const CLIENTS = {
  [projectId]: {
    clientId: projectId,
    clientSecret: `${projectId}${projectId}`,
    name: projectId,
    providerCredentials: {
      google: {
        clientID: null,
        clientSecret: null,
      },
      facebook: {
        clientID: null,
        clientSecret: null,
      },
      vkontakte: {
        clientID: null,
        clientSecret: null,
      },
    },
  },
  // frontCore: {
  //   clientId: '@reagentum/front-core',
  //   clientSecret: '@reagentum/front-core@reagentum/front-core',
  //   name: 'Front Core app',
  // },
};

export const USERS = {
  [projectId]: {
    username: 'protector',
    password: `${projectId}${projectId}`,

    displayName: 'protector',
    firstName: '',
    middleName: '',
    lastName: '',
    email: 'protector@local.com',

    roles: [
      'user',
      'protector',
    ],
    permissions: [
    ],

    provider: 'local',
    projectId,
    isSystem: true,
  },
};

if (useMock) {
  USERS.ivanovI = {
    // username: EMAIL_AS_LOGIN ? 'ivanovI@local.com' : 'ivanovI',
    username: 'ivanovI',
    password: '123456',

    displayName: 'Ivanov I. I.',
    firstName: 'Ivan',
    middleName: 'Ivanovich',
    lastName: 'Ivanov',
    email: 'ivanovI@local.com',

    // есть значение по умолчанию
    roles: ['user'],
    permissions: ['TEST_PERMISSION'],

    projectId: CLIENTS[projectId].clientId,
  };
  USERS.korolevaU = {
    // username: EMAIL_AS_LOGIN ? 'korolevaU@local.com' : 'korolevaU',
    username: 'korolevaU',
    password: '123456',

    displayName: 'Koroleva U. A.',
    firstName: 'Uliya',
    middleName: 'Alexsandrovna',
    lastName: 'Koroleva',
    email: 'korolevaU@local.com',

    roles: [
      'user',
      'admin',
    ],
    permissions: [
      'TEST_PERMISSION',
    ],

    projectId: CLIENTS[projectId].clientId,
  };
}

export default {
  CLIENTS,
  USERS,
};
