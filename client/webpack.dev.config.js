const baseConfig = require('./webpack.config');
const merge = require('webpack-merge');

module.exports = merge.smart(baseConfig, {
    mode: 'development',
    devtool: 'inline-source-map',
    module: {
        rules: [{
            test: /\.js$/,
            use: ["source-map-loader"],
            enforce: "pre"
        }]
    }
});