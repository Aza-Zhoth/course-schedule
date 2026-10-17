import { defineConfig } from '@tarojs/cli';

import devConfig from './dev';
import prodConfig from './prod';

/**
 * Taro 编译配置。
 *
 * designWidth 设为 375 是关键决策：
 * 本项目的样式是从 H5 版（按 390px 视口设计）原样搬过来的，单位全是 px。
 * Taro 的换算规则是 px -> rpx * (750 / designWidth)：
 *   - designWidth = 750 时，14px 会变成 14rpx，在手机上只有原来一半大 —— 界面会整体缩水
 *   - designWidth = 375 时，14px 变成 28rpx，在 375 宽设备上刚好等于 14px —— 原样还原
 * 所以这里必须写 375，否则所有 H5 样式都要重调一遍。
 */
export default defineConfig(async (merge) => {
  const baseConfig = {
    projectName: 'course-schedule-miniapp',
    date: '2026-10-12',
    designWidth: 375,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2,
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: [],
    defineConstants: {},
    copy: {
      patterns: [],
      options: {},
    },
    framework: 'react',
    compiler: {
      type: 'webpack5',
      prebundle: {
        enable: false,
      },
    },
    cache: {
      enable: false,
    },
    mini: {
      postcss: {
        pxtransform: {
          enable: true,
          config: {},
        },
        cssModules: {
          enable: false,
        },
      },
      // 小程序对 CSS 选择器的支持有限，这里关掉 SCSS 之类的额外处理
      miniCssExtractPluginOption: {
        ignoreOrder: true,
      },
    },
    h5: {
      publicPath: '/',
      staticDirectory: 'static',
      postcss: {
        autoprefixer: {
          enable: true,
          config: {},
        },
        cssModules: {
          enable: false,
        },
      },
    },
  };

  if (process.env.NODE_ENV === 'development') {
    return merge({}, baseConfig, devConfig);
  }
  return merge({}, baseConfig, prodConfig);
});
