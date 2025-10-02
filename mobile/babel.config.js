module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      'babel-preset-expo',
      '@babel/preset-typescript', // ensure TS syntax like `export type { ... }`
    ],
    plugins: [
      '@babel/plugin-syntax-flow', // harmless, fixes the “flow” parse error in node_modules
    ],
  };
};
