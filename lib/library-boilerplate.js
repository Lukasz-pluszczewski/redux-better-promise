(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('lodash')) :
	typeof define === 'function' && define.amd ? define(['exports', 'lodash'], factory) :
	(factory((global['redux-better-promise'] = global['redux-better-promise'] || {}),global._));
}(this, (function (exports,_) { 'use strict';

_ = 'default' in _ ? _['default'] : _;

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};









var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};













var objectWithoutProperties = function (obj, keys) {
  var target = {};

  for (var i in obj) {
    if (keys.indexOf(i) >= 0) continue;
    if (!Object.prototype.hasOwnProperty.call(obj, i)) continue;
    target[i] = obj[i];
  }

  return target;
};

var defaultConfig = {
  promiseFieldName: 'promise',
  functionFieldName: 'function',
  typesFieldName: 'types',
  hooksFieldName: 'hooks',
  typesNames: {
    start: 'start',
    success: 'success',
    error: 'error'
  },
  hooksNames: {
    start: 'start',
    success: 'success',
    error: 'error'
  }
};

var StartActionType = function StartActionType() {
  classCallCheck(this, StartActionType);
};

var SuccessActionType = function SuccessActionType() {
  classCallCheck(this, SuccessActionType);
};

var ErrorActionType = function ErrorActionType() {
  classCallCheck(this, ErrorActionType);
};

var FinishActionType = function FinishActionType() {
  classCallCheck(this, FinishActionType);
};

var actionTypes = {
  start: new StartActionType(),
  success: new SuccessActionType(),
  error: new ErrorActionType(),
  finish: new FinishActionType()
};

var checkActionType = function checkActionType(actionType, type, params) {
  if (actionType instanceof StartActionType) {
    return type === 'start';
  } else if (actionType instanceof SuccessActionType) {
    return type === 'success';
  } else if (actionType instanceof ErrorActionType) {
    return type === 'error';
  } else if (actionType instanceof FinishActionType) {
    return type === 'error' || type === 'success';
  } else if (_.isFunction(actionType)) {
    var _type = params.type,
        rest = objectWithoutProperties(params, ['type']);

    return actionType(_type, rest);
  } else if (_.isRegExp(actionType)) {
    return actionType.test(params.type);
  } else if (typeof actionType === 'string') {
    return actionType === params.type;
  } else if (Array.isArray(actionType)) {
    var match = false;
    actionType.forEach(function (partType) {
      if (checkActionType(partType, type, params)) {
        match = true;
      }
    });
    return match;
  }
};

var checkActionTypes = function checkActionTypes(actionType, actionTypeExclude, type, params) {
  if (actionTypeExclude) {
    var excluded = checkActionType(actionTypeExclude, type, params);
    if (!actionType) {
      return !excluded;
    }
    if (excluded) {
      return false;
    }
  }
  return checkActionType(actionType, type, params);
};

var createCallGlobalHooks = function createCallGlobalHooks() {
  var hooks = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

  var hookCaller = {
    call: function call(type, params) {
      hooks.forEach(function (hook) {
        if (_.isFunction(hook)) {
          hook(params);
        } else if (checkActionTypes(hook.actionType, hook.actionTypeExclude, type, params)) {
          hook.hook(params);
        }
      });
    },
    start: function start(params) {
      hookCaller.call('start', params);
    },
    success: function success(params) {
      hookCaller.call('success', params);
    },
    error: function error(params) {
      hookCaller.call('error', params);
    }
  };

  return hookCaller;
};

function createReduxPromiseMiddleware(additionalData, userConfig) {
  var config = _.merge({}, defaultConfig, userConfig);
  var callGlobalHooks = createCallGlobalHooks(config.hooks);

  return function (_ref) {
    var getState = _ref.getState,
        dispatch = _ref.dispatch;
    return function (next) {
      return function (action) {
        // checking if middleware can handle this kind of action
        if (action[config.promiseFieldName] || action[config.functionFieldName]) {
          // getting fields from action object according to config
          var promise = action[config.promiseFieldName];

          var func = action[config.functionFieldName];

          var type = action.type;

          var types = void 0;
          // mapping types to standard object
          if (action[config.typesFieldName]) {
            if (Array.isArray(action[config.typesFieldName])) {
              types = {
                start: action[config.typesFieldName][0],
                success: action[config.typesFieldName][1],
                error: action[config.typesFieldName][2]
              };
            } else if (_.isPlainObject(action[config.typesFieldName])) {
              types = {
                start: action[config.typesFieldName][config.typesNames.start],
                success: action[config.typesFieldName][config.typesNames.success],
                error: action[config.typesFieldName][config.typesNames.error]
              };
            } else {
              throw new Error(config.typesFieldName + ' must be an array or plain object');
            }
          }

          // I'm not sure if it should be an error
          if (!type && !types) {
            throw new Error('You must provide type or types field');
          }

          var hooks = void 0;
          if (action[config.hooksFieldName]) {
            if (Array.isArray(action[config.hooksFieldName])) {
              hooks = {
                start: action[config.hooksFieldName][0],
                success: action[config.hooksFieldName][1],
                error: action[config.hooksFieldName][2]
              };
            } else if (_.isPlainObject(action[config.hooksFieldName])) {
              hooks = {
                start: action[config.hooksFieldName][config.hooksNames.start],
                success: action[config.hooksFieldName][config.hooksNames.success],
                error: action[config.hooksFieldName][config.hooksNames.error]
              };
            } else {
              throw new Error(config.hooksFieldName + ' must be an array or plain object');
            }
          }

          var rest = _.omit(action, [config.promiseFieldName, config.functionFieldName, config.typesFieldName, config.hooksFieldName, 'type']);

          if (types && types.start) {
            next(_extends({ type: types.start }, rest));
            callGlobalHooks.start(_extends({ type: types.start }, rest));
          }
          if (hooks && hooks.start) {
            hooks.start(rest);
          }

          if (promise) {
            if (typeof promise !== 'function') {
              throw new Error(config.promiseFieldName + ' must be a function returning promise');
            }
            if (func) {
              if (typeof func !== 'function') {
                throw new Error(config.functionFieldName + ' must be a function');
              }
              // if we have both promise and function we call that function anyway
              func(_extends({ getState: getState, dispatch: dispatch }, additionalData));
            }
            return promise(_extends({ getState: getState, dispatch: dispatch }, additionalData)).then(function (result) {
              if (types && types.success || type) {
                callGlobalHooks.success(_extends({}, rest, { result: result, type: types ? types.success : action.type }));
              }
              if (hooks && hooks.success) {
                hooks.success(_extends({}, rest, { result: result }));
              }
              return types && types.success || type ? next(_extends({}, rest, { result: result, type: types ? types.success : action.type })) : null;
            }, function (error) {
              if (types && types.error) {
                callGlobalHooks.error(_extends({}, rest, { error: error, type: types.error }));
              }
              if (hooks && hooks.error) {
                hooks.error(_extends({}, rest, { error: error }));
              }
              return types && types.error ? next(_extends({}, rest, { error: error, type: types.error })) : null;
            });
          } else {
            if (typeof func !== 'function') {
              throw new Error(config.functionFieldName + ' must be a function');
            }
            var result = void 0;
            try {
              result = func(_extends({ getState: getState, dispatch: dispatch }, additionalData));
              // now errors thrown in success hook and next() function will be caught as well. This is unexpected behaviour and should be changed in the future.
              callGlobalHooks.success(_extends({}, rest, { result: result, type: types ? types.success : type }));
              if (hooks && hooks.success) {
                hooks.success(_extends({}, rest, { result: result }));
              }
              if (types && types.success || type) {
                next(_extends({}, rest, { result: result, type: types ? types.success : type }));
              }
            } catch (error) {
              if (hooks && hooks.error) {
                hooks.error(_extends({}, rest, { error: error }));
              }
              if (types && types.error) {
                callGlobalHooks.error(_extends({}, rest, { error: error, type: types.error }));
                next(_extends({}, rest, { error: error, type: types.error }));
              }
            }
          }
        } else {
          next(action);
        }
      };
    };
  };
}

exports.actionTypes = actionTypes;
exports['default'] = createReduxPromiseMiddleware;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=library-boilerplate.js.map
