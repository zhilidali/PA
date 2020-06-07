/** @type { import('@babel/core').TransformOptions } */
const options = {
  presets: [
    [
      '@babel/preset-env',
      {
        modules: 'commonjs',
        useBuiltIns: 'usage',
        corejs: 3,
        exclude: ['@babel/plugin-transform-regenerator'],
      },
    ],
  ],
  plugins: [
    // class {#a () {}}
    ['@babel/plugin-proposal-private-methods'],
    // class {a; #a; static a; static #a;}
    ['@babel/plugin-proposal-class-properties'],
    // re-use helpers
    ['@babel/plugin-transform-runtime'],
  ],
};

module.exports = options;
