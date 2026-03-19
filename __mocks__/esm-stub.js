// Generic CJS stub for ESM-only packages that Jest cannot transform
// Used to allow packages that depend on these (like jsdom) to load in tests
module.exports = new Proxy(
  function () {},
  {
    get(_, prop) {
      if (prop === "__esModule") return true;
      if (prop === "default") return module.exports;
      return new Proxy(function () {}, {
        get: () => () => {},
        apply: () => {},
      });
    },
    apply: () => {},
    construct: (_, args) => Object.create(null),
  }
);
