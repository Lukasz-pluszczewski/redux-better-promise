export const chainReducers = reducers => (state, action) => {
  return reducers.reduce((accuState, reducer) => reducer(accuState, action), state);
};
