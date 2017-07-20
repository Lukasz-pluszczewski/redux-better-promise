(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('lodash')) :
	typeof define === 'function' && define.amd ? define(['exports', 'lodash'], factory) :
	(factory((global['redux-better-promise'] = global['redux-better-promise'] || {}),global._));
}(this, (function (exports,_) { 'use strict';

_ = 'default' in _ ? _['default'] : _;

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

var defaultConfig = {
  promiseFieldName: 'promise',
  functionFieldName: 'function',
  typesFieldName: 'types',
  callbacksFieldName: 'callbacks',
  typesNames: {
    start: 'start',
    success: 'success',
    error: 'error'
  },
  callbacksNames: {
    start: 'start',
    success: 'success',
    error: 'error'
  }
};

function createReduxPromiseMiddleware(additionalData, userConfig) {
  var config = _.merge({}, defaultConfig, userConfig);

  return function (_ref) {
    var getState = _ref.getState,
        dispatch = _ref.dispatch;
    return function (next) {
      return function (action) {
        if (action.promise || action.function) {
          var promise = action[config.promiseFieldName];

          var func = action[config.functionFieldName];

          var type = action.type;

          var types = void 0;
          if (action[config.typesFieldName]) {
            if (Array.isArray(action[config.typesFieldName])) {
              types = {
                start: action[config.typesFieldName][0],
                success: action[config.typesFieldName][1],
                error: action[config.typesFieldName][2]
              };
            } else {
              types = {
                start: action[config.typesFieldName][config.typesNames.start],
                success: action[config.typesFieldName][config.typesNames.success],
                error: action[config.typesFieldName][config.typesNames.error]
              };
            }
          }

          var callbacks = void 0;
          if (action[config.callbacksFieldName]) {
            if (Array.isArray(action[config.callbacksFieldName])) {
              callbacks = {
                start: action[config.callbacksFieldName][0],
                success: action[config.callbacksFieldName][1],
                error: action[config.callbacksFieldName][2]
              };
            } else {
              callbacks = {
                start: action[config.callbacksFieldName][config.callbacksNames.start],
                success: action[config.callbacksFieldName][config.callbacksNames.success],
                error: action[config.callbacksFieldName][config.callbacksNames.error]
              };
            }
          }

          var rest = _.omit(action, [config.promiseFieldName, config.functionFieldName, config.typesFieldName, config.callbacksFieldName, 'type']);

          if (types) {
            next(_extends({ type: types.start }, rest));
          }
          if (callbacks && callbacks.start) {
            callbacks.start(rest);
          }

          if (promise) {
            if (func) {
              // if we have both promise and function we call that function anyway
              func(_extends({ getState: getState, dispatch: dispatch }, additionalData));
            }
            return promise(_extends({ getState: getState, dispatch: dispatch }, additionalData)).then(function (result) {
              if (callbacks && callbacks.success) {
                callbacks.success(_extends({}, rest, { result: result }));
              }
              return next(_extends({}, rest, { result: result, type: types ? types.success : action.type }));
            }, function (error) {
              if (callbacks && callbacks.error) {
                callbacks.error(_extends({}, rest, { error: error }));
              }
              return types ? next(_extends({}, rest, { error: error, type: types.error })) : null;
            });
          } else {
            var result = void 0;
            try {
              result = func(_extends({ getState: getState, dispatch: dispatch }, additionalData));
              if (callbacks && callbacks.success) {
                callbacks.success(_extends({}, rest, { result: result }));
              }
              next(_extends({}, rest, { result: result, type: types ? types.success : type }));
            } catch (error) {
              if (callbacks && callbacks.error) {
                callbacks.error(_extends({}, rest, { error: error }));
              }
              if (types) {
                next(_extends({}, rest, { error: error, type: types.error }));
              }
            }
          }
        }
        next(action);
      };
    };
  };
}

exports['default'] = createReduxPromiseMiddleware;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=library-boilerplate.js.map
