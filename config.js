// wia.config.js
export default {
  // 平台与主题定义
  themes: {
    // 移动端包含 ios 和 md，打包在同一个 css 中，利用 html.ios / html.md 切换
    mb: ['ios', 'md'],
    // PC 端单独打包，具有更紧凑的排版和丰富的 Hover 态
    pc: ['pc'],
  },

  // 国际顶级 UI 的色彩体系 (采用现代 OKLCH 颜色空间，确保感知均匀性)
  colors: {
    // Artisan 经典主色：一种深邃、高级的克莱因蓝/石板青交界色
    primary: 'oklch(0.45 0.12 260)',
    primaryContent: '#ffffff',

    // 表面色 (Surface) 与 背景色
    base100: 'oklch(1 0 0)', // 纯白
    base200: 'oklch(0.97 0.01 260)', // 极浅的高级灰蓝
    base300: 'oklch(0.94 0.02 260)',

    // 语义状态色 (高纯度、高辨识)
    success: 'oklch(0.65 0.15 150)',
    warning: 'oklch(0.75 0.16 80)',
    error: 'oklch(0.55 0.2 25)',
  },

  // 待重构的组件清单 (当前为空，后续逐步添加，如 'button', 'list', 'input')
  components: ['button', 'list', 'card'],
}
