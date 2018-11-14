import ValidationError from './ValidationError';

export default class NotUniqueError extends ValidationError {
  errorClass = 'NotUniqueError';
}
