// import faker from 'faker';

const {
  PROJECT_ID,
  USE_MOCK,
  NODE_ENV,
  EMAIL_AS_LOGIN,
} = process.env;

const projectId = PROJECT_ID || 'mockServer';
const useMock = !!USE_MOCK || NODE_ENV === 'test';

export const CLIENTS = {
  [projectId]: {
    clientId: projectId,
    clientSecret: `${projectId}${projectId}`,
    name: projectId,
  },
  // frontCore: {
  //   clientId: '@reagentum/front-core',
  //   clientSecret: '@reagentum/front-core@reagentum/front-core',
  //   name: 'Front Core app',
  // },
};

export const USERS = {
  ivanovI: {
    username: EMAIL_AS_LOGIN ? 'ivanovI@local.com' : 'ivanovI',
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
    projectId: CLIENTS[projectId].clientId,
  },
  korolevaU: {
    username: EMAIL_AS_LOGIN ? 'korolevaU@local.com' : 'korolevaU',
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
    projectId: CLIENTS[projectId].clientId,
  },
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

export default {
  CLIENTS,
  USERS: useMock ? USERS : {},
};
