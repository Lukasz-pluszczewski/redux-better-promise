# redux-better-promise
> Simple and powerful redux middleware that supports async side-effects (and much more)

Redux middleware that will allow you to:
* Create actions with side-effects that will dispatch different actions on different side-effect results
* Create actions with both async and sync side-effects
* Add hooks (callbacks) to you async actions so that you can treat dispatched actions like events and just react to them (e.g. show notification without checking if state changed)

## FAQ
##### Why this exists?
There are some good middlewares that help manage side-effects in redux actions but they generally allow you to create actions creators that are vastly different then standard ones. I decided to make middleware with which you will be able to make action creators that will look consistent with the rest of the application and have all the other middlewares' power combined!

#### Are there good alternatives? 
Yes and you should definitely check them out:
* [redux-thunk](https://github.com/gaearon/redux-thunk)
* [redux-saga](https://github.com/redux-saga/redux-saga)

#### I found a bug! What should I do?
There are at least 3 options:
1. Add an issue, write test(s) for bug you found, write fix that will make your test(s) pass, submit pull request
2. Add an issue, write test(s) for bug you found, submit pull request with you test(s)
3. Add an issue

All contributions are appreciated!

## Getting started
##### Install library
`npm i redux-better-promise --save`

##### Apply middleware to redux store
```javascript
import { createStore, applyMiddleware } from 'redux';
import createReduxPromise from 'redux-better-promise';

const store = createStore(
  rootReducer,
  applyMiddleware(createReduxPromise())
);
```

## Usage
##### Simple async action creator
```javascript
function getAsyncAction(param) {
  return {
    types: ['ACTION_STARTED', 'ACTION_SUCCEEDED', 'ACTION_ERROR'],
    promise: ({ getState, dispatch }) => Promise.resolve({ some: 'data' }),
  };
}
```

Dispatching action above will lead to dispatching following actions:
```javascript
// before calling `promise` function
{
  type: 'ACTION_STARTED',
}

// after promise is resolved
{
  type: 'ACTION_SUCCEEDED',
  result: { some: 'data' },
}
```

If promise returned by `promise` function is rejected with `{ some: 'error' }` second action will look like this
```javascript
// after promise is rejected
{
  type: 'ACTION_ERROR',
  error: { some: 'error' },
}
```

#### Simple sync action with function
```javascript
function getSyncAction(param) {
  return {
    types: ['ACTION_STARTED', 'ACTION_SUCCEEDED', 'ACTION_ERROR'],
    function: ({ getState, dispatch }) => ({ some: 'data' }),
  };
}
```

Dispatching action above will result in dispatching following actions:
```javascript
// before `function` function is called
{
  type: 'ACTION_STARTED',
}

// after `function` returns result
{
  type: 'ACTION_SUCCEEDED',
  result: { some: 'data' },
}
```

If `function` throws a `{ some: 'error' }` second action will look like this
```javascript
// after throwing an error
{
  type: 'ACTION_ERROR',
  error: { some: 'error' },
}
```

#### Adding hooks to actions
Hooks are just functions triggered when particular action is going to be dispatched. They cannot modify dispatching process in any way but can be used to trigger custom actions on some actions (like showing notification when async actions fails)

```javascript
function getAsyncAction() {
  return {
    types: ['ACTION_STARTED', 'ACTION_SUCCEEDED', 'ACTION_ERROR'],
    promise: ({ getState, dispatch }) => Promise.resolve({ some: 'data' }),
    hooks: [() => notification('I started'), ({ result }) => notification('I finished successfully', result), () => notification('I failed :(')],
  };
}
```

When dispatching action above `notification('I started')` will be triggered immediately and `notification('I finished successfully')` will be triggered after promise resolves.
`notification('I failed')` will not be triggered unless promise fails

#### Adding additional data to actions
Start, success and error actions can contain additional data e.g. payload

```javascript
function getAsyncAction() {
  return {
    types: ['ACTION_STARTED', 'ACTION_SUCCEEDED', 'ACTION_ERROR'],
    promise: ({ getState, dispatch }) => Promise.resolve({ some: 'data' }),
    payload: 'some payload',
    whatever: 'some other data',
  };
}
```

Here resulting actions would look like this:
```javascript
// before calling `promise` function
{
  type: 'ACTION_STARTED',
  payload: 'some payload',
  whatever: 'some other data',
}

// after promise is resolved
{
  type: 'ACTION_SUCCEEDED',
  result: { some: 'data' },
  payload: 'some payload',
  whatever: 'some other data',
}
```

#### Passing lists as objects
`types` and `hooks` fields can be objects
```javascript
function getAsyncAction() {
  return {
    types: { start: 'ACTION_STARTED', success: 'ACTION_SUCCEEDED', error: 'ACTION_ERROR' },
    promise: ({ getState, dispatch }) => Promise.resolve({ some: 'data' }),
    hooks: { start: () => notification('I started'), success: ({ result }) => notification('I finished successfully', result), error: () => notification('I failed :(') },
  };
}
```

#### Adding custom parameters that are going to passed to `promise` or `function`
By default `promise` and `function` functions will get `{ getState, dispatch }` object as the first parameter. You can add any additional fields to that object:
```javascript
const store = createStore(
  rootReducer,
  applyMiddleware(createReduxPromise({ myCustomParam: 'data', anotherData: 'value' }))
);
```

Now actions can look like this:
```javascript
function getAsyncAction() {
  return {
    types: ['ACTION_STARTED', 'ACTION_SUCCEEDED', 'ACTION_ERROR'],
    promise: ({ getState, dispatch, myCustomParam: 'data', anotherData: 'value' }) => Promise.resolve({ some: 'data' }),
  };
}
```
or
```javascript
function getSyncAction() {
  return {
    types: ['ACTION_STARTED', 'ACTION_SUCCEEDED', 'ACTION_ERROR'],
    function: ({ getState, dispatch, myCustomParam: 'data', anotherData: 'value' }) => ({ some: 'data' }),
  };
}
```

#### Omitting some action types or hooks
You don't have to provide all action types or hooks
```javascript
function getAsyncAction() {
  return {
    types: [null, null, 'ACTION_ERROR'],
    promise: ({ getState, dispatch }) => Promise.reject({ some: 'error' }),
    hooks: [() => notification('I started'), null, null],
  };
}
```

Now the only action dispatched will be 'ACTION_ERROR' (of course only if promise returned by `promise` function will be rejected) and only before calling `promise` function `notification('I started')` hook is going to be called

#### Providing only one action type
Instead of providing action with `types` field you can pass only one action type in `type` field:
```javascript
function getAsyncAction() {
  return {
    type: 'ACTION_SUCCESS',
    promise: ({ getState, dispatch }) => Promise.reject({ some: 'error' }),
  };
}
```

Now 'ACTION_SUCCESS' action would be triggered only if `promise` action resolves. So in this case no action is going to be dispatched.

#### Registering global hooks
Instead of adding hooks to each action you can add global ones in `hooks` field of a second argument of middlewareCreator:
```javascript
import createReduxPromise, { reduxPromiseActionTypes } from 'redux-better-promise';

const store = createStore(
  rootReducer,
  applyMiddleware(createReduxPromise(null, { hooks: [
    ({ type, result, error, payload }) => console.log('I will be triggered on each and every action'),
    {
      actionType: reduxPromiseActionTypes.success,
      hook: ({ result }) => console.log('I will be triggered on every success action'),
    },
    {
      actionType: /^\w*ERROR$/,
      hook: ({ error }) => console.log('I will be triggered only on actions ending in "ERROR"'),
    },
    {
      actionType: (type, action) => !~(['ONE_ACTION', 'DIFFERENT_ACTION']).indexOf(type),
      hook: () => console.log('I will be triggered on all actions except ONE_ACTION and DIFFERENT_ACTION'),
    },
    {
      actionType: ['ONE_ACTION', 'DIFFERENT_ACTION'],
      hook: () => console.log('I will be triggered on ONE_ACTION and DIFFERENT_ACTION only'),
    }
  ] }))
);
```

You can also replace actionType with actionTypeExclude which will just inverts the behaviour of that field or even use both fields (the `exclude` field will overwrite the `include` filed):
```javascript
import createReduxPromise, { actionTypes: reduxPromiseActionTypes } from 'redux-better-promise';

const store = createStore(
  rootReducer,
  applyMiddleware(createReduxPromise(null, { hooks: [
    ({ type, result, error, payload }) => console.log('I will be triggered on each and every action'), // note that global hooks gets `type` in the first parameter wheras per-action hooks do not
    {
      actionTypeExclude: reduxPromiseActionTypes.success,
      hook: ({ result }) => console.log('I will be triggered on every start and error action'),
    },
    {
      actionTypeExclude: /^\w*ERROR$/,
      hook: ({ error }) => console.log('I will be triggered only on actions not ending in "ERROR"'),
    },
    {
      actionTypeExclude: (type, action) => !~(['ONE_ACTION', 'DIFFERENT_ACTION']).indexOf(type),
      hook: () => console.log('I will be triggered on ONE_ACTION and DIFFERENT_ACTION only'),
    },
    {
      actionType: ['ONE_ACTION', 'DIFFERENT_ACTION'],
      actionTypeExclude: (type, action) => action.payload,
      hook: () => console.log('I will be triggered on ONE_ACTION and DIFFERENT_ACTION only if the do not have `payload` field'),
    }
  ] }))
);
```

There are different generic types in actionTypes named export object:
```javascript
import { actionTypes } from 'redux-better-promise';

actionTypes.start;
actionTypes.success;
actionTypes.error;
actionTypes.finish; // success and error
```


#### Changing default field names
Most of the time it's better not to have fields named `function` in you code ;)
You can change all default field names by providing any number of configFields as a second argument to middlewareCreator
```javascript
const store = createStore(
  rootReducer,
  applyMiddleware(createReduxPromise(null, { functionFieldName: 'myNewName' }))
);
```

Now actions can look like this:
```javascript
function getSyncAction() {
  return {
    types: ['ACTION_STARTED', 'ACTION_SUCCEEDED', 'ACTION_ERROR'],
    myNewName: ({ getState, dispatch }) => ({ some: 'data' }),
  };
}
```

Your config object will be deeply merged with default options:
```javascript
{
  promiseFieldName: 'promise',
  functionFieldName: 'function',
  typesFieldName: 'types',
  hooksFieldName: 'hooks',
  typesNames: { // used when types field is object
    start: 'start',
    success: 'success',
    error: 'error',
  },
  hooksNames: { // used when hooks field is object
    start: 'start',
    success: 'success',
    error: 'error',
  },
}
```

Note that you cannot change `type` field name!

## Good practises
#### no-dispatch actions
Theoretically you could create actions that does not influence redux store. For example:
```javascript
function getAsyncAction() {
  return {
    promise: ({ getState, dispatch }) => Promise.resolve({ some: 'data' }),
  };
}
```

When dispatching action above no action will actually be dispatched on redux store. As using redux in this way doesn't make sense, actions that has neither `types` nor `type` field will throw an error when dispatched.
Note that you still can make a workaround:
```javascript
function getAsyncAction() {
  return {
    types: [ null, null, null ],
    promise: ({ getState, dispatch }) => Promise.resolve({ some: 'data' }),
  };
}
```
Although in this version such action will not throw an error it is generally bad idea to create it. Even with hooks, it's much better (and easier to reason about) when calling promise directly.

#### conditional dispatchers
As with `redux-thunk` or `redux-saga` you can create action that will conditionally dispatch other actions:
```javascript
function getWrapperAction(makeItSo) {
  return {
    function: ({ dispatch }) => makeItSo ? dispatch(someOtherAction) : null,
  };
}
```
Most of the time it's not a good idea. It's probably better to just conditionally dispatch someOtherAction than to create wrapper action to do that for you.

## Roadmap
* Errors in success hooks should not be caught together with errors in `function`
* Add global hooks option (with mechanism to apply hooks to only some actions based on filter function or regex or type: start, success, error)
* Refactor tests (merge some tests and split others to make them more readable)
