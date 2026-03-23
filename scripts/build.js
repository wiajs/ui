import path from 'node:path'
import tailwind from '@tailwindcss/postcss'
import fs from 'fs-extra'
import postcss from 'postcss'
import lightning from 'postcss-lightningcss'
import config from '../config.js'
import themeSplit from './postcss-theme-split.js' // 引入分离插件

// 目录定义
const srcDir = path.resolve('./src')
const distDir = path.resolve('./dist/css')

/**
 * 核心 CSS 编译管线
 * @param {string} inputFile - 源码文件
 * @param {string} outputFile - 输出文件
 * @param {string} target - 目标平台 ('mb' 或 'pc' 或 'all')
 */
async function compileCSS(inputFile, outputFile, target) {
  try {
    const css = await fs.readFile(inputFile, 'utf8')

    // 组装顶级 PostCSS 编译管线
    const result = await postcss([
      // 1. Tailwind 4 引擎：处理 @theme, @apply 及原子类提取
      tailwind({optimize: false}), // 基础库关闭摇树优化

      // 🚀 注入端分离引擎，根据 target 切割 AST
      themeSplit({target}),

      // 2. LightningCSS：基于 Rust 的极速编译器，处理原生嵌套、前缀和极限压缩
      lightning({
        browsers: '>= 3%', // 国际化浏览器兼容标准
        lightningcssOptions: {
          minify: false, // 开启生产级压缩
          drafts: {
            nesting: true, // 开启原生 CSS 嵌套解析
          },
        },
      }),
    ]).process(css, {from: inputFile, to: outputFile})

    // 输出最终产物
    await fs.outputFile(outputFile, result.css)
    console.log(
      `✨ [Wia ui ${target.toUpperCase()}] 构建完成: ${outputFile} (${(result.css.length / 1024).toFixed(2)} KB)`
    )
  } catch (err) {
    console.error(`❌ 构建失败: ${inputFile}`, err)
  }
}

/**
 * 自动生成组件的聚合引用入口文件 (Aggregate Entry)
 * @param {string} comp - 组件名称 (如 'button')
 */
async function aggregateCss(comp) {
  const content = `/* @wiajs/ui 自动生成的按需聚合入口 */\n@import "./${comp}.mb.css";\n@import "./${comp}.pc.css";\n`

  // 1. 这里拼接出具体的文件路径 (例如: dist/css/button.css)
  const outputFile = path.join(distDir, `${comp}.css`)
  await fs.outputFile(outputFile, content)

  console.log(`🔗 [Wia Aggregate] 聚合入口已生成: ${outputFile}`)
}

/**
 * 编译所有基础库与组件
 */
export async function build() {
  console.log('🚀 启动 Wia UI 编译引擎...')
  await fs.ensureDir(distDir)

  // 这里的 components 参数未来可用于动态生成 entry 文件
  // 目前我们先编译两个顶级 Base 入口

  // 1. 编译基座 Base (统一从单一源文件 base.css 裂变生成)
  const baseSrc = path.join(srcDir, 'base.css')
  await Promise.all([
    compileCSS(baseSrc, path.join(distDir, 'base.mb.css'), 'mb'),
    compileCSS(baseSrc, path.join(distDir, 'base.pc.css'), 'pc'),
  ])

  // 2. 动态编译所有组件 (根据 wia.config.js 中的配置)
  // 如果 config.components 是 ['button', 'list']，则会自动循环打包
  const comps = config.components && config.components.length > 0 ? config.components : ['button'] // 兜底测试用

  for (const comp of comps) {
    const src = path.join(srcDir, `${comp}/${comp}.css`)

    // 如果组件源码存在，则执行多端裂变编译
    if (fs.existsSync(src)) {
      await Promise.all([
        // 1. 编译移动端版本 (插件会自动切掉 PC 的代码)
        compileCSS(src, path.join(distDir, `${comp}.mb.css`), 'mb'),

        // 2. 编译 PC 端版本 (插件会自动切掉 iOS 和 MD 的代码)
        compileCSS(src, path.join(distDir, `${comp}.pc.css`), 'pc'),
      ])

      // 🚀 核心：编译完 mb 和 pc 后，自动生成聚合的 button.css
      await aggregateCss(comp)
    } else console.warn(`⚠️ 找不到组件源码: ${src}`)

    console.log('🎉 Wia UI 全部构建完成！')
  }
}

build()
