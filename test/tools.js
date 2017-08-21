import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(sinonChai);
chai.use(chaiAsPromised);

import createReduxPromise, { actionTypes } from '../src/index';

describe('redux-better-promise tools', () => {
  describe('chainReducers', () => {
    it('should chain reducers and pass state through all of them', function(done) {
      const action = { test: 2 };

      const reducer1 = (state, action) => {
        console.log('state1', state);
        return Object.assign({}, state, { oneValue: state.oneValue + action.test });
      };

      const reducer2 = (state, action) => {
        console.log('state2', state);
        return Object.assign({}, state, { twoValue: state.twoValue - action.test });
      };

      expect(chainReducers([reducer1, reducer2])({ oneValue: 0, twoValue: 0 }, action)).to.be.deep.equal({
        oneValue: 2,
        twoValue: 2,
      });
    });
  });
});
