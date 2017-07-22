import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(sinonChai);
chai.use(chaiAsPromised);

import createReduxPromise from '../src/index';

const create = middleware => {
  const store = {
    getState: sinon.stub(),
    dispatch: sinon.spy(),
  };
  const next = sinon.spy();

  const invoke = action => middleware(store)(next)(action);

  return { store, next, invoke };
};

const errorThrown = { message: 'error' };

const START = 'START';
const SUCCESS = 'SUCCESS';
const ERROR = 'ERROR';

const startCallback = sinon.spy();
const successCallback = sinon.spy();
const errorCallback = sinon.spy();
const promiseResolve = sinon.stub().resolves('result');
const promiseRejects = sinon.stub().returns(Promise.reject('error'));
const funcOk = sinon.stub().returns('result');
const funcError = sinon.stub().throws(errorThrown);
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
        types: [START, null, null],
        promise: promiseResolve,
      });

      setTimeout(() => {
        expect(next).to.have.been.calledOnce;
        expect(promiseResolve).to.have.been.calledOnce;
        expect(next).to.have.been.calledBefore(promiseResolve); // particular call should be checked but `expect(next.getCall(0))` does not work here :/
        expect(next.getCall(0)).to.have.been.calledWithMatch({ type: START });
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
        expect(next).to.have.been.calledOnce;
        expect(promiseResolve).to.have.been.calledOnce;
        expect(next).to.have.been.calledAfter(promiseResolve);
        expect(next).to.have.been.calledWithMatch({ type: SUCCESS, result: 'result' });
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
        expect(next).to.have.been.calledOnce;
        expect(promiseRejects).to.have.been.calledOnce;
        expect(next).to.have.been.calledAfter(promiseRejects);
        expect(next).to.have.been.calledWithMatch({ type: ERROR, error: 'error' });
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
        expect(next).to.have.been.calledTwice;
        expect(promiseRejects).to.have.been.calledOnce;
        expect(next.getCall(1)).to.not.have.been.calledWithMatch({ type: SUCCESS, result: 'result' });
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
        expect(next).to.have.been.calledTwice;
        expect(promiseResolve).to.have.been.calledOnce;
        expect(next.getCall(1)).to.not.have.been.calledWithMatch({ type: ERROR, error: 'error' });
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
        expect(next).to.have.been.calledOnce;
        expect(funcOk).to.have.been.calledOnce;
        expect(next).to.have.been.calledBefore(funcOk); // particular call should be checked but `expect(next.getCall(0))` does not work here :/
        expect(next).to.have.been.calledWithMatch({ type: START });
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
        expect(next).to.have.been.calledOnce;
        expect(funcOk).to.have.been.calledOnce;
        expect(next).to.have.been.calledAfter(funcOk);
        expect(next).to.have.been.calledWithMatch({ type: SUCCESS, result: 'result' });
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
        expect(next).to.have.been.calledOnce;
        expect(funcError).to.have.been.calledOnce;
        expect(next).to.have.been.calledAfter(funcError);
        expect(next).to.have.been.calledWithMatch({ type: ERROR, error: errorThrown });
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
        expect(next).to.be.calledTwice;
        expect(funcError).to.have.been.calledOnce;
        expect(next).to.not.have.been.calledWithMatch({ type: SUCCESS, result: 'result' });
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
        expect(next).to.be.calledTwice;
        expect(funcOk).to.have.been.calledOnce;
        expect(next).to.not.have.been.calledWithMatch({ type: ERROR, error: 'error' });
        done();
      }, 0);
    });

    it('should trigger START, SUCCESS and ERROR callbacks', function(done) {
      const { next, invoke } = create(createReduxPromise());

      invoke({
        types: [START, SUCCESS, ERROR],
        callbacks: [startCallback, successCallback, null],
        promise: promiseResolve,
        payload,
        additionalField: 'additionalValue',
      });

      invoke({
        types: [START, SUCCESS, ERROR],
        callbacks: [null, null, errorCallback],
        promise: promiseRejects,
      });

      setTimeout(() => {
        expect(startCallback).to.have.been.calledOnce;
        expect(successCallback).to.have.been.calledOnce;
        expect(errorCallback).to.have.been.calledOnce;
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
        expect(next).to.have.been.calledThrice;
        expect(next).to.have.been.calledWithMatch({ type: START, payload, additionalField: 'additionalValue' });
        expect(next).to.have.been.calledWithMatch({ type: SUCCESS, result: 'result', payload, additionalField: 'additionalValue' });
        expect(next).to.have.been.calledWithMatch({ type: ERROR, error: 'error', payload, additionalField: 'additionalValue' });
        done();
      }, 0);
    });
    it('should add any additional data from action definition to START, SUCCESS or ERROR callbacks', function(done) {
      const { next, invoke } = create(createReduxPromise());

      invoke({
        types: [START, SUCCESS, ERROR],
        callbacks: [startCallback, successCallback, null],
        promise: promiseResolve,
        payload,
        additionalField: 'additionalValue',
      });

      invoke({
        types: [START, SUCCESS, ERROR],
        callbacks: [null, null, errorCallback],
        promise: promiseRejects,
        payload,
        additionalField: 'additionalValue',
      });

      setTimeout(() => {
        expect(startCallback).to.have.been.calledOnce;
        expect(startCallback).to.have.been.calledWithMatch({ payload, additionalField: 'additionalValue', });
        expect(successCallback).to.have.been.calledOnce;
        expect(successCallback).to.have.been.calledWithMatch({ result: 'result', payload, additionalField: 'additionalValue' });
        expect(errorCallback).to.have.been.calledOnce;
        expect(errorCallback).to.have.been.calledWithMatch({ error: 'error', payload, additionalField: 'additionalValue' });
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
        expect(next).to.have.been.calledOnce;
        expect(next).to.have.been.calledWithMatch({ type: SUCCESS, result: 'result' });
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
        expect(next).to.have.been.calledOnce;
        expect(next).to.have.been.calledWithMatch({ type: SUCCESS, result: 'result' });
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
        expect(next).to.not.have.been.called;
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
        expect(next).to.not.have.been.called;
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
        expect(funcOk).to.have.been.calledOnce;
        expect(funcOk).to.have.been.calledWithMatch({ getState: store.getState, dispatch: store.dispatch });
        done();
      }, 0);
    });

    it('should throw an error when "types" field has wrong type', () => {
      const { invoke } = create(createReduxPromise());

      expect( () => invoke({
        types: () => 'Hello! I have wrong type :)',
        promise: promiseResolve,
      }) ).to.throw(Error);
    });
    it('should throw an error when "callbacks" field has wrong type', () => {
      const { invoke } = create(createReduxPromise());

      expect( () => invoke({
        types: [START, SUCCESS, ERROR],
        callbacks: () => 'Hello! I have wrong type :)',
        promise: promiseResolve,
      }) ).to.throw(Error);
    });
    it('should throw an error when there is neither "type" nor "types" field in the action', () => {
      const { invoke } = create(createReduxPromise());

      expect( () => invoke({
        promise: promiseResolve,
      }) ).to.throw(Error);
    });
  });
});
