// Taro 编译配置：babel-preset-taro 负责把 JSX/TS 转成小程序可执行的代码
module.exports = {
  presets: [
    [
      'taro',
      {
        framework: 'react',
        ts: true,
        compiler: 'webpack5',
      },
    ],
  ],
};
