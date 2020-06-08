class Deferred {
  #resolve;
  #reject;
  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.#resolve = resolve;
      this.#reject = reject;
    });
  }
  resolve = (...args) => this.#resolve(...args);
  reject = (...args) => this.#reject(...args);
}

export default Deferred;
