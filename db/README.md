## Интсаляция на Windows

### 0. Настройки окружения
Интсалим дистрибутив и добавляем в Path путь до монги 
```
С:\Program Files\MongoDB\Server\4.0\bin
```

### 1. Инсталим сервис
```
mongod --install --serviceName "MongoDB" --dbpath "B:\mongodb\db" --logpath "B:\mongodb\logs\mongo.log"
```

### 2. Добавляем пользователя для сервера
(относительные пути - это относительно рабочей папки mongo поэтому приходится использовать абсолютные)
```
mongo localhost:27017/admin "<absolute_path_to_project>\db\create-project-user.js"
```
или через консольку
```
mongo localhost:27017/admin --eval "db.createUser({user: 'authServerUser', pwd: 'authAuth',roles: [{ role: 'dbOwner', db: 'auth-server' },{ role: 'dbOwner', db: 'auth-serverTest' }]});"
```
если нужно супер админа на все базы добавить, то создаем пользователя с ролью ```root```
```
mongo localhost:27017/admin --eval "db.createUser({user: 'superAdmin', pwd: 'SECRET_PASSWORD',roles: ['root']});"
```

### 3. Инсталируем сервис в режиме авторизации
```
net stop MongoDB
mongod --install --auth --serviceName "MongoDB" --dbpath "B:\mongodb\db" --logpath "B:\mongodb\logs\mongo.log"
```

### 4. Запускаем службу
```
net start MongoDB
```
для остановки
```
net stop MongoDB
```

### 5. Инициализиурем данные для проекта
Добавляем для конкретного проекта клиента и для него моковских пользователей

```
npm i && npm i cross-env -g && cross-env PROJECT_ID=<YOUR_PROJECT_ID> USE_MOCK=1 EMAIL_AS_LOGIN=1 NODE_ENV=development npm run mongo:mock
```
```PROJECT_ID``` - projectId или clientId проекта. В корных проектах ```clientId``` равен ```name``` из ```package.json```
(конфиг ```server.features.auth.applicationClientInfo.client_id```)

```USE_MOCK``` - создать моковских пользователей: ```ivanovI\123456``` и ```korolevaU\123456```
```EMAIL_AS_LOGIN``` - в качестве username проставляется почта


Способ через файл неочень хорош, так как не учитывает модельных дефолтных настроек (к примеру, salt, hashed, created, updated приходится сначала руками генерить)
Пути должны быть абсолютными
```
mongo dev.reagentum.ru:27017 -u authServerUser -p authAuth --authenticationDatabase "admin" "H:\auth-server\db\fill-mock-user.js"
```



## Инсталяци под Ubuntu
https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/
```
sudo service mongod start --auth

sudo service mongod stop

mongo --host 127.0.0.1:27017
```

### Открываем порты 
Посмотреть открытые порты
```
sudo iptables -nvL
```
Теперь откроем нужный нам порт
```
sudo iptables -I INPUT -p tcp -m tcp --dport 27017 -j ACCEPT
sudo iptables -I OUTPUT -p tcp -m tcp --dport 27017 -j ACCEPT
sudo iptables-save
sudo ufw reload

tcpdump -i any -n port 27017
cat /var/log/mongodb/mongod.log
```

Включим порт для внешнего подключения
https://ianlondon.github.io/blog/mongodb-auth/
Закоментить биндинг bindIp и включим авторизацию ```/etc/mongod.conf```
```
# network interfaces
net:
  port: 27017
#  bindIp: 127.0.0.1
  bindIp: ::,0.0.0.0
  bindIpAll: true
    
security:
  authorization: enabled
```
После рестартнем
```
sudo service mongod restart
```
доступ
```
mongo --port 27017 -u superAdmin -p SECRET_PASSWORD --authenticationDatabase "admin"
```
а потом тест на удаленной машине удаленный
```
mongo dev.reagentum.ru:27017/admin -u superAdmin -p SECRET_PASSWORD --authenticationDatabase "admin"
> db.getUsers()
```
