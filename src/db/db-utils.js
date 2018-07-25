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

export function connect(dbUri) {
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

  mongoose.connect(dbUri);

  const newConnection = mongoose.connection;
  newConnection.on('error', (err) => logger.error('Connection error:', err.message));
  newConnection.once('open', () => logger.info(`Connected to DB: ${dbUri}`));

  return mongoose;
}


async function clearCollection(Model) {
  // Бывает что коллекции и нет и тогда при дропе падает ошибка: "MongoError: ns not found"
  // await collection.drop();
  // проше всех удалить
  const {
    result: {
      n: count,
    },
  } = await Model.remove({});
  logger.info(`Drop "${Model.collection.collectionName}" collection ${count > 0 ? `(remove ${count} docs)` : ''}`);
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

  let dbFinal = db;

  if (!dbFinal || typeof dbFinal === 'string') {
    try {
      dbFinal = await connect(typeof dbFinal === 'string' ? dbFinal : undefined);
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  try {
    await Promise.all(Object.keys(dbFinal.connection.models).map(async (modelName) => {
      const Model = dbFinal.connection.models[modelName];
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
