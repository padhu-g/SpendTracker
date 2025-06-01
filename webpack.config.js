const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: [
          'react-native-chart-kit',
          '@expo/vector-icons',
          'expo-router',
        ],
      },
    },
    {
      ...argv,
      projectRoot: path.resolve(__dirname),
    }
  );

  config.resolve.alias = {
    ...config.resolve.alias,
    '@': path.resolve(__dirname),
  };

  // Enable source maps for better debugging
  config.devtool = 'source-map';

  // Add support for web-specific file extensions
  config.resolve.extensions = [
    '.web.ts',
    '.web.tsx',
    '.web.js',
    '.web.jsx',
    ...config.resolve.extensions,
  ];

  return config;
};
