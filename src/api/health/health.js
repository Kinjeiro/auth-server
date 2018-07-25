import config from '../../config';

import updateRouter from '../../helpers/express/create-route';

/**
 * @see - \src\api\swagger.yaml
 */
export default updateRouter(
  '/',
  (req, res) =>
    res.send(`${config.common.appId}@${config.common.appVersion}`),
  {
    auth: false,
  },
);
