/** @jsxImportSource @wiajs/core */
/**
 * editTable 中的附件模块
 */

import {log as Log} from '@wiajs/util'

const log = Log({m: 'attach'}) // 创建日志实例

/**
 * @typedef {import('./index').default} EditTable
 */
/**
 * @typedef {import('jquery')} $
 * @typedef {JQuery} Dom
 */

const g = {
  /** @type {*} */
  lightbox: null,
}

/**
 * 按分类渲染附件
 * @param {EditTable} _
 * @param {*} r
 * @param {{_idx: number, id: number, cat:string, name:string,abb:string, url:string, status?:string, type:string, ext?:string}[]} value - 数据卡 值，对象数组
 * @param {*} tr - 行 或 td
 * @param {{cat: string, col: number}[]} cats - 分类数组，null 无分类，使用 td
 * @param {number} idx - editTable 的数据索引
 */
function fillAttach(_, r, value, tr, cats, idx) {
  try {
    const {read} = r

    let td
    if (!cats) td = tr // 无分类，普通显示

    // if (!value?.length) return

    let i = -1
    for (const v of value) {
      i++
      v._idx = i // 数据加索引，方便浏览
    }

    if (!cats) {
      fillTd(_, td, null, null, value, read, idx)
      const $td = $(td)
      $td.click(attachClick) // 点击浏览大图
      td.attachData = value
      $td.data('idx', idx) // td 保存 EditTable 的数据索引
    }
    // const tr = thead.lastChild().clone()
    // let {catid} = cats // 数据数组索引
    // catid -= 1
    // 行赋值
    else if (tr) {
      tr.dom.attachData = value // 保存数据，用于点击浏览
      tr.click(attachClick) // 点击浏览大图
    for (const {cat, col} of cats) {
      // catid++
      const td = document.createElement('td')
      td.colSpan = col //  cols[catid] // col * 2

      const $td = $(td)
      $td.data('idx', idx) // td 保存 EditTable 的数据索引

        fillTd(_, td, cat, cats, value, read, idx)

        tr.append(td)
        // // 插入到空行前
        // tbody.dom.insertBefore(tr.dom, null)
        // tr.show()
        // // setTimeout(() => _.attachLast(tr), 1000) // 换行时补全格线
      }
    }
  } catch (e) {
    log.err(e, 'fillAttach')
  }
}

/**
 *
 * @param {*} _ - editDable 实例
 * @param {*} td
 * @param {string} cat
 * @param {*[]} cats
 * @param {*} value
 * @param {boolean} read
 * @param {number} idx - EditTable 数组数据索引
 */
function fillTd(_, td, cat, cats, value, read, idx) {
  try {
    const {data, opt} = _
    const {field} = data[idx]
    let {upload} = data[idx]
    upload = upload ?? opt.upload

    const $td = $(td)

    const att = $(<div class={`etAttach ${cat ? 'etCat' : ''}`} />)
    // <input name={`${field}-attach-del`} type="hidden" />
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
      if (cat) att.append(<div class="attach-cat">{cat}</div>)

      att.append(<div class="attach-wrap" />)
      // 封装层，超出左右滑动
      const wrap = att.find('.attach-wrap')
      // 分类
    let vs = value || []

      // 多个cat过滤，一个cat 全部显示
    if (cats?.length > 1) vs = vs?.filter(v => v.cat === cat)
    vs = vs ?? []

      // 添加分类项目
    for (const v of vs) {
      const {_idx, name, url, type, ext} = v
      let {abb} = v
      if (!cat) abb = ''

      addItem(wrap, field, type, ext, name, abb, url, _idx)
      }

      if (!read) {
      // 添加附件上传
      wrap.append(
        <div class="attach-item wia_uploader">
          <input name={`${field}-attach-add`} type="hidden" />
          <div class="_choose">
            <div name="btnAdd" class="_input" />
            {cat && <p>新增</p>}
          </div>
        </div>
      )

      if (_.Uploader) {
        const {dir, url, token} = upload
        const ud = new _.Uploader({
          // dir: `prj/${cat}`, // 图片存储路径
          dir, // 图片存储路径
          url, // 图片上传网址
          el: wrap.class('wia_uploader'), // 组件容器
          input: wrap.name(`${field}-attach-add`), // 上传成功后的url填入输入框，便于提交
          choose: wrap.class('_choose'), // 点击触发选择文件
          label: !!cat, // 显示底部标签
          delete: true, // 带删除图标
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
          preview: false, // 不使用内置预览

          multiple: true, // 可否同时选择多个文件
          left: 250, // 预览偏移，左边有导航栏

          // 随文件上传的数据
          // data: {bucket: 'attach', cat: '图像', abb: '我的头像'}, // 其他参数
          header: {'x-wia-token': $.store.get(token)}, // 请求头
        })

        td.uploader = ud

        ud.on('choose', async files => {
          const abb = cat ? `${cat}1` : ''

          let rs
          // 客户端输入 abb、附件类型（合同、图片等）
          if (_.onAttach) rs = await _.onAttach(idx, cat, files)

          const data = {cat, abb, ...rs}

          // let name = ''
          // if (files?.[0].name) name = files[0].name
          // if (rs?.abb) abb = rs.abb
          // const el = addItem(wrap, `${field}-attach-add`, 'img', 'jpg', name, abb, '', value.length)
          // el.hide()

          ud.config({
            // img: el, // 图片显示的容器
            data, // 其他参数
          })
        })

        // 点击浏览
        ud.on('success', (rs, file, files) => {
          console.log('uploader succ', {rs, file, files})
          // FileData.push({id: file.id, type: file.type, url: file.url, ext: file.ext, _idx: file.id, abb: file.name})
          // FileEl.data('id', file.id)
        })
      }
      }

    if (!opt.edit) wrap.find('._choose').hide()
  } catch (e) {
    log.err(e, 'fillTd')
  }
}

/**
 * 添加子项
 * @param {*} wrap
 * @param {string} field
 * @param {string} type
 * @param {string} ext - 后缀
 * @param {string} name - 名称
 * @param {string} abb - 缩写标签
 * @param {string} [url]
 * @param {number} [idx] - 附件数组索引，便于点击连续浏览
 */
function addItem(wrap, field, type, ext, name, abb, url, idx) {
  let R
  try {
    let el
    if (type === 'img') {
      el = (
        <div class="attach-item" data-idx={idx} data-field={field}>
          <img src={url} alt={abb} title={name} loading="lazy" />
          {abb && <p>{abb}</p>}
          <div class="attach-delete">
            <i class="icon wiaicon">&#xe9fb;</i>
          </div>
        </div>
      )
    } else if (type === 'video') {
      ext = ext ?? 'mp4'
      el = (
        <div class="attach-item" data-idx={idx} data-field={field}>
          <video controls preload="none">
            <source src={url} type={`${type}/${ext}`} />
          </video>
          {abb && <p>{abb}</p>}
          <div class="attach-delete">
            <i class="icon wiaicon">&#xe9fb;</i>
          </div>
        </div>
      )
    } else if (!type || type === 'doc') {
      // 默认按 doc 处理，部分文档上传未识别为 doc，此处做兼容处理，避免附件无显示
      const src = getThumb(ext)
      el = (
        <div class="attach-item" data-idx={idx} data-field={field}>
          <img src={src} alt={abb} title={name} loading="lazy" />
          {abb && <p>{abb}</p>}
          <div class="attach-delete">
            <i class="icon wiaicon">&#xe9fb;</i>
          </div>
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
 * 处理附件删除
 * @param {Dom} td - td
 * @param {Dom} att - 附件（.attach-item）
 * @param {Dom} wrap - 新增 ._wrap
 * @param {string} field - 字段名
 * @param {*} value - 附件数据值
 * @param {number} idx - EditTable data 索引
 */
function delItem(td, att, wrap, field, value, idx) {
  try {
    if (att.dom) {
      // 新增附件删除
      // if (field.endsWith('-attach-add')) {
      if (wrap.dom) {
        const src = wrap.find('._file').data('src')
        // uploader 维护 input
        if (src) td.dom.uploader?.remove({url: src})
      } else {
      const el = att.upper('.etAttach')
      if (!el.dom.attachDel) el.dom.attachDel = []

      // 保存被删除元素的信息：DOM克隆、父节点、前一个兄弟节点（用于还原位置）
      el.dom.attachDel.push({
        idx,
        field,
        value,
        att,
          parent: att.parentNode(),
        prev: att.dom.previousSibling,
      })
      att.remove() // 移除DOM元素
    }
    }
  } catch (e) {
    log.err(e, 'delItem')
  }
}

/**
 * 还原所有被删除的元素
 * @param {*} el - EditTable
 */
function cancelDel(el) {
  try {
    const es = el.find('.etAttach')
    for (const e of es) {
      if (!e.attachDel) continue

      // 遍历所有需要还原的元素
      for (const r of e.attachDel) {
        if (r.att && r.parent) {
          const {parent, att} = r
          const up = parent.findNode('.wia_uploader')
          if (up.dom) up.before(att)
          else parent.append(att)
        }
      }
      e.attachDel = []
    }
  } catch (e) {
    log.err(e, 'cancelDel')
  }
}

/**
 * 还原所有被删除的元素
 * @param {*} el - EditTable
 * @param {*} data - EditTable data
 * @returns {{idx: number, field: string, del:[id: number, url: string, value: *]}[]}
 */
function getDel(el, data) {
  let R
  try {
    const es = el.find('.etAttach')
    for (const e of es.get()) {
      if (!e.attachDel) continue

      // 遍历所有需要还原的元素
      const rs = []
      for (const r of e.attachDel) {
        if (r.att && r.parent) {
          const {idx, field, value} = r
          const {id, url} = value
          rs.push({idx, field, id, url, value: data[idx].value})
        }
      }

      if (rs.length) {
        const map = new Map()
        for (const {idx, field, id, url, value} of rs) {
          if (!map.has(idx)) map.set(idx, {idx, field, value, del: []})
          map.get(idx).del.push({id, url})
        }

        R = Array.from(map.values())
      }
    }
  } catch (e) {
    log.err(e, 'cancelDel')
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
    // if (R && hasCol < max) R[R.length - 1] += max - hasCol
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
 * 添加数据到 data，用于点击浏览
 * @param {*[]} value - 附件值
 * @param {{id: number, url: string, cat: string, type: string, ext:string, name: string, abb:string}} item
 */
function addValue(value, item) {
  try {
    value.push(item)
    value.at(-1)._idx = value.length - 1
  } catch (e) {
    log.err(e, 'addValue')
  }
}

/**
 * 点击tr、td 浏览大图或删除附件
 * @param {*} ev
 */
async function attachClick(ev) {
  try {
    // 如果点击的是 input 则不处理
    if (ev.target.type === 'file') return

  const td = $(ev).upper('td')
  const idx = td.data('idx') // EditTable data 索引

    let value = td?.dom?.attachData

  const tr = $(ev).upper('tr')
    if (!value) value = tr?.dom?.attachData

    value = value ?? []

  const att = $(ev).upper('.attach-item')
    const wrap = $(ev).upper('._wrap')

    let i = att.data('idx') // 附件数据索引，新增附件没有
  const field = att.data('field')

  const btnDel = $(ev).upper('.attach-delete')
  // 删除
    if (btnDel.dom) delItem(td, att, wrap, field, value[i], idx)
  else if (att.dom && tr.dom) {
      // 新增附件没有idx，使用 src
      let src = ''
      if (wrap.dom) src = wrap.find('._file').data('src')

      const add = td.find('[name$="-attach-add"]')
      const addVal = add.dom?.uploadData ?? []

      const data = [...value, ...addVal]

  // 浏览图片附件
      let v
      if (src) {
        i = -1
        v = addVal.find(v => v.url === src)
      } else v = data.find(v => v._idx === i)

      const {ext, type} = v || {}
    let {url} = v || {}

      if (type === 'img' || type === 'video') {
      if (!g.lightbox) {
        // @ts-ignore
        // if (!g.anime) g.anime = await import('https://cdn.jsdelivr.net/npm/animejs@4/+esm')

        // @ts-ignore
        // const m = await import('https://cdn.jsdelivr.net/npm/glightbox@3/+esm')
        const m = await import('https://cos.wia.pub/wiajs/glightbox.mjs')
        g.lightbox = m.default
          setTimeout(() => showImg(data, i, src), 1000)
        } else showImg(data, i, src)
      } else if (url) {
        if (['.doc', '.docx', '.docm', '.xls', '.xlsm', '.xlsb', '.xlsx', '.pptx', '.ppt'].includes(`.${ext}`))
          url = `https://view.officeapps.live.com/op/view.aspx?src=${url}&wdOrigin=BROWSELINK`

        window.open(url, '_blank')
    }
  }
  } catch (e) {
    log.err(e, 'attachClick')
  }
}

/**
 * 使用 lightbox 图片浏览
 * @param {*[]} data - 附件数据
 * @param {number} idx
 * @param {string} src
 */
function showImg(data, idx, src) {
  if (g.lightbox) {
    // window.dispatchEvent(new CustomEvent('animeReady'))
    const lbox = g.lightbox({selector: null})
    let id = 0
    let i = -1
    for (const v of data) {
      if (v.type === 'img' || v.type === 'video') {
      i++
        if (v.url === src || v._idx === idx) id = i
        lbox.insertSlide({href: v.url})
      }
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
    if (ext.endsWith('.docx') || ext.endsWith('.docm')) ext = '.doc'
    else if (ext.endsWith('.pptx')) ext = '.ppt'
    else if (ext.endsWith('.xlsx') || ext.endsWith('.xlsm') || ext.endsWith('.xlsb')) ext = '.xls'

    ext = ext.replace(/^\.+/, '.')

    if (/\.(pdf|xls|doc|csv|txt|zip|rar|ppt|avi|mov|mp3)/i.test(ext)) R = `https://cos.wia.pub/wiajs/img/uploader/${ext.substring(1)}.png`
    else R = url ?? 'https://cos.wia.pub/wiajs/img/uploader/raw.png'
  } catch (e) {
    log.err(e, 'getThumb')
  }

  return R
}

export {fillAttach, getRowCat, getThumb, cancelDel, getDel}
