import _ from 'lodash';

const defaultConfig = {
  promiseFieldName: 'promise',
  functionFieldName: 'function',
  typesFieldName: 'types',
  hooksFieldName: 'hooks',
  debounceFieldName: 'debounce',
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
  debounceNames: {
    start: 'start',
    success: 'success',
    error: 'error',
  },
  debounceFunctionWithFinish: true,
};

class StartActionType {}
class SuccessActionType {}
class ErrorActionType {}
class FinishActionType {}

export const actionTypes = {
  start: new StartActionType(),
  success: new SuccessActionType(),
  error: new ErrorActionType(),
  finish: new FinishActionType(),
};

const checkActionType = (actionType, type, params) => {
  if (actionType instanceof StartActionType) {
    return type === 'start';
  } else if (actionType instanceof SuccessActionType) {
    return type === 'success';
  } else if (actionType instanceof ErrorActionType) {
    return type === 'error';
  } else if (actionType instanceof FinishActionType) {
    return type === 'error' || type === 'success';
  } else if (_.isFunction(actionType)) {
    const { type, ...rest } = params;
    return actionType(type, rest);
  } else if (_.isRegExp(actionType)) {
    return actionType.test(params.type);
  } else if (typeof actionType === 'string') {
    return actionType === params.type;
  } else if (Array.isArray(actionType)) {
    let match = false;
    actionType.forEach(partType => {
      if (checkActionType(partType, type, params)) {
        match = true;
      }
    });
    return match;
  }
};

const checkActionTypes = (actionType, actionTypeExclude, type, params) => {
  if (actionTypeExclude) {
    const excluded = checkActionType(actionTypeExclude, type, params);
    if (!actionType) {
      return !excluded;
    }
    if (excluded) {
      return false;
    }
  }
  return checkActionType(actionType, type, params);
};

const createCallGlobalHooks = (hooks = []) => {
  const hookCaller = {
    call: (type, params) => {
      hooks.forEach(hook => {
        if (_.isFunction(hook)) {
          hook(params);
        } else if (checkActionTypes(hook.actionType, hook.actionTypeExclude, type, params)) {
          hook.hook(params);
        }
      });
    },
    start: params => {
      hookCaller.call('start', params);
    },
    success: params => {
      hookCaller.call('success', params);
    },
    error: params => {
      hookCaller.call('error', params);
    },
  };

  return hookCaller;
};

export default function createReduxPromiseMiddleware(additionalData, userConfig) {
  const config = _.merge({}, defaultConfig, userConfig);
  const callGlobalHooks = createCallGlobalHooks(config.hooks);
  const timeouts = {
    start: {},
    success: {},
    error: {},
  };
  const timeout = (type, actionType, debounce, cb) => {
    clearTimeout(timeouts[type][actionType]);
    if (debounce) {
      timeouts[type][actionType] = setTimeout(cb, debounce);
    } else {
      cb();
    }
  };

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
      // mapping hooks to standard object
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

      let debounce;
      // mapping debounce to standard object
      if (action[config.debounceFieldName]) {
        if (Array.isArray(action[config.debounceFieldName])) {
          debounce = {
            start: action[config.debounceFieldName][0],
            success: action[config.debounceFieldName][1],
            error: action[config.debounceFieldName][2],
          };
        } else if (_.isPlainObject(action[config.debounceFieldName])) {
          debounce = {
            start: action[config.debounceFieldName][config.debounceNames.start],
            success: action[config.debounceFieldName][config.debounceNames.success],
            error: action[config.debounceFieldName][config.debounceNames.error],
          };
        } else {
          throw new Error(`${config.debounceFieldName} must be an array or plain object`);
        }
      }

      const rest = _.omit(
        action,
        [config.promiseFieldName, config.functionFieldName, config.typesFieldName, config.hooksFieldName, 'type']
      );

      if (types && types.start) {
        timeout('start', types.start, debounce && debounce.start, () => {
          next({ type: types.start, ...rest });
          callGlobalHooks.start({ type: types.start, ...rest });
          if (hooks && hooks.start) {
            hooks.start(rest);
          }
        });
      } else if (hooks && hooks.start) { // if we don't have types.start we ignore debounce.start
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
            if ((types && types.success) || type) {
              timeout('success', types.success, debounce && debounce.success, () => {
                next({ type: types.success, ...rest });
                callGlobalHooks.success({ ...rest, result, type: types ? types.success : action.type });
                next({ ...rest, result, type: types ? types.success : action.type });
                if (hooks && hooks.success) {
                  hooks.success({ ...rest, result });
                }
              });
            } else if (hooks && hooks.success) {
              callGlobalHooks.success({ ...rest, result, type: types ? types.success : action.type });
              hooks.success({ ...rest, result });
            }
          },
          error => {
            if (types && types.error) {
              callGlobalHooks.error({ ...rest, error, type: types.error });
            }
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
          if ((types && types.success) || type) {
            timeout('success', types.success, debounce && debounce.success, () => {
              next({ type: types.success, ...rest });
              callGlobalHooks.success({ ...rest, result, type: types ? types.success : action.type });
              next({ ...rest, result, type: types ? types.success : action.type });
              if (hooks && hooks.success) {
                hooks.success({ ...rest, result });
              }
            });
          } else if (hooks && hooks.success) {
            callGlobalHooks.success({ ...rest, result, type: types ? types.success : action.type });
            hooks.success({ ...rest, result });
          }
        } catch (error) {
          if (hooks && hooks.error) {
            hooks.error({ ...rest, error });
          }
          if (types && types.error) {
            callGlobalHooks.error({ ...rest, error, type: types.error });
            next({ ...rest, error, type: types.error });
          }
        }
      }
    } else {
      next(action);
    }
  };
}
