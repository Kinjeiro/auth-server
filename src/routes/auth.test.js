import {
  getTestToken,
  testClient,
  testUser,
} from '../../test/utils/get-test-token';

import config from '../config';

import { fillDataBase } from '../db/db-utils';

import { GRANT_TYPE_PARAM_VALUES } from '../auth/authorization-oauth2';

describe('[api] auth', () => {
  describe('[route] /api/auth/signup', () => {
    const testNewUser = {
      username: 'newTestUser',
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
        expect(true).to.equal(false);
      } catch (errorResponse) {
        expect(errorResponse.status).to.equal(401);
        expect(errorResponse.message).to.equal('Unauthorized');
      }
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
        expect(true).to.equal(false);
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
        expect(true).to.equal(false);
      } catch (errorResponse) {
        /*
         message = "Unauthorized"
         original = null
         response = Response
         stack = "Error: Unauthorized\n    at Test.Request.callback...
         status = 401
         */
        expect(errorResponse.response.status).to.equal(403);
        expect(errorResponse.response.body.error).to.equal('invalid_grant');
        expect(errorResponse.response.body.error_description).to.equal('Invalid resource owner credentials');
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
        expect(true).to.equal(false);
      } catch (errorResponse) {
        expect(errorResponse.response.status).to.equal(403);
        expect(errorResponse.response.body.error).to.equal('invalid_grant');
        expect(errorResponse.response.body.error_description).to.equal('Invalid resource owner credentials');
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
        expect(true).to.equal(false);
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

        expect(true).to.equal(false);
      } catch (errorResponse) {
        expect(errorResponse.status).to.equal(401);
        expect(errorResponse.message).to.equal('Unauthorized');
      }
    });
  });
});
