const ServerRunner = require('./ServerRunner').default;

const runner = new ServerRunner();
const server = runner.createServer();

async function start() {
  try {
    // await initAll();
    return await runner.runServer(server);
  } catch (error) {
    console.error(error);
    return null;
  }
}

export const startPromise = start();

export default server;
