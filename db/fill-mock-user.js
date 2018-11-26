/**
 * @deprecated user npm run mongo:fill
 */
// // !!! MONGO SHELL format
// // The mongo shell is its own javascript environment running the V8 engine. You can't load in Node.js modules into the mongo shell anymore than you can into the browser
//
// db = db.getSiblingDB('auth-server');
//
// // var projectId = '<project_name_from_project_package.json>';
// const projectId = 'testProject';
// const useMockUsers = true;
//
// printjson(db.clients.insertOne({
//   clientId: projectId,
//   // дефолтное правило по которому формируется секретное слово для проекта
//   clientSecret: projectId + projectId,
//   name: projectId
// }));
//
// if (useMockUsers) {
//   const resultCursor = db.users.insertMany([
//     // MongoDB adds the _id field with an ObjectId if _id is not present
//     {
//       username: 'ivanovI',
//       // password: '123456',
//
//       displayName: 'Ivanov I. I.',
//       firstName: 'Ivan',
//       middleName: 'Ivanovich',
//       lastName: 'Ivanov',
//       email: 'ivanovI@local.com',
//       // todo @ANKU @LOW - profileImageURI
//
//       // есть значение по умолчанию
//       // roles: [],
//       // permissions: [],
//
//       provider: 'local',
//       projectId,
//
//       salt: '7da3614c89b65fa8741f407c58ec11794588097ec6f99de55de076f6aa88e97a',
//       // 123456
//       hashedPassword: '647acb992999b68f49d099c69ef7079afba47fd4',
//     },
//     {
//       username: 'korolevaU',
//       // password: '123456',
//
//       displayName: 'Koroleva U. A.',
//       firstName: 'Uliya',
//       middleName: 'Alexsandrovna',
//       lastName: 'Koroleva',
//       email: 'korolevaU@local.com',
//
//       roles: [
//         'user',
//         'testRole'
//       ],
//       permissions: [
//         'TEST_PERMISSION'
//       ],
//
//       provider: 'local',
//       projectId,
//
//       salt: '08bfd6fe2aaa0287ea0f728cff9dd3d154ed82f6ab7f13291735c535a1ba82a4',
//       hashedPassword: 'a99cf7e3a8b44fb6c2bd19d8dd1ee3a2d98133af',
//     }
//   ]);
//
//   while (resultCursor.hasNext()) {
//     printjson( resultCursor.next() );
//   }
//
//   console.log(`\
//     !!! set for your front-core config mock section:\
//       config.common.features.auth.mockUsers.ivanovIUserId = ;\
//       config.common.features.auth.mockUsers.korolevaUUserId = ;\
//   `);
// }
