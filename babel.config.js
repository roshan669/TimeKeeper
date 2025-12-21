const path = require("path");

module.exports = function (api) {
  api.cache(true);
  const widgetDir = path.join(__dirname, "widget") + path.sep;
  const normalizedWidgetDir = widgetDir.replace(/\\/g, "/");
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-reanimated/plugin"],
  };
};