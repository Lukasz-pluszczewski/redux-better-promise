import _ from 'lodash';

const defaultConfig = {
  promiseFieldName: 'promise',
  functionFieldName: 'function',
  typesFieldName: 'types',
  hooksFieldName: 'hooks',
  typesNames: {
    start: 'start',
    success: 'success',
    error: 'error',
  },
  hooksNames: {
    start: 'start',
    success: 'success',
    error: 'error',
  },
};

export default function createReduxPromiseMiddleware(additionalData, userConfig) {
  const config = _.merge({}, defaultConfig, userConfig);

  return ({ getState, dispatch }) => next => action => {
    // checking if middleware can handle this kind of action
    if (action[config.promiseFieldName] || action[config.functionFieldName]) {
      // getting fields from action object according to config
      const promise = action[config.promiseFieldName];

      const func = action[config.functionFieldName];

      const type = action.type;

      let types;
      // mapping types to standard object
      if (action[config.typesFieldName]) {
        if (Array.isArray(action[config.typesFieldName])) {
          types = {
            start: action[config.typesFieldName][0],
            success: action[config.typesFieldName][1],
            error: action[config.typesFieldName][2],
          };
        } else if (_.isPlainObject(action[config.typesFieldName])) {
          types = {
            start: action[config.typesFieldName][config.typesNames.start],
            success: action[config.typesFieldName][config.typesNames.success],
            error: action[config.typesFieldName][config.typesNames.error],
          };
        } else {
          throw new Error(`${config.typesFieldName} must be an array or plain object`);
        }
      }

      // I'm not sure if it should be an error
      if (!type && !types) {
        throw new Error('You must provide type or types field');
      }

      let hooks;
      if (action[config.hooksFieldName]) {
        if (Array.isArray(action[config.hooksFieldName])) {
          hooks = {
            start: action[config.hooksFieldName][0],
            success: action[config.hooksFieldName][1],
            error: action[config.hooksFieldName][2],
          };
        } else if (_.isPlainObject(action[config.hooksFieldName])) {
          hooks = {
            start: action[config.hooksFieldName][config.hooksNames.start],
            success: action[config.hooksFieldName][config.hooksNames.success],
            error: action[config.hooksFieldName][config.hooksNames.error],
          };
        } else {
          throw new Error(`${config.hooksFieldName} must be an array or plain object`);
        }
      }

      const rest = _.omit(
        action,
        [config.promiseFieldName, config.functionFieldName, config.typesFieldName, config.hooksFieldName, 'type']
      );

      if (types && types.start) {
        next({ type: types.start, ...rest });
      }
      if (hooks && hooks.start) {
        hooks.start(rest);
      }

      if (promise) {
        if (typeof promise !== 'function') {
          throw new Error(`${config.promiseFieldName} must be a function returning promise`);
        }
        if (func) {
          if (typeof func !== 'function') {
            throw new Error(`${config.functionFieldName} must be a function`);
          }
          // if we have both promise and function we call that function anyway
          func({ getState, dispatch, ...additionalData });
        }
        return promise({ getState, dispatch, ...additionalData }).then(
          result => {
            if (hooks && hooks.success) {
              hooks.success({ ...rest, result });
            }
            return (types && types.success) || type
              ? next({ ...rest, result, type: types ? types.success : action.type })
              : null;
          },
          error => {
            if (hooks && hooks.error) {
              hooks.error({ ...rest, error });
            }
            return types && types.error ? next({ ...rest, error, type: types.error }) : null;
          }
        );
      } else {
        if (typeof func !== 'function') {
          throw new Error(`${config.functionFieldName} must be a function`);
        }
        let result;
        try {
          result = func({ getState, dispatch, ...additionalData });
          // now errors thrown in success hook and next() function will be caught as well. This is unexpected behaviour and should be changed in the future.
          if (hooks && hooks.success) {
            hooks.success({ ...rest, result });
          }
          if ((types && types.success) || type) {
            next({...rest, result, type: types ? types.success : type});
          }
        } catch (error) {
          if (hooks && hooks.error) {
            hooks.error({ ...rest, error });
          }
          if (types && types.error) {
            next({ ...rest, error, type: types.error });
          }
        }
      }
    } else {
      next(action);
    }
  };
}
