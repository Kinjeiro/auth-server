import updateRouter from '../../helpers/express/create-route';

/**
 * @see - \src\routes\api-docs\swagger.yaml
 */
export default updateRouter(
  '/',
  (req, res) => res.send('OK'),
  {
    auth: false,
  },
);
