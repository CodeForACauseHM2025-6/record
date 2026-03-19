// CJS mock for @asamuzakjp/css-color (ESM-only package)
// Provides stub implementations to allow jsdom to load in Jest (Node environment)

const noop = () => "";
const noopArr = () => [];

module.exports = {
  resolve: () => "",
  utils: {
    cssCalc: noop,
    resolveGradient: noop,
    splitValue: noopArr,
  },
};
