import updateRouter from '../helpers/express/create-route';

export default updateRouter(
  '/',
  (req, res) => res.send('OK'),
  {
    auth: false,
  },
);
