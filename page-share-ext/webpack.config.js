const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const { DefinePlugin } = require("webpack");

// config.local.json (gitignored) provides R2 credentials baked into the bundle.
// Copy config.local.example.json → config.local.json and fill in the values.
let localConfig = {};
try {
  localConfig = require("./config.local.json");
} catch {
  // No config.local.json — R2 direct upload will be disabled.
}

module.exports = {
  mode: "production",
  devtool: "source-map",
  entry: {
    "popup/popup": "./src/popup/popup.ts",
    "content/index": "./src/content/index.ts",
    "background/index": "./src/background/index.ts",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "manifest.json", to: "manifest.json" },
        { from: "src/popup/popup.html", to: "popup/popup.html" },
        { from: "src/popup/popup.css", to: "popup/popup.css" },
        { from: "icons", to: "icons", noErrorOnMissing: true },
      ],
    }),
    new DefinePlugin({
      __R2_ENDPOINT__: JSON.stringify(localConfig.r2Endpoint || ""),
      __R2_BUCKET__: JSON.stringify(localConfig.r2Bucket || ""),
      __R2_KEY_ID__: JSON.stringify(localConfig.r2KeyId || ""),
      __R2_SECRET__: JSON.stringify(localConfig.r2Secret || ""),
      __R2_PUBLIC_URL__: JSON.stringify(localConfig.r2PublicUrl || ""),
    }),
  ],
  // Inline config so the extension JS is self-contained
  optimization: {
    minimize: false,
    splitChunks: false,
  },
};
