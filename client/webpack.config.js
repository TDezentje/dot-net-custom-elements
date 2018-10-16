const webpack = require('webpack');
const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
    mode: 'production',
    resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        modules: ['node_modules', './src']
    },
    entry: {
        HeroList: path.resolve(__dirname, './src/elements/hero-list/boot.ts')
    },
    output: {
        path: path.resolve(__dirname, '../server/wwwroot'),
        filename: 'assets/[name].js',
        chunkFilename: 'assets/[name]-[id].js',
    },
    module: {
        rules: [
        {
            test: /\.(ts|tsx)?$/,
            use: [{
                loader: 'awesome-typescript-loader',
                options: {
                    getCustomTransformers: program => ({
                        before: [
                            require(path.resolve(__dirname, './transformers/dist/dotnet.transform'))
                                .createTransformer({
                                    outputDir: path.resolve(__dirname, '../server/elements'), 
                                    namespace: 'Elements',
                                    program: program
                                }),
                            require(path.resolve(__dirname, './transformers/dist/css-require.transform')).transformer,
                            require(path.resolve(__dirname, './transformers/dist/ref-replace.transform')).transformer
                        ]
                    })
                }
            }]
        }, 
        {
            test: /\.scss$/,
            use: [{
                loader: MiniCssExtractPlugin.loader
            }, {
                loader: './loader.js'
            }, {
                loader: 'css-loader',
                options: {
                    modules: true,
                    localIdentName: '[hash:base64:6]',
                    minimize: true
                }
            }, {
                loader: 'postcss-loader'
            }, {
                loader: 'sass-loader'
            }]
        }]
    },
    plugins: [
        new webpack.optimize.ModuleConcatenationPlugin(),
        new MiniCssExtractPlugin({
            filename: "assets/[name].css",
            chunkFilename: "assets/[id].css"
        })
    ]
};