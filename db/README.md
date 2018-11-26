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
создаем супер админа на все базы добавить - пользователя с ролью ```root```
```
mongo localhost:27017/admin --eval "db.createUser({user: 'superAdmin', pwd: 'SECRET_PASSWORD',roles: ['root']});"
```

Создаем пользователя админа для authServer через консольку
```
mongo localhost:27017/admin -u "superAdmin" -p "SECRET" --authenticationDatabase "admin" --eval "db.createUser({user: 'authServerUser', pwd: 'authAuth',roles: [{ role: 'dbOwner', db: 'auth-server' },{ role: 'dbOwner', db: 'auth-serverTest' }]});"
```
или через скрипт
(относительные пути - это относительно рабочей папки mongo поэтому приходится использовать абсолютные)
```
mongo localhost:27017/admin "<absolute_path_to_project>\db\create-project-user.js"
```

(проверьте чтобы создался именно в базе admin и не test)

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
npm i && npm i cross-env -g && cross-env PROJECT_ID=<YOUR_PROJECT_ID> USE_MOCK=1 NODE_ENV=development npm run mongo:fill
```
```PROJECT_ID``` - projectId или clientId проекта. В корных проектах ```clientId``` равен ```name``` из ```package.json```
(конфиг ```server.features.auth.applicationClientInfo.client_id```)

```USE_MOCK``` - создать моковских пользователей: ```ivanovI\123456``` и ```korolevaU\123456```

Способ через файл неочень хорош, так как не учитывает модельных дефолтных настроек (к примеру, salt, hashed, created, updated приходится сначала руками генерить)
Пути должны быть абсолютными
```
mongo dev.reagentum.ru:27017 -u authServerUser -p authAuth --authenticationDatabase "admin" "H:\auth-server\db\fill-mock-user.js"
```



## Развертывание под Ubuntu
### Установка
(Установка по инструкции - https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/)
```
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 9DA31620334BD75D9DCB49F368818C72E52529D4
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/4.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
```

### Старт как сервис

#### ДЛЯ УБУНТУ 16+
```sudo systemctl enable mongod```
(внимание только "d" на конце, а не "db")
```sudo systemctl start mongod && sudo systemctl status mongod```

#### Для остальных
```sudo nano /etc/systemd/system/mongod.service```
скопировать текст:
    ```
    [Unit]
    Description=High-performance, schema-free document-oriented database
    After=network.target
    
    [Service]
    User=mongodb
    ExecStart=/usr/bin/mongod --quiet --config /etc/mongod.conf
    
    [Install]
    WantedBy=multi-user.target
    sudo systemctl start mongod && sudo systemctl status mongod
    ```


(старт сервиса при запуске системы)
```sudo systemctl enable mongod```

### Создаем пользователей
создания superAdmin на всех сервера
```
mongo localhost:27017/admin --eval "db.createUser({user: 'superAdmin', pwd: 'SECRET_PASSWORD',roles: ['root']});"
```

создания admin для проекта
```
mongo localhost:27017/admin -u "superAdmin" -p "SECRET" --authenticationDatabase "admin" --eval "db.createUser({user: '<your_project>Admin', pwd: '<secret>',roles: [{ role: 'dbOwner', db: '<your_project>' },{ role: 'dbOwner', db: '<your_project>Test' }]});"
```
(в случае с auth-server:)
```
mongo localhost:27017/admin -u "superAdmin" -p "SECRET" --authenticationDatabase "admin" --eval "db.createUser({user: 'authServerUser', pwd: 'authAuth',roles: [{ role: 'dbOwner', db: 'auth-server' },{ role: 'dbOwner', db: 'auth-serverTest' }]});"
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
```
(и пробуем приконнектится с удаленной машины): 
```
mongo dev.reagentum.ru:27017/admin -u superAdmin -p SECRET_PASSWORD --authenticationDatabase "admin"
```

проверим еще в логах
```
cat /var/log/mongodb/mongod.log
```

Включим порт для внешнего подключения (https://ianlondon.github.io/blog/mongodb-auth/)
Закоментить биндинг bindIp и включим авторизацию 
```sudo nano /etc/mongod.conf```
```
# network interfaces
net:
  port: 27017
#  bindIp: 127.0.0.1
  bindIp: ::,0.0.0.0
#  bindIpAll: true
    
security:
  authorization: enabled
```

(После рестартнем)
```sudo systemctl restart mongod```

доступ
```
mongo --port 27017 -u superAdmin -p SECRET_PASSWORD --authenticationDatabase "admin"
> db.getUsers()
```

а потом тест на удаленной машине удаленный
```
mongo dev.reagentum.ru:27017/admin -u superAdmin -p SECRET_PASSWORD --authenticationDatabase "admin"
> db.getUsers()
```


Дальше коннектимся любым клиентом (через WebStorm)
```
superAdmin \ SECRET
database: admin
Auth. mecanism: SCRAM-SHA-1
```
