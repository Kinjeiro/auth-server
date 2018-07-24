Авторизационный сервер OAuth 2

Все начинаются с префикса - api


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
