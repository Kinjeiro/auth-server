// !!! MONGO SHELL format
// The mongo shell is its own javascript environment running the V8 engine. You can't load in Node.js modules into the mongo shell anymore than you can into the browser

db.createUser({
  user: 'authServerUser',
  pwd: 'authAuth',
  roles: [
    // dbOwner = readWrite + dbAdmin + userAdmin https://docs.mongodb.com/manual/reference/built-in-roles/#dbOwner
    { role: 'dbOwner', db: 'auth-server' },
    { role: 'dbOwner', db: 'auth-serverTest' }
    // для всех баз - один админ
    // 'root'
  ]
});

/*
  либо через консоль:
  mongo --eval "db.createUser({user: 'authServerUser',pwd: 'authAuth',roles: [{ role: 'dbOwner', db: 'auth-server' },{ role: 'dbOwner', db: 'auth-serverTest' }]});"
*/
