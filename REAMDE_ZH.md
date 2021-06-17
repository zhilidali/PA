# PA

用最新 ECMAScript 语法实现 [Promises/A 标准][promisesaplus]。

## 从处理回调到实现规范

首先对异步回调进行处理，然后根据 Promises/A+ 标准中的 Promise 状态、then 方法、静态方法，一步步去实现，具体步骤如下：

1. [处理回调](#处理回调)
2. [Promise 状态](#promise-状态)
3. [then 方法](#then-方法)
4. [静态方法](#静态方法)

## 实现步骤

### 处理回调

- `then`: 接收 `onFulfilled`, `onRejected` 来注册回调
- `executor`: 提供 `resolve`, `reject` 来执行回调

```js
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

### Promise 状态

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
    const callback = status === 'resolved' ? onFulfilled : onRejected;

    setTimeout(() => callback(this['[[PromiseValue]]']));
  };
}
```


### then 方法

### 静态方法

## 测试

使用 [promises-aplus-tests][promises-aplus-tests] 测试是否符合规范

```sh
npm test;
```

## 协议

[MIT 协议](/LICENSE)

[promisesaplus]: https://promisesaplus.com/
[promises-aplus-tests]: https://github.com/promises-aplus/promises-tests
