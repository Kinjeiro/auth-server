Авторизационный сервер OAuth 2

Все начинаются с префикса - api


Health
- [GET] /api/health

Auth (\src\routes\auth.js)
- [POST] /api/auth/signup (\*)
- [POST] /api/auth/signin (\*)
- [GET] /api/auth/user
- [GET] /api/auth/signout

\* - Необходимы "client_id" и "client_secret" в теле запроса
