# PA

Implement the [Promises/A+ standard][promisesaplus] with Next ECMAScript.

Start with handling asynchronous callback, to the implementation with Promises/A+ standard specification

1. [Handling Callbacks](#handling-callbacks)
2. [Promise States](#promise-states)
3. [then methods](#then-methods)
4. [Static Methods](#static-methods)

## Implement Steps

### Handling Callbacks

- `then`: 接收 onFulfilled, onRejected 来注册回调
- `executor`: 提供 resolve, reject 来执行回调

```js
// Handling Callbacks
class Promise {
  #callbacks = [];
  constructor(executor) {
    const resolve = value =>
      this.#callbacks.forEach(({ onFulfilled }) => onFulfilled(value));
    const reject = reason =>
      this.#callbacks.forEach(({ onRejected }) => onRejected(reason));

    try {
      executor(resolve, reject);
    } catch (e) {
      reject(e);
    }
  }
  then(onFulfilled, onRejected) {
    this.#callbacks.push({ onFulfilled, onRejected });
  }
}
```

FAQ: resolve, reject 同步调用，后面的 then 中的回调不会调用

### Promise States

`[[PromiseStatus]]` only transition to `fulfilled` or `rejected` from `pending`;

- `pending`

  - initial state: may transition to either the fulfilled or rejected state

- `resolved`
  - `[[PromiseValue]]` must have a value, which must not change.
  - Asynchronous execution `onFulfilled(value)` callback
- `rejected`
  - `[[PromiseReason]]` must have a reason, which must not change.
  - Asynchronous execution `onRejected(reason)` callback

```js
class Promise {
  #callbacks = [];
  constructor(executor) {
    const settle = (status, value) => {
      if (this['[[PromiseStatus]]'] === 'pending') {
        this['[[PromiseStatus]]'] = status;
        this['[[PromiseValue]]'] = value;
        setTimeout(() => {
          this.#callbacks.forEach(({ onFulfilled, onRejected }) => {
            const callback = status === 'resolved' ? onFulfilled : onRejected;

            callback(value);
          });
        });
      }
    };
    const resolve = value => settle('resolved', value);
    const reject = reason => settle('rejected', reason);
    this['[[PromiseStatus]]'] = 'pending';

    try {
      executor(resolve, reject);
    } catch (e) {
      reject(e);
    }
  }
  then(onFulfilled, onRejected) {
    if (this['[[PromiseStatus]]'] === 'pending') {
      this.#callbacks.push({ onFulfilled, onRejected });
    } else {
      setTimeout(() => {
        const callback =
          this['[[PromiseStatus]]'] === 'resolved' ? onFulfilled : onRejected;

        callback(this['[[PromiseValue]]']);
      });
    }
  }
}
```

```js
class Promise {
  #callbacks = [];
  constructor(executor) {
    const settle = (status, value) => {
      if (this['[[PromiseStatus]]'] === 'pending') {
        this['[[PromiseStatus]]'] = status;
        this['[[PromiseValue]]'] = value;
        this.#callbacks.forEach(this.#executeAsyncCallback);
      }
    };
    const resolve = value => settle('resolved', value);
    const reject = reason => settle('rejected', reason);
    this['[[PromiseStatus]]'] = 'pending';

    try {
      executor(resolve, reject);
    } catch (e) {
      reject(e);
    }
  }
  then(onFulfilled, onRejected) {
    if (this['[[PromiseStatus]]'] === 'pending') {
      this.#callbacks.push({ onFulfilled, onRejected });
    } else {
      this.#executeAsyncCallback({ onFulfilled, onRejected });
    }
  }
  #executeAsyncCallback = ({ onFulfilled, onRejected }) => {
    const callback = this['[[PromiseStatus]]'] === 'resolved' ? onFulfilled : onRejected;

    setTimeout(() => callback(this['[[PromiseValue]]']));
  };
}
```

FAQ

- optional callback
- return Promise

### then Method

1. accept and register optional **`onFulfilled`、`onRejected`** callback.
2. may be called multiple times on the same promise.
3. return a promise(chaining).
   - If either `onFulfilled` or `onRejected` returns a value `x`，return promise according to the **Promise Resolution Procedure** `[Resolve]](promise, x)`.
   - If either `onFulfilled` or `onRejected` throws a exception `e`，**reject** promise with `e` as the reason.
   - If `onFulfilled` is not a function and `resolved`, **fulfill** promise with same value.
   - If `onRejected` is not a function and `rejected`, **reject** promise with same reason.

**Promise Resolution Procedure** is an abstract operation taking as input a promise and a value: `[[Resolve]](promise, x)`

- If `x` and `promise` refer to the same object, **reject** promise with `TypeError`.
- If `x` is a promise/thenable, adopt its state; `x.then(resolvePromise, rejectPromise)`
  the first takes precedence:
  - when `resolvePromise` with a value `y`, run `[[Resolve]](promise, y)` recursively.
  - when `rejectPromise` with a reason `r`, **reject** promise with `r`
  - if `then` throws an exception `e`, **reject** promise with `e`
- Otherwise **fulfill** promise with `x`

```js
class Promise {
  #callbacks = [];
  constructor(executor) {
    const settle = (status, value) => {
      if (this['[[PromiseStatus]]'] === 'pending') {
        this['[[PromiseStatus]]'] = status;
        this['[[PromiseValue]]'] = value;
        this.#callbacks.forEach(callback => callback());
      }
    };
    const resolve = value => settle('resolved', value);
    const reject = reason => settle('rejected', reason);
    this['[[PromiseStatus]]'] = 'pending';

    try {
      executor(resolve, reject);
    } catch (e) {
      reject(e);
    }
  }

  then(onFulfilled, onRejected) {
    const promise2 = new Promise((resolve, reject) => {
      const executeAsyncCallback = () =>
        setTimeout(() =>
          this.#executeCallback(
            onFulfilled,
            onRejected,
            promise2,
            resolve,
            reject
          )
        );

      if (this['[[PromiseStatus]]'] === 'pending') {
        this.#callbacks.push(executeAsyncCallback);
      } else {
        executeAsyncCallback();
      }
    });

    return promise2;
  }

  #executeCallback = (onFulfilled, onRejected, promise, resolve, reject) => {
    const [callback, settle] =
      this['[[PromiseStatus]]'] === 'resolved'
        ? [onFulfilled, resolve]
        : [onRejected, reject];
    if (typeof callback === 'function') {
      try {
        const x = callback(this['[[PromiseValue]]']);
        this.#resolutionProcedure(promise, x, resolve, reject);
      } catch (e) {
        reject(e);
      }
    } else {
      settle(this['[[PromiseValue]]']);
    }
  };

  #resolutionProcedure = (promise, x, resolve, reject) => {
    try {
      if (x === promise) {
        throw new TypeError('Chaining cycle detected for promise');
      }

      const then = x?.then;
      const [resolvePromise, rejectPromise] = this.#only(
        y => this.#resolutionProcedure(promise, y, resolve, reject),
        reject
      );
      if (typeof x === 'object' && typeof then === 'function') {
        try {
          then.call(x, resolvePromise, rejectPromise);
        } catch (e) {
          rejectPromise(e);
        }
      } else {
        resolve(x);
      }
    } catch (e) {
      reject(e);
    }
  };

  #only = (...fns) => {
    let callable = true;
    return fns.map(fn => (...args) => {
      if (callable) {
        callable = false;
        fn(...args);
      }
    });
  };

  catch = onRejected => this.then(null, onRejected);
}
```

### Static Methods

#### Create Promise Methods

resolve, reject

```js
class Promise {
  static reject = e => new Promise((resolve, reject) => reject(e));
  static resolve(v) {
    if (v instanceof Promise) return v;

    return new Promise(resolve => resolve(v));
  }
}
```

#### Composing Promise Methods

| methods    |             |
| :--------- | :---------: |
| allsettled | all settled |
| all        | all fulfill |
| race       | one settled |
| any        | one fulfill |

```js
class Promise {
  static allSettled = promises =>
    new Promise(resolve =>
      [...promises].reduce((results, promise, index, arr) => {
        Promise.resolve(promise).then(
          value => {
            results[index] = { status: 'fulfilled', value };
            if (results.reduce(num => ++num, 0) === arr.length) {
              resolve(results);
            }
          },
          reason => {
            results[index] = { status: 'rejected', reason };
            if (results.reduce(num => ++num, 0) === arr.length) {
              resolve(results);
            }
          }
        );
        return results;
      }, [])
    );

  static all = promises =>
    new Promise((resolve, reject) =>
      [...promises].reduce((results, promise, index, arr) => {
        Promise.resolve(promise).then(value => {
          results[index] = value;
          if (results.reduce(num => ++num, 0) === arr.length) {
            resolve(results);
          }
        }, reject);
        return results;
      }, [])
    );

  static race = promises =>
    new Promise((resolve, reject) =>
      [...promises].forEach(promise =>
        Promise.resolve(promise).then(resolve, reject)
      )
    );
}
```

## Test

test compliance with `promises-aplus-tests`

```sh
npm test;
```

## License

[MIT License](/LICENSE)

[promisesaplus]: https://promisesaplus.com/
[promises-aplus-tests]: https://github.com/promises-aplus/promises-tests
