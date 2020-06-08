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

  finally = onFinally =>
    this.then(
      value => Promise.resolve(onFinally()).then(() => value),
      reason =>
        Promise.resolve(onFinally()).then(() => {
          throw reason;
        })
    );

  static reject = e => new Promise((resolve, reject) => reject(e));
  static resolve(v) {
    if (v instanceof Promise) return v;

    return new Promise(resolve => resolve(v));
  }

  static allSettled = promises =>
    new Promise(resolve =>
      [...promises].reduce((results, promise, index, arr) => {
        Promise.resolve(promise).then(
          value => {
            results[index] = { status: 'fulfilled', value };
            if (results.reduce(n => ++n, 0) === arr.length) {
              resolve(results);
            }
          },
          reason => {
            results[index] = { status: 'rejected', reason };
            if (results.reduce(n => ++n, 0) === arr.length) {
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
          if (results.reduce(n => ++n, 0) === arr.length) {
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

  static any = promises =>
    new Promise((resolve, reject) =>
      [...promises].reduce((errs, promise, index, arr) => {
        Promise.resolve(promise).then(resolve, r => {
          errs[index] = r;
          if (errs.reduce(n => ++n, 0) === arr.length) {
            reject(new Error(errs)); // AggregateError
          }
          reject();
        });

        return errs;
      }, [])
    );
}

export default Promise;
