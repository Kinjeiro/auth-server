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
3. Если надо получать часть данных других пользователей внутри приложения, необходимо создать пользователя и через базу добавить ему роль ```protector``` и флаг ```isSystem: true``` (чтобы не показывать в общем списке пользователей)
(Например на торговых площадках клиент, оплативший покупку, получает доступ к инфомарции телефона и почты продавца. Приложение должно запросить эти данные с помощью этой protector учетки)
4. Запустим билд и pm2 запустит daemon процесс. Глянем логи для него
```
npm run update:daemon:development && npm run logs
```
5. Открываем браузер и пользуемся апи, описанным в swagger
```
http://dev.reagentum.ru:1338/api-docs
```

## API
Все начинаются с префикса - api (к примеру ```http://dev.reagentum.ru:1338/api/health```)

Health
- [GET] /api/health

Auth (\src\routes\auth.js)
- [POST] /api/auth/signup (\*) - регистрация нового пользователя
- [POST] /api/auth/signin (\*) - вход и получение токенов доступа
- [GET] /api/auth/user - проверка токена и получение по нему пользователя 
- [GET] /api/auth/signout - выход
- [POST] /api/auth/forgot (\*) - забыли пароль, генерация токена на смену пароля и отправка его на почту
- [POST] /api/auth/reset (\*) - смена пароля, отправка на почту сообщения об успешности смены пароля

\* - Необходимы "client_id" и "client_secret" в теле запроса (либо в query)

Users (\src\routes\users.js)
- [GET] /api/users/avatar/:username - получение аватарки в data:image
- [GET] /api/users/public/:username - получение публичных данных пользователя
- [GET] /api/users/protected/:username - получение частисных данных пользователя (телефон, почта и так далее). **Нужна роль 'protector'**

- [PUT] /api/users/ - изменение данных пользователя
- [DELETE] /api/users/ - удаление пользователя

- [PUT] /api/users/:username - изменение данных пользователя админом
- [DELETE] /api/users/:username - удаление пользователя админом

- [DELETE] /api/users/all - удаление всех пользователей админом
