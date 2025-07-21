/** @jsxImportSource @wiajs/core */

/**
 * editTable 中的附件模块
 */

import {log as Log} from '@wiajs/util'

const log = Log({m: 'attach'}) // 创建日志实例

/**
 * @typedef {import('./index').default} EditTable
 */

const g = {
  /** @type {*} */
  lightbox: null,
}

/**
 * 按分类渲染附件
 * @param {EditTable} _
 * @param {{_idx: number, id: number, cat:string, name:string,abb:string, url:string, status?:string, type:string, ext?:string}[]} value - 数据卡 值，对象数组
 * @param {*} thead - 表头
 * @param {*} tbody - 表body
 * @param {*[] & {catid: number}} cats - 分类
 * @param {number[]} cols - 分类列数
 * @param {number} idx - editTable 的数据索引
 */
function fillAttach(_, value, thead, tbody, cats, cols, idx) {
  try {
    const {data} = _
    const {uploader} = data[idx]

    if (!value?.length) return

    let i = -1
    for (const v of value) {
      i++
      v._idx = i // 数据加索引，方便浏览
    }

    const tr = thead.lastChild().clone()
    let {catid} = cats // 数据数组索引
    catid -= 1
    // 行赋值
    for (const cat of cats) {
      catid++

      tr.dom.data = value // 保存数据，用于点击浏览
      const td = document.createElement('td')
      td.colSpan = cols[catid] // col * 2

      const $td = $(td)
      $td.data('idx', idx) // td 保存 EditTable 的数据索引

      const att = $(<div class="etAttach" />)
      att.appendTo($td)

      // 按 cat 分组，预先已定义cat，无需分组
      // const cats = value.reduce((acc, v) => {
      //   const gp = acc[v.cat]
      //   if (gp) {
      //     gp.count++
      //     gp.data.push(v)
      //   } else acc[v.cat] = {data: [v], count: 1}
      //   return acc
      // }, {})

      att.append(<div class="attach-cat">{cat}</div>)
      att.append(<div class="attach-wrap" />)
      // 封装层，超出左右滑动
      const wrap = att.find('.attach-wrap')
      // 分类
      const cs = value.filter(v => v.cat === cat)
      // 添加分类项目
      for (const c of cs) {
        const {_idx, abb, url, type, ext} = c
        addItem(wrap, type, ext, abb, url, _idx)
      }

      // 添加附件上传
      wrap.append(
        <div class="attach-item wia_uploader">
          <input name="attach" type="hidden" />
          <div class="_wrap">
            <div name="btnAdd" class="_input" />
            <p>新增</p>
          </div>
        </div>
      )

      if (_.Uploader) {
        const {dir, url, token} = uploader
        const ud = new _.Uploader({
          // dir: `prj/${cat}`, // 图片存储路径
          dir, // 图片存储路径
          url, // 图片上传网址
          el: wrap.class('wia_uploader'), // 组件容器
          input: wrap.name('attach'), // 上传成功后的url填入输入框，便于提交
          choose: wrap.name('btnAdd'), // 点击触发选择文件
          label: true, // 显示底部标签
          accept: '*', // 选择文件类型
          // accept: 'image/jpg,image/jpeg,image/png', // 选择文件类型
          // compress: true, // 启动压缩
          // quality: 0.8, // 压缩比
          // maxSize: 200, // 压缩后最大尺寸单位 KB
          // width: 80, // 指定宽
          // height: 80, // 指定高
          // resize: 'cover', // 按指定宽高自动居中裁剪
          // aspectRatio: 1, // 宽高比
          // crop: 'img/crop', // 按宽高比人工裁剪

          multiple: false, // 可否同时选择多个文件
          limit: 1, // 选择图片数限制 -1 0 不限
          left: 250, // 预览偏移，左边有导航栏

          // 随文件上传的数据
          // data: {bucket: 'attach', cat: '图像', abb: '我的头像'}, // 其他参数
          header: {'x-wia-token': $.store.get(token)}, // 请求头
        })

        ud.on('choose', async files => {
          let data
          if (_.onAttach) data = await _.onAttach(idx, cat, files)

          let abb = `${cat}1`
          if (data?.abb) abb = data.abb
          const el = addItem(wrap, 'img', 'jpg', abb)
          el.hide()
          ud.config({
            img: el,
            data, // 其他参数
          })
        })
        td.uploader = ud
      }

      tr.append(td)
      // 插入到空行前
      tbody.dom.insertBefore(tr.dom, null)
      tr.show()
      // setTimeout(() => _.attachLast(tr), 1000) // 换行时补全格线
      tr.click(attachClick) // 点击浏览大图
    }
  } catch (e) {
    log.err(e, 'fillAttach')
  }
}

/**
 * 添加子项
 * @param {*} wrap
 * @param {string} type
 * @param {string} ext - 后缀
 * @param {string} abb - 缩写标签
 * @param {string} [url]
 * @param {number} [id]
 */
function addItem(wrap, type, ext, abb, url, id) {
  let R
  try {
    let el
    if (type === 'img') {
      el = (
        <div class="attach-item" data-id={id}>
          <img src={url} alt={abb} loading="lazy" />
          <p>{abb}</p>
        </div>
      )
    } else if (type === 'video') {
      ext = ext ?? 'mp4'
      el = (
        <div class="attach-item" data-id={id}>
          <video controls preload="none">
            <source src={url} type={`${type}/${ext}`} />
          </video>
          <p>{abb}</p>
        </div>
      )
    } else if (type === 'doc') {
      const src = getThumb(ext)
      el = (
        <div class="attach-item" data-id={id}>
          <img src={src} alt={abb} loading="lazy" />
          <p>{abb}</p>
        </div>
      )
    }

    if (wrap && el) {
      el = $(el)
      R = el
      const ud = wrap.find('.wia_uploader')
      if (ud.dom) el.insertBefore(ud)
      else el.appendTo(wrap)
    }
  } catch (e) {
    log.err(e, 'addItem')
  }

  return R
}

/**
 * 从数据中获取一行数据，用于 kv 模式，动态生成 row  col
 * @param {string[]} cats - 分类
 * @param {number[]} cols - 分类列数
 * @param {number} max - 行总列数
 * @param {number} catid - cat起始索引
 * @returns {*[] & {catid: number}} - 每行分类
 */
function getRowCat(cats, cols, max, catid) {
  /** @type {*[] & {catid: number}} */
  let R

  if (!cats || !cols || !max) return

  try {
    let col = 0
    let hasCol = 0

    for (let i = catid; i < cats.length; i++) {
      const r = cats[i]

      let setCol = cols[i]
      if (setCol > max) setCol = max

      col += setCol
      if (col <= max) {
        if (!R) {
          R = []
          R.catid = catid
        }

        R.push(r)
        hasCol += setCol
      } else break
    }

    // 多余列
    if (R && hasCol < max) R[R.length - 1] += max - hasCol
  } catch (e) {
    log.err(e, 'getRowCat')
  }

  return R
}

/**
 * 自动换行时补全格线
 * @param {*} row
 */
function attachLast(row) {
  const attach = row.find('.etAttach')
  const rs = [...attach.dom.children]
  rs.forEach((r, i) => {
    r.classList.remove('attach-last')
    const p = rs[i - 1]
    const pre = p?.getBoundingClientRect()
    const cur = r.getBoundingClientRect()
    // if (prev && r.offsetTop > prev.offsetTop) {
    if (cur.top > pre?.top) p.classList.add('attach-last')
    if (i === rs.length - 1) r.classList.add('attach-last')
  })
}

/**
 * 点击浏览大图
 * @param {*} ev
 */
async function attachClick(ev) {
  const row = $(ev).upper('tr')
  const att = $(ev).upper('.attach-item')
  const idx = att.data('id')

  // 浏览图片附件
  if (att.dom && row.dom) {
    const {data} = row.dom
    const v = data.find(v => v._idx === idx)
    const {type, ext} = v || {}
    let {url} = v || {}
    if (type === 'doc') {
      if (['doc', 'docx', 'xls', 'xlsx', 'ppt'].includes(ext)) url = `https://view.officeapps.live.com/op/view.aspx?src=${url}&wdOrigin=BROWSELINK`

      window.open(url, '_blank')
    } else if (type === 'img' || type === 'video') {
      if (!g.lightbox) {
        // @ts-ignore
        // if (!g.anime) g.anime = await import('https://cdn.jsdelivr.net/npm/animejs@4/+esm')

        // @ts-ignore
        // const m = await import('https://cdn.jsdelivr.net/npm/glightbox@3/+esm')
        const m = await import('https://cos.wia.pub/wiajs/glightbox.mjs')
        g.lightbox = m.default
        setTimeout(() => showImg(data, idx), 1000)
      } else showImg(data, idx)
    }
  }
}

/**
 * 使用 lightbox 图片浏览
 * @param {*[]} data
 * @param {number} idx
 */
function showImg(data, idx) {
  if (g.lightbox) {
    // window.dispatchEvent(new CustomEvent('animeReady'))
    const lbox = g.lightbox({selector: null})
    let id = 0
    let i = -1
    for (const v of data) {
      i++
      if (v._idx === idx) id = i
      if (v.type === 'img' || v.type === 'video') lbox.insertSlide({href: v.url})
    }
    // lbox.open()
    lbox.openAt(id)
  }
}

/**
 * 获取上传文件缩略图标
 * @param {string} ext
 * @param {string} [url]
 * @returns {string}
 */
function getThumb(ext, url) {
  let R
  try {
    ext = `.${ext}`
    if (ext.endsWith('.docx')) ext = '.doc'
    else if (ext.endsWith('.xlsx')) ext = '.xls'

    ext = ext.replace(/^\.+/, '.')

    if (/\.(pdf|xls|doc|csv|txt|zip|rar|ppt|avi|mov|mp3)/i.test(ext)) R = `https://cos.wia.pub/wiajs/img/uploader/${ext.substring(1)}.png`
    else R = url ?? 'https://cos.wia.pub/wiajs/img/uploader/raw.png'
  } catch (e) {
    log.err(e, 'getThumb')
  }

  return R
}

export {fillAttach, getRowCat, getThumb}
