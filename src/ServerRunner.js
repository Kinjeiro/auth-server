import express from 'express';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import morgan from 'morgan';
import debug from 'debug';
import session from 'express-session';

import config from './config';
import { errorToJson } from './utils/common';
import logger from './helpers/logger';
import initDB from './db/init-models';
import { connect } from './db/db-utils';

import { expressPlugin as authenticatePlugin } from './auth/authenticate-passport';
import applyRoutes from './api';

const debugRestApi = debug('restapi');

export default class ServerRunner {
  init = false;
  app = null;
  server = null;

  createApp(serverOptions) {
    return express(serverOptions);
  }

  getMiddlewarePlugins() {
    const limit = config.server.main.maxContentSize;

    return [
      session({
        secret: 'reagentum_secret_key',
        cookie: { maxAge: 60000 },
        resave: false,
        saveUninitialized: true,
      }),
      bodyParser.json({
        limit,
      }),
      bodyParser.urlencoded({
        limit,
        extended: false,
        parameterLimit: 100,
      }),
      cookieParser(),
      methodOverride(),
      morgan('combined', {
        stream: {
          write: message => logger.info(message),
        },
      }),
      authenticatePlugin(),
    ];
  }

  errorHandle(err, req, res, next) {
    res.status(err.status || 500);
    logger.error(
      '[%s %d] %s',
      req.method,
      res.statusCode,
      err.message,
      err.stack,
    );

    // не сериализует вложенные объекты
    // return res.json(JSON.stringify(err, Object.getOwnPropertyNames(err)));
    return res.json(errorToJson(err));
  }

  getLastMiddlewarePlugins() {
    return [
      // catch 404 and forward to error handler
      (req, res, next) => {
        res.status(404);
        logger.debug('%s %d %s', req.method, res.statusCode, req.url);
        res.json({
          error: 'Not found',
        });
      },
      // error handlers
      this.errorHandle.bind(this),
    ];
  }

  getRouteAppliers() {
    return [applyRoutes];
  }

  initDataBase() {
    initDB();
  }
  async connectToDataBase() {
    await connect();
  }

  initServer() {
    if (!config.common.isProduction) {
      logger.debug(
        '=== SERVER CONFIG ===\n',
        JSON.stringify(config, null, 2),
        '\n\n',
      );
    }

    this.app = this.createApp(config.server.main.expressServerOptions);

    // ======================================================
    // FIRST MIDDLEWARES
    // ======================================================
    this.getMiddlewarePlugins().forEach(plugin => this.app.use(plugin));

    // ======================================================
    // ROUTER MIDDLEWARES
    // ======================================================
    this.getRouteAppliers().forEach(routeApplier => routeApplier(this.app));

    // ======================================================
    // LAST MIDDLEWARES
    // ======================================================
    this.getLastMiddlewarePlugins().forEach(plugin => this.app.use(plugin));

    this.init = true;
  }

  createServer() {
    const { init } = this;
    if (!init) {
      this.initServer();
    }

    const { app } = this;

    // eslint-disable-next-line prefer-destructuring
    const port = config.server.main.port;

    app.set('port', port);

    this.server = app.listen(port, () => {
      debugRestApi(`Express server listening on port ${port}`);
      logger.info(`Express server listening on port ${port}`);
    });

    return this.server;
  }

  async runServer(server = this.createServer()) {
    try {
      this.initDataBase();
      await this.connectToDataBase();

      return server;
    } catch (error) {
      logger.error(error);

      throw error;
    }
  }
}
