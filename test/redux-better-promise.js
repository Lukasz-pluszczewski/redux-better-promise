import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(sinonChai);
chai.use(chaiAsPromised);

import createReduxPromise from '../src/index';

const initialState = {
  obj1: {
    field1: 'val1',
    field2: 'val2',
    field3: 'val3',
  },
  arr1: [
    'el1',
    'el2',
  ],
};

const create = middleware => {
  const store = {
    getState: sinon.stub().returns(initialState),
    dispatch: sinon.spy(),
  };
  const next = sinon.spy();

  const invoke = action => middleware(store)(next)(action);

  return { store, next, invoke };
};

const START = 'START';
const SUCCESS = 'SUCCESS';
const ERROR = 'ERROR';

const startCallback = sinon.spy();
const successCallback = sinon.spy();
const errorCallback = sinon.spy();
const promiseResolve = sinon.stub().resolves('result');
const promiseRejects = sinon.stub().rejects('error');
const funcOk = sinon.stub().returns('result');
const funcError = sinon.stub().throws({ message: 'error' });
const payload = 'payload';

describe('redux-better-promise', () => {
  beforeEach(() => {
    startCallback.reset();
    successCallback.reset();
    errorCallback.reset();
    promiseResolve.resetHistory();
    promiseRejects.resetHistory();
    funcOk.resetHistory();
    funcError.resetHistory();
  });

  describe('factory', () => {
    it('should create middleware', function(done) {
      const { store, next, invoke } = create(createReduxPromise());

      invoke({
        types: [START, SUCCESS, ERROR],
        callbacks: [startCallback, successCallback, errorCallback],
        promise: promiseResolve,
        payload,
      });

      setTimeout(() => {
        expect(promiseResolve).to.have.been.calledOnce;
        expect(promiseResolve).to.have.been.calledWithMatch({ getState: store.getState, dispatch: store.dispatch });
        expect(next).to.have.been.calledTwice;
        expect(next.getCall(0)).to.have.been.calledWithMatch({ type: START, payload });
        expect(next.getCall(1)).to.have.been.calledWithMatch({ type: SUCCESS, result: 'result', payload });
        expect(startCallback).to.have.been.calledOnce;
        expect(startCallback).to.have.been.calledWithMatch({ payload });
        expect(successCallback).to.have.been.calledOnce;
        expect(successCallback).to.have.been.calledWithMatch({ result: 'result', payload });
        expect(errorCallback).to.not.have.been.called;
        done();
      }, 0); // required to run after all synchronous code (and after previous async code, like promises inside the middleware)
    });
    it('should create middleware with changed field names', function(done) {
      const { store, next, invoke } = create(createReduxPromise(null, {
        promiseFieldName: 'promise1',
        functionFieldName: 'function1',
        typesFieldName: 'types1',
        callbacksFieldName: 'callbacks1',
        typesNames: {
          start: 'start1',
          success: 'success1',
          error: 'error1',
        },
        callbacksNames: {
          start: 'start1',
          success: 'success1',
          error: 'error1',
        },
      }));

      invoke({
        types1: { start1: START, success1: SUCCESS, error1: ERROR },
        callbacks1: { start1: startCallback, success1: successCallback, error1: errorCallback },
        promise1: promiseResolve,
        function1: funcOk,
        payload,
      });

      setTimeout(() => {
        expect(promiseResolve).to.have.been.calledOnce;
        expect(promiseResolve).to.have.been.calledWithMatch({ getState: store.getState, dispatch: store.dispatch });
        expect(funcOk).to.have.been.calledOnce;
        expect(funcOk).to.have.been.calledWithMatch({ getState: store.getState, dispatch: store.dispatch });
        expect(next).to.have.been.calledTwice;
        expect(next.getCall(0)).to.have.been.calledWithMatch({ type: START, payload });
        expect(next.getCall(1)).to.have.been.calledWithMatch({ type: SUCCESS, result: 'result', payload });
        expect(startCallback).to.have.been.calledOnce;
        expect(startCallback).to.have.been.calledWithMatch({ payload });
        expect(successCallback).to.have.been.calledOnce;
        expect(successCallback).to.have.been.calledWithMatch({ result: 'result', payload });
        expect(errorCallback).to.not.have.been.called;
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
        expect(promiseResolve).to.have.been.calledOnce;
        expect(promiseResolve).to.have.been.calledWithMatch({
          getState: store.getState,
          dispatch: store.dispatch,
          ...additionalData,
        });
        expect(funcOk).to.have.been.calledOnce;
        expect(funcOk).to.have.been.calledWithMatch({
          getState: store.getState,
          dispatch: store.dispatch,
          ...additionalData,
        });
        done();
      }, 0); // required to run after all synchronous code (and after previous async code, like promises inside the middleware)
    });
  });
  describe('middleware', () => {
    it('should pass ordinary action to the "next" function', () => {
      const { next, invoke } = create(createReduxPromise());
      const action = {
        type: 'type',
        payload: 'payload',
      };

      invoke(action);

      expect(next).to.be.calledOnce;
      expect(next).to.be.calledWith(action);
    });

    it('should dispatch given START action (as object field or array element) before "promise"', function(done) {
      const { next, invoke } = create(createReduxPromise());

      invoke({
        types: [START, SUCCESS, ERROR],
        callbacks: [startCallback, successCallback, errorCallback],
        promise: promiseResolve,
      });

      setTimeout(() => {
        expect(next).to.be.calledTwice;
        expect(next.getCall(0)).to.have.been.calledBefore(promiseResolve);
        expect(next.getCall(0)).to.have.been.calledWithMatch({ type: START });
        done();
      }, 0);
    });
    it('should dispatch given SUCCESS action (as object field or array element) after "promise" resolves');
    it('should dispatch given ERROR action (as object field or array element) after "promise" rejects');

    it('should not dispatch given SUCCESS action (as object field or array element) after "promise" rejects');
    it('should not dispatch given ERROR action (as object field or array element) after "promise" resolves');

    it('should dispatch given START action (as object field or array element) before calling "function"');
    it('should dispatch given SUCCESS action (as object field or array element) after calling "function"');
    it('should dispatch given ERROR action (as object field or array element) after "function" throws an error');

    it('should not dispatch given SUCCESS action (as object field or array element) after "function" throws an error');
    it('should not dispatch given ERROR action (as object field or array element) after calling "function"');

    it('should add any additional data from action definition to START, SUCCESS or ERROR actions');
    it('should add any additional data from action definition to START, SUCCESS or ERROR callbacks');

    it('should trigger START callback (as object field or array element) together with START action');
    it('should trigger SUCCESS callback (as object field or array element) together with SUCCESS action');
    it('should trigger ERROR callback (as object field or array element) together with ERROR action');

    it('should dispatch given ACTION (from type field) after "promise" resolves');
    it('should dispatch given ACTION (from type field) after calling "function"');

    it('should not dispatch given ACTION (from type field) after "promise" rejects');
    it('should not dispatch given ACTION (from type field) after "function" throws an error');

    it('should call "function" with correct parameters anyway if "promise" field is provided');

    it('should throw an error when "types" field has wrong type');
    it('should throw an error when "callbacks" field has wrong type');
    it('should throw an error when there is neither "type" nor "types" field in the action');
  });
});
