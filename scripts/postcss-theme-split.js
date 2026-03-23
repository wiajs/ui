// scripts/postcss-wia-theme-split.js

/**
 * Wia UI 极速端分离引擎 (AST 级选择器剪裁)
 * @param {Object} opts - 配置项 { target: 'mb' | 'pc' | 'all' }
 */
export default (opts = {}) => {
  const target = opts.target || 'mb'

  return {
    postcssPlugin: 'postcss-theme-split',

    Rule(rule) {
      // 1. 如果当前规则不包含端标记，直接放行 (如 .button { ... })
      if (
        !rule.selector.includes('html.ios') &&
        !rule.selector.includes('html.md') &&
        !rule.selector.includes('html.pc')
      )
        return

      // 2. 将组合选择器拆分 (例如: "html.ios .btn, html.pc .btn")
      const selectors = rule.selectors.filter(sel => {
        if (target === 'mb') {
          // 打包移动端：剔除所有包含 html.pc 的选择器
          return !sel.includes('html.pc')
        } else if (target === 'pc') {
          // 打包PC端：剔除所有包含 html.ios 和 html.md 的选择器
          return !sel.includes('html.ios') && !sel.includes('html.md')
        }
        return true
      })

      // 3. 根据过滤结果重塑 AST 树
      if (selectors.length === 0) {
        // 如果该规则下的所有选择器都被剔除，直接物理删除整块 CSS
        rule.remove()
      } else if (selectors.length !== rule.selectors.length) {
        // 如果只剔除了部分 (比如写了共用的选择器)，则更新剩余的选择器
        rule.selectors = selectors
      }
    },
  }
}

export const postcss = true
