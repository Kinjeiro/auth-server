# Auth-server - Авторизационный сервер OAuth 2

## Установка и настройка
* [Настройка Mongo DB](./db/README.md)

## Запуск сервера
К примеру, проект ```myProject``` (name из проектного package.json)

1. Установим нужные зависимости
```
npm i && npm i cross-env -g
```
2. Создадим клиента и моки под него
```
cross-env PROJECT_ID=myProject USE_MOCK=1 NODE_ENV=development npm run mongo:mock 
```
3. Запустим билд и pm2 запустит daemon процесс. Глянем логи для него
```
npm run update:daemon:development && npm run logs
```
4. Открываем браузер и пользуемся апи, описанным в swagger
```
http://dev.reagentum.ru:1337/api-docs
```

## API
Все начинаются с префикса - api (к примеру ```http://dev.reagentum.ru:1337/api/health```)

Health
- [GET] /api/health

Auth (\src\routes\auth.js)
- [POST] /api/auth/signup (\*) - регистрация нового пользователя
- [POST] /api/auth/signin (\*) - вход и получение токенов доступа
- [GET] /api/auth/user - проверка токена и получение по нему пользователя 
- [GET] /api/auth/signout - выход
- [POST] /api/auth/forgot (\*) - забыли пароль, генерация токена на смену пароля и отправка его на почту
- [POST] /api/auth/reset (\*) - смена пароля, отправка на почту сообщения об успешности смены пароля

\* - Необходимы "client_id" и "client_secret" в теле запроса
