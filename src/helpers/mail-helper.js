import merge from 'lodash/merge';
import nodemailer from 'nodemailer';

import config from '../config';
import logger from './logger';

const DEFAULT_TRANSPORT_OPTIONS = config.server.features.mail.transportOptions;
const DEFAULT_MESSAGE_OPTIONS = config.server.features.mail.messageOptions;

let currentTransport = null;

function verifyTransport(transport) {
  return new Promise((resolve, reject) => {
    logger.debug(`Verify mail transport: ${transport.options.host}:${transport.options.port}`);
    try {
      transport.verify((error, success) => {
        if (error) {
          logger.error('-- error transport', error);
          return reject(error);
        }
        logger.debug('-- ok');
        return resolve(transport);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 *
 * @param options - https://nodemailer.com/smtp/
 */
async function getTransport(options = null) {
  let transport = currentTransport;

  if (options || !transport) {
    transport = nodemailer.createTransport(merge({}, DEFAULT_TRANSPORT_OPTIONS, options));
    await verifyTransport(transport);
    if (!options) {
      currentTransport = transport;
    }
  }
  return transport;
}

/**
 *
 * @param to
 * @param subject
 * @param html
 * @param messageOptions - https://nodemailer.com/message/
 *
 * @return {Promise.<void>}
 */
export async function sendEmail(to, subject, html, messageOptions = null) {
  const transport = await getTransport();
  logger.info(`Send email to "${to}".`);

  const message = {
    ...DEFAULT_MESSAGE_OPTIONS,
    to,
    // subject: 'Password Reset',
    subject,
    // text: 'Plaintext version of the message',

    /*
      Memory leak warning! When using readable streams as content and sending fails then Nodemailer does not abort the already opened but not yet finished stream, you need to do this yourself. Nodemailer only closes the streams it has opened itself (eg. file paths, URLs)
      html: fs.createReadStream('content.html')
    */
    // html: `${'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
    // 'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
    // 'http://'}${req.headers.host}/reset/${token}\n\n` +
    // 'If you did not request this, please ignore this email and your password will remain unchanged.\n',
    html,

    ...messageOptions,
  };

  return new Promise((resolve, reject) => {
    transport.sendMail(message, (err) => {
      if (err) {
        logger.error(err);
        reject(err);
      }
      logger.info(`-- an e-mail has been sent to "${message.to}".`);
      resolve(message);
    });
  });
}

export default sendEmail;
