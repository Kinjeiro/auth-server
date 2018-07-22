import winston from 'winston';

winston.emitErrs = true;

export default function loggerFactory(transportConfigs = null, winstonOptions = {}) {
  const transports = Object.values(transportConfigs)
    .reduce((result, transportConfig) => {
      if (transportConfig) {
        let WinstonTransportClass;
        switch (transportConfig.type) {
          case 'file': WinstonTransportClass = winston.transports.File; break;
          case 'console': WinstonTransportClass = winston.transports.Console; break;
          // todo @ANKU @LOW - остальные типы
          default:
            throw new Error(`Неправильный тип логгера "${transportConfig.type}"`);
        }

        result.push(new WinstonTransportClass(transportConfig));
      }
      return result;
    }, []);


  return new winston.Logger({
    transports,
    ...winstonOptions,
  });
}
