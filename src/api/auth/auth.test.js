import {
  getTestToken,
  testClient,
  testUser,
} from '../../../test/utils/get-test-token';

import config from '../../config';
import logger from '../../helpers/logger';

import { fillDataBase } from '../../db/db-utils';
import {
  createResetPasswordToken,
  findUserByName,
} from '../../services/service-auth';

import { GRANT_TYPE_PARAM_VALUES } from '../../auth/authorization-oauth2';

describe('[api] auth', function anon() {
  // more timeout for database
  this.timeout(20000);

  describe('[route] /api/auth/signup', () => {
    const testNewUser = {
      username: 'newTestUser',
      email: 'newTestUser@opa.com',
      password: 'newTestNewTest',
    };
    before(async () => {
      await fillDataBase({
        Client: [testClient],
        User: [testUser],
      }, {
        dropOther: true,
      });
    });

    it('should signup new user', async () => {
      const {
        status,
        body: user,
      } = await chai.request(server)
        .post('/api/auth/signup')
        .send({
          client_id: testClient.clientId,
          client_secret: testClient.clientSecret,
          userData: {
            ...testNewUser,
          },
        });

      expect(status).to.equal(200);
      expect(user.username).to.equal(testNewUser.username);
      // так как провайдер не указан будет взять clientId
      expect(user.provider).to.equal(testClient.clientId);
    });
    it('should "Unauthorized" without client', async () => {
      try {
        await chai.request(server)
          .post('/api/auth/signup')
          .send({
            userData: {
              ...testNewUser,
            },
          });
        expect(true).to.be.false;
      } catch (errorResponse) {
        expect(errorResponse.status).to.equal(401);
        expect(errorResponse.message).to.equal('Unauthorized');
      }
    });

    it('should throw 422 user with username already exist', async () => {
      try {
        await chai.request(server)
          .post('/api/auth/signup')
          .send({
            client_id: testClient.clientId,
            client_secret: testClient.clientSecret,
            userData: {
              ...testNewUser,
              username: testUser.username,
            },
          });
        expect(true).to.be.false;
      } catch (errorResponse) {
        expect(errorResponse.response.body.status).to.equal(422);
        expect(Object.keys(errorResponse.response.body.validationErrors)).has.length(1);
        expect(errorResponse.response.body.validationErrors.username)
          .to.equal(`Пользователь с логином "${testUser.username}" уже существует`);
      }
    });

    it('should create user with the exist username but new projectId', async () => {
      const {
        status,
        body: newUser,
      } = await chai.request(server)
        .post('/api/auth/signup')
        .set('project_id', 'otherProjectId')
        .send({
          client_id: testClient.clientId,
          client_secret: testClient.clientSecret,
          userData: {
            ...testNewUser,
            username: testUser.username,
          },
        });

      expect(status).to.equal(200);
      expect(newUser).is.exist();
      expect(newUser.username).to.equal(testUser.username);
      expect(newUser.projectId).to.equal('otherProjectId');
    });
  });

  describe('[route] /api/auth/signin', () => {
    before(async () => {
      await fillDataBase({
        Client: [testClient],
        User: [testUser],
      }, {
        dropOther: true,
      });
    });

    it('should be "Unauthorized" without correct client', async () => {
      try {
        await chai.request(server)
          .post('/api/auth/signin')
          .send({
            grant_type: GRANT_TYPE_PARAM_VALUES.password,
            client_id: 'fake',
            client_secret: 'fake',
            username: 'fake',
            password: 'fake',
          });
        expect(true).to.be.false;
      } catch (errorResponse) {
        /*
         message = "Unauthorized"
         original = null
         response = Response
         stack = "Error: Unauthorized\n    at Test.Request.callback...
         status = 401
         */
        expect(errorResponse.status).to.equal(401);
        expect(errorResponse.message).to.equal('Unauthorized');
      }
    });

    it('should be "Unauthorized" without correct data', async () => {
      try {
        await chai.request(server)
          .post('/api/auth/signin')
          .send({
            grant_type: GRANT_TYPE_PARAM_VALUES.password,
            client_id: testClient.clientId,
            client_secret: testClient.clientSecret,
            username: 'fake',
            password: 'fake',
          });
        expect(true).to.be.false;
      } catch (errorResponse) {
        /*
         name: 'TokenError',
         message: 'Invalid resource owner credentials',
         code: 'invalid_grant',
         status: 403,
         stack: 'TokenError: Invalid resource owner credentials
         */
        expect(errorResponse.response.status).to.equal(403);
        console.warn('ANKU , errorResponse.response.body', errorResponse.response.body);
        expect(errorResponse.response.body.message).to.equal('Invalid resource owner credentials');
      }
    });

    it('should return token obj on correct login data', async () => {
      const {
        status,
        body: tokenInfo,
      } = await chai.request(server)
        .post('/api/auth/signin')
        .send({
          grant_type: GRANT_TYPE_PARAM_VALUES.password,
          /*
            @NOTE: обязательно следить за snake записью (_) так как это стандарт!
          */
          client_id: testClient.clientId,
          client_secret: testClient.clientSecret,
          username: testUser.username,
          password: testUser.password,
        });
      /*
       res.body = {
         "access_token": "395549ac90cd6f37cbc28c6cb5b31aa8ffe2a22826831dba11d6baae9dafb07a",
         "refresh_token": "857896e0aab5b35456f6432ef2f812a344e2a3bab12d38b152ee3dd968442613",
         "expires_in": 3600,
         "token_type": "Bearer"
       }
      */
      expect(status).to.equal(200);
      expect(tokenInfo.access_token).not.to.be.empty();
      expect(tokenInfo.refresh_token).not.to.be.empty();
      expect(tokenInfo.access_token).not.to.be.equal(tokenInfo.refresh_token);
      expect(tokenInfo.expires_in).to.equal(config.server.features.security.token.tokenLife);
      expect(tokenInfo.token_type).to.equal('Bearer');
    });

    it('should return new token by refresh token', async () => {
      const {
        body: {
          access_token,
          refresh_token,
        },
      } = await chai.request(server)
        .post('/api/auth/signin')
        .send({
          grant_type: GRANT_TYPE_PARAM_VALUES.password,
          client_id: testClient.clientId,
          client_secret: testClient.clientSecret,
          username: testUser.username,
          password: testUser.password,
        });

      const {
        status,
        body: {
          access_token: newAccessToken,
          refresh_token: newRefreshToken,
        },
      } = await chai.request(server)
        .post('/api/auth/signin')
        .send({
          grant_type: GRANT_TYPE_PARAM_VALUES.refresh_token,
          client_id: testClient.clientId,
          client_secret: testClient.clientSecret,
          refresh_token,
        });

      expect(status).to.equal(200);
      expect(newAccessToken).not.to.be.empty();
      expect(newRefreshToken).not.to.be.empty();
      expect(newAccessToken).not.to.equal(access_token);
      expect(newRefreshToken).not.to.equal(refresh_token);
    });

    it('should return invalid resource owner when wrong password', async () => {
      try {
        await chai.request(server)
          .post('/api/auth/signin')
          .send({
            grant_type: GRANT_TYPE_PARAM_VALUES.password,
            client_id: testClient.clientId,
            client_secret: testClient.clientSecret,
            username: testUser.username,
            password: 'fake',
          });
        expect(true).to.be.false;
      } catch (errorResponse) {
        expect(errorResponse.response.status).to.equal(403);
        expect(errorResponse.response.body.message).to.equal('Invalid resource owner credentials');
      }
    });
  });

  describe('[route] /api/auth/user', () => {
    let token;

    before(async () => {
      token = await getTestToken(testUser);
    });

    it('should return user info by correct token', async () => {
      const {
        status,
        body: userInfo,
      } = await chai.request(server)
        .get('/api/auth/user')
        .set('Authorization', `Bearer ${token}`);

      /*
       {
       "userName": "59ba24251d1c69466ca3346b",
       "scope": "*"
       }
      */
      expect(status).to.equal(200);
      expect(userInfo.username).to.equal(testUser.username);
      expect(userInfo.scope).to.equal('*');
    });

    it('should "Unauthorized" error without correct token', async () => {
      const fakeToken = 'test';
      try {
        await chai.request(server)
          .get('/api/auth/user')
          .set('Authorization', `Bearer ${fakeToken}`);
        expect(true).to.be.false;
      } catch (errorResponse) {
        expect(errorResponse.status).to.equal(401);
        expect(errorResponse.message).to.equal('Unauthorized');
      }
    });
  });

  describe('[route] /api/auth/signout', () => {
    let token;

    before(async () => {
      token = await getTestToken(testUser);
    });

    it('should "Unauthorized" error after success sign out', async () => {
      const {
        body: user,
      } = await chai.request(server)
        .get('/api/auth/user')
        .set('Authorization', `Bearer ${token}`);

      expect(user.username).to.equal(testUser.username);

      const {
        status,
      } = await chai.request(server)
        .get('/api/auth/signout')
        .set('Authorization', `Bearer ${token}`);

      expect(status).to.equal(200);

      try {
        await chai.request(server)
          .get('/api/auth/user')
          .set('Authorization', `Bearer ${token}`);

        expect(true).to.be.false;
      } catch (errorResponse) {
        expect(errorResponse.status).to.equal(401);
        expect(errorResponse.message).to.equal('Unauthorized');
      }
    });
  });

  describe('[route] /api/auth/forgot', () => {
    before(async () => {
      await fillDataBase({
        Client: [testClient],
        User: [testUser],
      }, {
        dropOther: true,
      });
    });

    it('should be generate new reset password token', async () => {
      const resetPasswordPageUrl = 'http://127.0.0.1/profile/reset';
      const {
        status,
        // body: {
        //   url: resetFullUrl,
        // },
      } = await chai.request(server)
        .post('/api/auth/forgot')
        .send({
          email: testUser.email,

          resetPasswordPageUrl,
          client_id: testClient.clientId,
          client_secret: testClient.clientSecret,
        });
      expect(status).to.equal(200);
      // expect(resetFullUrl).to.have.string(`${resetPasswordPageUrl}?token=`);
    });
  });

  describe('[route] /api/auth/reset', () => {
    let resetToken;
    let accessToken;

    beforeEach(async () => {
      await fillDataBase({
        Client: [testClient],
        User: [testUser],
      }, {
        dropOther: true,
      });
      accessToken = await getTestToken(testUser, testClient, false);
      const user = await findUserByName(testUser.projectId, testUser.username);
      resetToken = await createResetPasswordToken(user, testClient.clientId);
      logger.debug('Start test: [route] /api/auth/reset', '\n');
    });

    it('should be change to new password', async () => {
      // проверим что успешно залогинился
      expect(accessToken).to.be.exist();

      // меняем пароль на новый с помощью resetToken
      logger.log('Change to new password');
      const {
        status,
      } = await chai.request(server)
        .post('/api/auth/reset')
        .send({
          resetPasswordToken: resetToken,
          newPassword: '654321',
          // emailOptions
          client_id: testClient.clientId,
          client_secret: testClient.clientSecret,
        });

      expect(status).to.equal(200);

      try {
        // логин по старым данным должен быть неудачным
        logger.log('Try to signin with old credentials');
        accessToken = await getTestToken(testUser, testClient, false);
        expect(true).to.be.false;
      } catch (errorResponse) {
        expect(errorResponse.status).to.equal(403);
        expect(errorResponse.response.body.message).to.equal('Invalid resource owner credentials');
      }

      // логин по новым данным должен быть ок
      logger.log('Try to signin with new credentials');
      accessToken = await getTestToken(
        {
          ...testUser,
          password: '654321',
        },
        testClient,
        false,
      );
      expect(accessToken).to.be.exist();
    });
  });
});
