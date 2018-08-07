async function start() {
  try {
    // await initAll();
    const ServerRunner = require('./ServerRunner').default;
    const runner = new ServerRunner();
    await runner.runServer();
    return runner.server;
  } catch (error) {
    console.error(error);
  }
}

export default start();
