import createReduxPromise, { actionTypes } from '../index';

const create = middleware => {
  const store = {
    getState: jest.fn(),
    dispatch: jest.fn(),
  };
  const next = jest.fn();

  const invoke = action => middleware(store)(next)(action);

  return { store, next, invoke };
};

const errorThrown = { message: 'error' };

const START = 'START';
const SUCCESS = 'SUCCESS';
const ERROR = 'ERROR';

const startHook = jest.fn();
const successHook = jest.fn();
const errorHook = jest.fn();
const promiseResolve = jest.fn(() => Promise.resolve('result'));
const promiseRejects = jest.fn(() => Promise.reject('error'));
const funcOk = jest.fn(() => 'result');
const funcError = jest.fn(() => {throw errorThrown});
const payload = 'payload';

describe('redux-better-promise', () => {
  beforeEach(() => {
    startHook.mockClear();
    successHook.mockClear();
    errorHook.mockClear();
    promiseResolve.mockClear();
    promiseRejects.mockClear();
    funcOk.mockClear();
    funcError.mockClear();
  });

  describe('factory', () => {
    /* =============== creating middleware =============== */
    it('should create middleware', function(done) {
      const { store, next, invoke } = create(createReduxPromise());

      invoke({
        types: [START, SUCCESS, ERROR],
        hooks: [startHook, successHook, errorHook],
        promise: promiseResolve,
        payload,
      });

      setTimeout(() => {

        expect(promiseResolve).toHaveBeenCalledTimes(1);
        expect(promiseResolve.mock.calls[0][0]).toMatchObject({ getState: store.getState, dispatch: store.dispatch });
        expect(next).toHaveBeenCalledTimes(2);
        expect(next.mock.calls[0][0]).toMatchObject({ type: START, payload });
        expect(next.mock.calls[1][0]).toMatchObject({ type: SUCCESS, result: 'result', payload });
        expect(startHook).toHaveBeenCalledTimes(1);
        expect(startHook.mock.calls[0][0]).toMatchObject({ payload });
        expect(successHook).toHaveBeenCalledTimes(1);
        expect(successHook.mock.calls[0][0]).toMatchObject({ result: 'result', payload });
        expect(errorHook).not.toHaveBeenCalled();
        done();
      }, 0); // required to run after all synchronous code (and after previous async code, like promises inside the middleware)
    });
    it('should create middleware with changed field names', function(done) {
      const { store, next, invoke } = create(createReduxPromise(null, {
        promiseFieldName: 'promise1',
        functionFieldName: 'function1',
        typesFieldName: 'types1',
        hooksFieldName: 'hooks1',
        typesNames: {
          start: 'start1',
          success: 'success1',
          error: 'error1',
        },
        hooksNames: {
          start: 'start1',
          success: 'success1',
          error: 'error1',
        },
      }));

      invoke({
        types1: { start1: START, success1: SUCCESS, error1: ERROR },
        hooks1: { start1: startHook, success1: successHook, error1: errorHook },
        promise1: promiseResolve,
        function1: funcOk,
        payload,
      });

      setTimeout(() => {
        expect(promiseResolve).toHaveBeenCalledTimes(1);
        expect(promiseResolve.mock.calls[0][0]).toMatchObject({ getState: store.getState, dispatch: store.dispatch });
        expect(funcOk).toHaveBeenCalledTimes(1);
        expect(funcOk.mock.calls[0][0]).toMatchObject({ getState: store.getState, dispatch: store.dispatch });
        expect(next).toHaveBeenCalledTimes(2);
        expect(next.mock.calls[0][0]).toMatchObject({ type: START, payload });
        expect(next.mock.calls[1][0]).toMatchObject({ type: SUCCESS, result: 'result', payload });
        expect(startHook).toHaveBeenCalledTimes(1);
        expect(startHook.mock.calls[0][0]).toMatchObject({ payload });
        expect(successHook).toHaveBeenCalledTimes(1);
        expect(successHook.mock.calls[0][0]).toMatchObject({ result: 'result', payload });
        expect(errorHook).not.toHaveBeenCalled();
        done();
      }, 0);
    });

    it('should add any additional data from middlewareFactory to START, SUCCESS or ERROR actions', function(done) {
      const additionalData = { additional: 'value' };
      const { store, invoke } = create(createReduxPromise(additionalData));

      invoke({
        type: SUCCESS,
        promise: promiseResolve,
        function: funcOk,
      });

      setTimeout(() => {
        expect(promiseResolve).toHaveBeenCalledTimes(1);
        expect(promiseResolve.mock.calls[0][0]).toMatchObject({
          getState: store.getState,
          dispatch: store.dispatch,
          ...additionalData,
        });
        expect(funcOk).toHaveBeenCalledTimes(1);
        expect(funcOk.mock.calls[0][0]).toMatchObject({
          getState: store.getState,
          dispatch: store.dispatch,
          ...additionalData,
        });
        done();
      }, 0); // required to run after all synchronous code (and after previous async code, like promises inside the middleware)
    });
  });
  describe('middleware', () => {
    /* =============== deciding if middleware should handle this action =============== */
    it('should pass ordinary action to the "next" function', () => {
      const { next, invoke } = create(createReduxPromise());
      const action = {
        type: 'type',
        payload: 'payload',
      };

      invoke(action);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(action);
    });

    /* =============== dispatching correct actions =============== */
    it('should dispatch given START action (as object field or array element) before "promise"', function(done) {
      const { next, invoke } = create(createReduxPromise());

      invoke({
        types: [START, null, null],
        promise: promiseResolve,
      });

      setTimeout(() => {
        expect(next).toHaveBeenCalledTimes(1);
        expect(promiseResolve).toHaveBeenCalledTimes(1);
        // expect(next).toHaveBeenCalledBefore(promiseResolve); // particular call should be checked but `expect(next.getCall(0))` does not work here :/
        expect(next.mock.calls[0][0]).toMatchObject({ type: START });
        done();
      }, 0);
    });
    it('should dispatch given SUCCESS action (as object field or array element) after "promise" resolves', function(done) {
      const { next, invoke } = create(createReduxPromise());

      invoke({
        types: [null, SUCCESS, null],
        promise: promiseResolve,
      });

      setTimeout(() => {
        expect(next).toHaveBeenCalledTimes(1);
        expect(promiseResolve).toHaveBeenCalledTimes(1);
        // expect(next).to.have.been.calledAfter(promiseResolve);
        expect(next.mock.calls[0][0]).toMatchObject({ type: SUCCESS, result: 'result' });
        done();
      }, 0);
    });
    it('should dispatch given ERROR action (as object field or array element) after "promise" rejects', function(done) {
      const { next, invoke } = create(createReduxPromise());

      invoke({
        types: [null, null, ERROR],
        promise: promiseRejects,
      });

      setTimeout(() => {
        expect(next).toHaveBeenCalledTimes(1);
        expect(promiseRejects).toHaveBeenCalledTimes(1);
        // expect(next).to.have.been.calledAfter(promiseRejects);
        expect(next.mock.calls[0][0]).toMatchObject({ type: ERROR, error: 'error' });
        done();
      }, 0);
    });

    it('should not dispatch given SUCCESS action (as object field or array element) after "promise" rejects', function(done) {
      const { next, invoke } = create(createReduxPromise());

      invoke({
        types: [START, SUCCESS, ERROR],
        promise: promiseRejects,
      });

      setTimeout(() => {
        expect(next).toHaveBeenCalledTimes(2);
        expect(promiseRejects).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[1][0]).not.toMatchObject({ type: SUCCESS, result: 'result' });
        done();
      }, 0);
    });
    it('should not dispatch given ERROR action (as object field or array element) after "promise" resolves', function(done) {
      const { next, invoke } = create(createReduxPromise());

      invoke({
        types: [START, SUCCESS, ERROR],
        promise: promiseResolve,
      });

      setTimeout(() => {
        expect(next).toHaveBeenCalledTimes(2);
        expect(promiseResolve).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[1][0]).not.toMatchObject({ type: ERROR, error: 'error' });
        done();
      }, 0);
    });

    it('should dispatch given START action (as object field or array element) before calling "function"', function(done) {
      const { next, invoke } = create(createReduxPromise());

      invoke({
        types: [START, null, null],
        function: funcOk,
      });

      setTimeout(() => {
        expect(next).toHaveBeenCalledTimes(1);
        expect(funcOk).toHaveBeenCalledTimes(1);
        // expect(next).toHaveBeenCalledBefore(funcOk); // particular call should be checked but `expect(next.getCall(0))` does not work here :/
        expect(next.mock.calls[0][0]).toMatchObject({ type: START });
        done();
      }, 0);
    });
    it('should dispatch given SUCCESS action (as object field or array element) after calling "function"', function(done) {
      const { next, invoke } = create(createReduxPromise());

      invoke({
        types: [null, SUCCESS, null],
        function: funcOk,
      });

      setTimeout(() => {
        expect(next).toHaveBeenCalledTimes(1);
        expect(funcOk).toHaveBeenCalledTimes(1);
        // expect(next).to.have.been.calledAfter(funcOk);
        expect(next.mock.calls[0][0]).toMatchObject({ type: SUCCESS, result: 'result' });
        done();
      }, 0);
    });
    it('should dispatch given ERROR action (as object field or array element) after "function" throws an error', function(done) {
      const { next, invoke } = create(createReduxPromise());

      invoke({
        types: [null, null, ERROR],
        function: funcError,
      });

      setTimeout(() => {
        expect(next).toHaveBeenCalledTimes(1);
        expect(funcError).toHaveBeenCalledTimes(1);
        // expect(next).to.have.been.calledAfter(funcError);
        expect(next.mock.calls[0][0]).toMatchObject({ type: ERROR, error: errorThrown });
        done();
      }, 0);
    });

    it('should not dispatch given SUCCESS action (as object field or array element) after "function" throws an error', function(done) {
      const { next, invoke } = create(createReduxPromise());

      invoke({
        types: [START, SUCCESS, ERROR],
        function: funcError,
      });

      setTimeout(() => {
        expect(next).toHaveBeenCalledTimes(2);
        expect(funcError).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0][0]).not.toMatchObject({ type: SUCCESS, result: 'result' });
        expect(next.mock.calls[1][0]).not.toMatchObject({ type: SUCCESS, result: 'result' });
        done();
      }, 0);
    });
    it('should not dispatch given ERROR action (as object field or array element) after calling "function"', function(done) {
      const { next, invoke } = create(createReduxPromise());

      invoke({
        types: [START, SUCCESS, ERROR],
        function: funcOk,
      });

      setTimeout(() => {
        expect(next).toHaveBeenCalledTimes(2);
        expect(funcOk).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0][0]).not.toMatchObject({ type: ERROR, error: 'error' });
        expect(next.mock.calls[1][0]).not.toMatchObject({ type: ERROR, error: 'error' });
        done();
      }, 0);
    });

    it('should add any additional data from action definition to START, SUCCESS or ERROR actions', function(done) {
      const { store, next, invoke } = create(createReduxPromise());

      invoke({
        types: [START, SUCCESS, null],
        promise: promiseResolve,
        payload,
        additionalField: 'additionalValue',
      });

      invoke({
        types: [null, null, ERROR],
        promise: promiseRejects,
        payload,
        additionalField: 'additionalValue',
      });

      setTimeout(() => {
        expect(next).toHaveBeenCalledTimes(3);
        expect(next.mock.calls[0][0]).toMatchObject({ type: START, payload, additionalField: 'additionalValue' });
        expect(next.mock.calls[1][0]).toMatchObject({ type: SUCCESS, result: 'result', payload, additionalField: 'additionalValue' });
        expect(next.mock.calls[2][0]).toMatchObject({ type: ERROR, error: 'error', payload, additionalField: 'additionalValue' });
        done();
      }, 0);
    });

    it('should dispatch given ACTION (from type field) after "promise" resolves', function(done) {
      const { store, next, invoke } = create(createReduxPromise());

      invoke({
        type: SUCCESS,
        promise: promiseResolve,
      });

      setTimeout(() => {
        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0][0]).toMatchObject({ type: SUCCESS, result: 'result' });
        done();
      }, 0);
    });
    it('should dispatch given ACTION (from type field) after calling "function"', function(done) {
      const { store, next, invoke } = create(createReduxPromise());

      invoke({
        type: SUCCESS,
        function: funcOk,
      });

      setTimeout(() => {
        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0][0]).toMatchObject({ type: SUCCESS, result: 'result' });
        done();
      }, 0);
    });

    it('should not dispatch given ACTION (from type field) after "promise" rejects', function(done) {
      const { next, invoke } = create(createReduxPromise());

      invoke({
        type: SUCCESS,
        promise: promiseRejects,
      });

      setTimeout(() => {
        expect(next).not.toHaveBeenCalled();
        done();
      }, 0);
    });
    it('should not dispatch given ACTION (from type field) after "function" throws an error', function(done) {
      const { next, invoke } = create(createReduxPromise());

      invoke({
        type: SUCCESS,
        function: funcError,
      });

      setTimeout(() => {
        expect(next).not.toHaveBeenCalled();
        done();
      }, 0);
    });

    it('should call "function" with correct parameters anyway if "promise" field is provided', function(done) {
      const { store, invoke } = create(createReduxPromise());

      invoke({
        types: [START, SUCCESS, ERROR],
        promise: promiseResolve,
        function: funcOk, // if a function throws an error in this situation it will not be caught!
      });

      setTimeout(() => {
        expect(funcOk).toHaveBeenCalledTimes(1);
        expect(funcOk.mock.calls[0][0]).toMatchObject({ getState: store.getState, dispatch: store.dispatch });
        done();
      }, 0);
    });

    /* =============== calling hooks =============== */
    it('should trigger START, SUCCESS and ERROR hooks', function(done) {
      const { next, invoke } = create(createReduxPromise());

      invoke({
        types: [START, SUCCESS, ERROR],
        hooks: [startHook, successHook, null],
        promise: promiseResolve,
        payload,
        additionalField: 'additionalValue',
      });

      invoke({
        types: [START, SUCCESS, ERROR],
        hooks: [null, null, errorHook],
        promise: promiseRejects,
      });

      setTimeout(() => {
        expect(startHook).toHaveBeenCalledTimes(1);
        expect(successHook).toHaveBeenCalledTimes(1);
        expect(errorHook).toHaveBeenCalledTimes(1);
        done();
      }, 0);
    });

    it('should add any additional data from action definition to START, SUCCESS or ERROR hooks', function(done) {
      const { next, invoke } = create(createReduxPromise());

      invoke({
        types: [START, SUCCESS, ERROR],
        hooks: [startHook, successHook, null],
        promise: promiseResolve,
        payload,
        additionalField: 'additionalValue',
      });

      invoke({
        types: [START, SUCCESS, ERROR],
        hooks: [null, null, errorHook],
        promise: promiseRejects,
        payload,
        additionalField: 'additionalValue',
      });

      setTimeout(() => {
        expect(startHook).toHaveBeenCalledTimes(1);
        expect(startHook.mock.calls[0][0]).toMatchObject({ payload, additionalField: 'additionalValue', });
        expect(successHook).toHaveBeenCalledTimes(1);
        expect(successHook.mock.calls[0][0]).toMatchObject({ result: 'result', payload, additionalField: 'additionalValue' });
        expect(errorHook).toHaveBeenCalledTimes(1);
        expect(errorHook.mock.calls[0][0]).toMatchObject({ error: 'error', payload, additionalField: 'additionalValue' });
        done();
      }, 0);
    });

    /* =============== global hooks =============== */
    it('should call a global hook', function(done) {
      const globalHook = jest.fn();
      const { invoke } = create(createReduxPromise(null, {
        hooks: [
          globalHook,
        ],
      }));

      invoke({
        types: [START, SUCCESS, ERROR],
        promise: promiseResolve,
        payload,
      });

      setTimeout(() => {
        expect(globalHook).toHaveBeenCalledTimes(2);
        expect(globalHook.mock.calls[0][0]).toMatchObject({ type: START, payload });
        expect(globalHook.mock.calls[1][0]).toMatchObject({ type: SUCCESS, result: 'result', payload });
        done();
      }, 0);
    });
    it('should call a global START hook', function(done) {
      const globalHook = jest.fn();
      const { store, invoke } = create(createReduxPromise(null, {
        hooks: [
          {
            actionType: actionTypes.start,
            hook: globalHook,
          },
        ],
      }));

      invoke({
        types: [START, SUCCESS, ERROR],
        promise: promiseResolve,
        payload,
      });

      setTimeout(() => {
        expect(globalHook).toHaveBeenCalledTimes(1);
        expect(globalHook.mock.calls[0][0]).toMatchObject({ type: START, payload });
        done();
      }, 0);
    });
    it('should call a global SUCCESS hook', function(done) {
      const globalHook = jest.fn();
      const { invoke } = create(createReduxPromise(null, {
        hooks: [
          {
            actionType: actionTypes.success,
            hook: globalHook,
          },
        ],
      }));

      invoke({
        types: [START, SUCCESS, ERROR],
        promise: promiseResolve,
        payload,
      });

      setTimeout(() => {
        expect(globalHook).toHaveBeenCalledTimes(1);
        expect(globalHook.mock.calls[0][0]).toMatchObject({ type: SUCCESS, result: 'result', payload });
        done();
      }, 0);
    });
    it('should call a global ERROR', function(done) {
      const globalHook = jest.fn();
      const { invoke } = create(createReduxPromise(null, {
        hooks: [
          {
            actionType: actionTypes.error,
            hook: globalHook,
          },
        ],
      }));

      invoke({
        types: [START, SUCCESS, ERROR],
        promise: promiseRejects,
        payload,
      });

      setTimeout(() => {
        expect(globalHook).toHaveBeenCalledTimes(1);
        expect(globalHook.mock.calls[0][0]).toMatchObject({ type: ERROR, error: 'error', payload });
        done();
      }, 0);
    });
    it('should call a global hook on finish actions - SUCCESS and ERROR', function(done) {
      const globalHook = jest.fn();
      const { invoke } = create(createReduxPromise(null, {
        hooks: [
          {
            actionType: actionTypes.finish,
            hook: globalHook,
          },
        ],
      }));

      invoke({
        types: [START, SUCCESS, ERROR],
        promise: promiseResolve,
        payload,
      });

      invoke({
        types: [START, SUCCESS, ERROR],
        promise: promiseRejects,
        payload,
      });

      setTimeout(() => {
        expect(globalHook).toHaveBeenCalledTimes(2);
        expect(globalHook.mock.calls[0][0]).toMatchObject({ type: SUCCESS, result: 'result', payload });
        expect(globalHook.mock.calls[1][0]).toMatchObject({ type: ERROR, error: 'error', payload });
        done();
      }, 0);
    });

    it('should call a global hook by action type', function(done) {
      const globalHook = jest.fn();
      const { invoke } = create(createReduxPromise(null, {
        hooks: [
          {
            actionType: SUCCESS,
            hook: globalHook,
          },
        ],
      }));

      invoke({
        types: [START, SUCCESS, ERROR],
        promise: promiseResolve,
        payload,
      });

      setTimeout(() => {
        expect(globalHook).toHaveBeenCalledTimes(1);
        expect(globalHook.mock.calls[0][0]).toMatchObject({ type: SUCCESS, result: 'result', payload });
        expect(globalHook.mock.calls[0][0]).not.toMatchObject({ type: START, payload });
        done();
      }, 0);
    });
    it('should call a global hook by array of action types', function(done) {
      const globalHook = jest.fn();
      const { invoke } = create(createReduxPromise(null, {
        hooks: [
          {
            actionType: [ START, SUCCESS ],
            hook: globalHook,
          },
        ],
      }));

      invoke({
        types: [START, SUCCESS, ERROR],
        promise: promiseResolve,
        payload,
      });

      invoke({
        types: [null, SUCCESS, ERROR],
        promise: promiseRejects,
        payload,
      });

      setTimeout(() => {
        expect(globalHook).toHaveBeenCalledTimes(2);
        expect(globalHook.mock.calls[0][0]).toMatchObject({ type: START, payload });
        expect(globalHook.mock.calls[1][0]).toMatchObject({ type: SUCCESS, result: 'result', payload });
        expect(globalHook.mock.calls[0][0]).not.toMatchObject({ type: ERROR, error: 'error', payload });
        expect(globalHook.mock.calls[1][0]).not.toMatchObject({ type: ERROR, error: 'error', payload });
        done();
      }, 0);
    });
    it('should call a global hook by regex', function(done) {
      const globalHook = jest.fn();
      const { invoke } = create(createReduxPromise(null, {
        hooks: [
          {
            actionType: /SUCCESS/,
            hook: globalHook,
          },
        ],
      }));

      invoke({
        types: [START, SUCCESS, ERROR],
        promise: promiseResolve,
        payload,
      });

      setTimeout(() => {
        expect(globalHook).toHaveBeenCalledTimes(1);
        expect(globalHook.mock.calls[0][0]).toMatchObject({ type: SUCCESS, result: 'result', payload });
        expect(globalHook.mock.calls[0][0]).not.toMatchObject({ type: START, payload });
        done();
      }, 0);
    });
    it('should call a global hook by filter function', function(done) {
      const globalHook = jest.fn();
      const { invoke } = create(createReduxPromise(null, {
        hooks: [
          {
            actionType: type => type !== SUCCESS,
            hook: globalHook,
          },
        ],
      }));

      invoke({
        types: [START, SUCCESS, ERROR],
        promise: promiseResolve,
        payload,
      });

      setTimeout(() => {
        expect(globalHook).toHaveBeenCalledTimes(1);
        expect(globalHook.mock.calls[0][0]).toMatchObject({ type: START, payload });
        expect(globalHook.mock.calls[0][0]).not.toMatchObject({ type: SUCCESS, result: 'result', payload });
        done();
      }, 0);
    });

    it('should filter out action based on exclude field in hook', function(done) {
      const globalHook = jest.fn();
      const { invoke } = create(createReduxPromise(null, {
        hooks: [
          {
            actionType: [START, SUCCESS],
            actionTypeExclude: [START],
            hook: globalHook,
          },
        ],
      }));

      invoke({
        types: [START, SUCCESS, ERROR],
        promise: promiseResolve,
        payload,
      });

      setTimeout(() => {
        expect(globalHook).toHaveBeenCalledTimes(1);
        expect(globalHook.mock.calls[0][0]).toMatchObject({ type: SUCCESS, result: 'result', payload });
        expect(globalHook.mock.calls[0][0]).not.toMatchObject({ type: START, payload });
        done();
      }, 0);
    });

    /* =============== validation =============== */
    it('should throw an error when "types" field has wrong type', () => {
      const { invoke } = create(createReduxPromise());

      expect( () => invoke({
        types: () => 'Hello! I have wrong type :)',
        promise: promiseResolve,
      }) ).toThrowError(Error);
    });
    it('should throw an error when "hooks" field has wrong type', () => {
      const { invoke } = create(createReduxPromise());

      expect( () => invoke({
        types: [START, SUCCESS, ERROR],
        hooks: () => 'Hello! I have wrong type :)',
        promise: promiseResolve,
      }) ).toThrowError(Error);
    });
    it('should throw an error when there is neither "type" nor "types" field in the action', () => {
      const { invoke } = create(createReduxPromise());

      expect( () => invoke({
        promise: promiseResolve,
      }) ).toThrowError(Error);
    });
  });
});
