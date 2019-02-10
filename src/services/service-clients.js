/* eslint-disable import/prefer-default-export */
import Client from '../db/model/client';

export async function getClientProviderCredentials(clientId, provider) {
  let client;
  if (!clientId) {
    if (clientId === '') {
      throw new Error('clientId must not be empty string');
    }
    throw new Error(`clientId must not be ${typeof clientId}`);
  }

  if (!provider) {
    if (provider === '') {
      throw new Error('Provider must not be empty string');
    }
    throw new Error(`Provider must not be ${typeof Provider}`);
  }
  try {
    client = await Client.findOne({ clientId });
  } catch (error) {
    throw new Error(error);
  }
  if (!client) {
    return undefined;
  }
  const providerCredentials = client.get(`providerCredentials.${provider}`);
  if (
    !providerCredentials
    || !Object.keys(providerCredentials).length
    // если пустое значение в пермом поле
    || !providerCredentials[Object.keys(providerCredentials)[0]]
  ) {
    return undefined;
  }
  return providerCredentials;
}
