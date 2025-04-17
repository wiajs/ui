const {glob} = require('glob')
const fs = require('fs-extra')
const path = require('path')

main().catch(err => {
  console.error(err)
  process.exit(1)
})

async function main() {
  // 获取所有 .less 文件
  const rs = await glob('src/**/*.less')
  for (file of rs) {
    // 遍历文件并进行拷贝
    const target = path.join('dist', path.relative('src', file))

    // 拷贝文件到 dist 目录
    fs.copy(file, target)
  }
  console.log(`Copied ${rs.length} less file to dist`)
}
