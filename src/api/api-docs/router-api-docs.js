import path from 'path';
import swaggerUi from 'swagger-ui-express';
// import swaggerJsdoc from 'swagger-jsdoc';
import YAML from 'yamljs';

// import createRoute from '../../helpers/express/create-route';

export default function appMiddlewareApiDocs(app, prefix) {
  const swaggerDocument = YAML.load(path.resolve(__dirname, '../swagger.yaml'));

  app.use(
    prefix,
    swaggerUi.serve,
    swaggerUi.setup(
      swaggerDocument,

      // // todo @ANKU @LOW @BUG_OUT @swagger-jsdoc - не работает requestBody и не подключаются components из отдельного файла
      // swaggerJsdoc({
      //   // Import swaggerDefinitions
      //   swaggerDefinition: {
      //     info: { // API informations (required)
      //       title: 'Hello World',         // Title (required)
      //       version: '1.0.0',             // Version (required)
      //       description: 'A sample API',  // Description (optional)
      //     },
      //     host: 'localhost:3000',         // Host (optional)
      //     basePath: '/',                  // Base path (optional)
      //   },
      //   // Path to the API docs
      //   apis: [
      //     path.resolve(__dirname, './components.yaml'),
      //     path.resolve(__dirname, '../../routes/**/*.js'),
      //   ],
      // }),

      {
        explorer: true,
      },
    ),
  );
}


