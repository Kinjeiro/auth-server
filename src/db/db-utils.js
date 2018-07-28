import mongoose from 'mongoose';
import muri from 'muri';

import config from '../config';
import logger from '../helpers/logger';

// Set mongoose.Promise to any Promise implementation
mongoose.Promise = Promise;

export function equalConnections(connection, dbUri) {
  const {
    name,
    host,
    port,
  } = connection;

  const parsed = muri(dbUri);
  return name === parsed.db
    && host === (parsed.hosts[0].host || parsed.hosts[0].ipc)
    && port === (parsed.hosts[0].port || 27017);
}

export async function connect(
  dbUri,
  dropOnStart = config.server.features.db.dropOnStart,
) {
  if (typeof dbUri === 'undefined') {
    // eslint-disable-next-line no-param-reassign
    dbUri = config.common.isTest
      ? config.server.features.db.mongoose.testUri
      : config.server.features.db.mongoose.uri;
  }

  if (!dbUri) {
    const errorMsg = 'Empty database uri';
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  /*
   STATES[0] = disconnected;
   STATES[1] = connected;
   STATES[2] = connecting;
   STATES[3] = disconnecting;
   STATES[4] = unauthorized;
   STATES[99] = uninitialized;
  */
  if (mongoose.connection.readyState !== mongoose.STATES.disconnected) {
    logger.debug(`There is connection with status "${mongoose.STATES[mongoose.connection.readyState]}"`);
    // уже есть коннекшен
    if (equalConnections(mongoose.connection, dbUri)) {
      // уже есть такой коннекшен с такими же параметрами
      logger.debug('The same connection has benn already opened.');
      return mongoose;
    }

    mongoose.disconnect();
  }

  await mongoose.connect(dbUri, () => {
    if (dropOnStart) {
      mongoose.connection.dropDatabase();
    }
  });

  const newConnection = mongoose.connection;
  newConnection.on('error', (err) => logger.error('Connection error:', err.message));
  newConnection.once('open', () => logger.info(`Connected to DB: ${dbUri}`));

  return mongoose;
}


async function clearCollection(Model) {
  // Бывает что коллекции и нет и тогда при дропе падает ошибка: "MongoError: ns not found"
  // await collection.drop();
  // проше всех удалить
  const result = await Model.remove({});
  const {
    n: count,
  } = result;
  logger.info(`Drop "${Model.collection.collectionName}" collection ${count > 0 ? `(remove ${count} docs)` : ''}`);
}


async function connectionWrapper(db, executeFn, options = {}) {
  const {
    disconnect = false,
  } = options;

  let dbFinal = db;

  try {
    if (!dbFinal || typeof dbFinal === 'string') {
      dbFinal = await connect(typeof dbFinal === 'string' ? dbFinal : undefined);
    }

    await executeFn(dbFinal.connection);

  } catch (error) {
    logger.error(error);
    throw error;
  } finally {
    if (disconnect) {
      // не нужно включать в общую цепочку promise - так как пользователю можно вернуть результат раньше, нежели закроется коннекшен
      setTimeout(async () => {
        await dbFinal.disconnect();
        logger.info('Disconnected from DB');
      }, 3000);
    }
  }
}

/*
* Так как связи происходят по ключам, то не важно в какой последовательности обновляются коллекции, поэтому можем спокойно использовать мапу
*/
export async function fillDataBase(
  modelToEntitiesMap,
  options = {},
) {
  const {
    db,
    dropCollection = true,
    dropOther,
    disconnect = false,
  } = options;

  logger.debug('fillDataBase');

  return connectionWrapper(
    db,
    (connection) => {
      const { models } = connection;

      return Promise.all(Object.keys(models).map(async (modelName) => {
        const Model = models[modelName];
        const entitiesAttributes = modelToEntitiesMap[modelName];
        const hasInfo = !!entitiesAttributes;
        const { collectionName } = Model.collection;

        if (hasInfo) {
          if (dropCollection) {
            await clearCollection(Model);
          }

          if (entitiesAttributes.length) {
            // через Model чтобы была валидация полей
            // const count = await collection.insertMany(entitiesAttributes);
            const docs = await Model.insertMany(entitiesAttributes);
            const docIds = docs.map(({ id }) => id);
            logger.info(`Insert ${docIds.length} documents into "${collectionName}" collection: \n`, docIds.join(', '));
          }
        } else if (dropOther) {
          await clearCollection(Model);
        }
      }));
    },
    {
      disconnect,
    },
  );
}
