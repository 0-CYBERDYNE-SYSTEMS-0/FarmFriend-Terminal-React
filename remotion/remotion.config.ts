import { Config } from '@remotion/cli/config';

const config: Config = {
  outDir: 'out',
  overwrite: true,
  assets: ['../public'],
  webpackConfig: {
    resolve: {
      alias: {
        react: require.resolve('react'),
      },
    },
  },
  puppeteer: {
    displayServerPort: 9999,
  },
};

export default config;
