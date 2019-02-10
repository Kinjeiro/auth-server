// ======================================================
// ПЕРЕМЕННЫЕ GITLAB Runner СРЕДЫ
// ======================================================
1) публичный ключ от сервера положить в DEPLOYS_KEYS (```https://gitlab.com/<your_project>/settings/repository``` -> DEPLOYS KEYS)
Если такой сервер уже был на gitlab - посмотрите там же на закладку: ```Privately accessible deploy keys``` и нажмите ```Enable```

2) Переменные из VARIABLES (https://gitlab.com/<your_project>/settings/ci_cd -> VARIABLES)
Они могут уточнять наши глобальные переменные из https://gitlab.com/groups/reagentum/-/settings/ci_cd 
```
  DEV_PRIVATE_SSH_KEY                   - содержимое приватного ключа сервера
  DEV_HOST          (dev.reagentum.ru)  - хост на который деплоим
  DEV_USER          (root)              - пользователь ключа, который мы положили в DEPLOYS_KEYS
  DEV_APP_PATH      (/home/<app_name>)  - путь до приложения (pm2 делает три папки source (главная), target и )
  DEV_START_NODE_ENV_JSON               - json с переменными
```
```
  PROD_PRIVATE_SSH_KEY
  PROD_HOST         (front.reagentum.ru)
  PROD_USER         (root)
  PROD_APP_PATH     (/home/<app_name>)     
  PROD_START_NODE_ENV_JSON
```
Достпуны переменные от Gitlab CI - https://docs.gitlab.com/ee/ci/variables/#predefined-variables-environment-variables
```
$CI_COMMIT_REF_NAME -
$CI_ENVIRONMENT_NAME - имя enviroment.name (у нас либо 'development' \ либо 'production')
$CI_ENVIRONMENT_SLUG -  is a "cleaned-up" version of the name, suitable for use in URLs, DNS, etc
$CI_ENVIRONMENT_URL - Starting with GitLab 9.3, the environment URL is exposed to the Runner via $CI_ENVIRONMENT_URL. The URL would be expanded from .gitlab-ci.yml, or if the URL was not defined there, the external URL from the environment would be used.
$CI_PROJECT_URL - путь
$CI_REPOSITORY_URL - а тут путь с токеном каким-то
```

3) добавить в package.json
```
    "----- BUILD -----": "----------",
    "build:inner": "node ./node_modules/@reagentum/front-core/build-scripts/update-babelrc.js && node ./node_modules/@reagentum/front-core/build-scripts/build.js",
    "build:inner-env": "cross-env SERVER_PORT=__YOUR_PORT__ npm run build:inner",
    "build:production": "cross-env NODE_ENV=production npm run build:inner-env",
    "build:development": "cross-env NODE_ENV=development npm run build:inner-env",
    "----- START DAEMON -----": "----------",
    "start:daemon:development": "cross-env SERVER_PORT=__YOUR_PORT__ pm2 restart ./deploy/ecosystem.config.js --env development --update-env && pm2 save",
    "start:daemon:production": "cross-env SERVER_PORT=__YOUR_PORT__ pm2 restart ./deploy/ecosystem.config.js --env production --update-env && pm2 save",
    "start:daemon": "npm run start:daemon:production",
```
