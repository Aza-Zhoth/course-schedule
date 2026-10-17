import type { PropsWithChildren } from 'react';

import './styles/global.css';
import './styles/icons.css';

/**
 * 应用入口。
 * Taro 会把这里 import 的样式打进 app.wxss，
 * 等价于原 H5 工程里 main.tsx 引入 global.css 的作用。
 */
function App({ children }: PropsWithChildren) {
  return children;
}

export default App;
