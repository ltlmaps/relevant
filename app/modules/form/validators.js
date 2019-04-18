import { NAME_PATTERN } from 'app/utils/text';
import { checkUser } from 'modules/auth/auth.actions';

export const required = value =>
  value || typeof value === 'number' ? undefined : 'Required';

export const email = value => {
  const valid = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(value);
  if (valid) {
    return undefined;
  }
  return 'Not a valid e-mail';
};

export const validCharacters = value => {
  const match = NAME_PATTERN.test(value);
  if (!match) {
    return 'Can only contain letters, \nnumbers, dashes and underscores';
  }
  return undefined;
};

export const asyncEmail = async value => {
  const results = await checkUser(value, 'email')();
  if (results) {
    return 'This email has already been used';
  }
  return null;
};

export const asyncUsername = async value => {
  if (value) {
    const results = await checkUser(value, 'name')();
    // TODO: no error if username is own username
    if (results) {
      return 'This username is already taken';
    }
  }
  return null;
};

export const signupAsyncValidation = async values => {
  const errors = {};
  if (values.username) {
    errors.username = await asyncUsername(values.username);
  }
  if (values.email) {
    errors.email = await asyncEmail(values.email);
  }
  throw errors;
};
