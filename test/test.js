import promisesAplusTests from 'promises-aplus-tests';
import Adapter from '../src/promise.js';

Adapter.defer = Adapter.deferred = function () {
  const dfd = {};
  dfd.promise = new Adapter((resolve, reject) => {
    dfd.resolve = resolve;
    dfd.reject = reject;
  });
  return dfd;
};

promisesAplusTests(Adapter, function (err) {
  err && console.log(err);
  // All done; output is in the console. Or check `err` for number of failures.
});
