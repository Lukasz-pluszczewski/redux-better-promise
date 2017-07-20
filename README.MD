# redux-better-promise
> Simple and powerful redux middleware that supports async side-effects (and much more)

Redux middleware that will allow you to:
* Create actions with side-effects that will dispatch different actions on different side-effect results (like redux-thunk but much much simpler)
* Create actions with both async and sync side-effects
* Add hooks (callbacks) to you async actions so that you can treat dispatched actions like events and just react tot them (e.g. show notification without checking if state changed)

## FAQ
##### Why this exists?
There are some good middlewares that help manage side-effects in redux actions but they generally allow you to create actions creators that are vastly different then standard ones. I decided to make middleware with which you will be able to make action creators that will look consistent with the rest of the application and have all the other middlewares' power combined!

#### Are there good alternatives? 
Yes and you should definitely check them out:
* [redux-thunk](https://github.com/gaearon/redux-thunk)
* [redux-saga](https://github.com/redux-saga/redux-saga)

#### I found a bug! What should I do?
Feel free to make a pull request. All contributions are appreciated! 

## Usage
__This section is under contruction__