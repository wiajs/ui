/** @jsxImportSource @wiajs/core */
/**
 * editTable 中的附件模块
 */

import {log as Log} from '@wiajs/util'

const log = Log({m: 'chip'}) // 创建日志实例

/**
 * @typedef {import('./index').default} EditTable
 */
/**
 * @typedef {import('jquery')} $
 * @typedef {JQuery} Dom
 */

/**
 * 填充Chip
 * @param {EditTable} _ - 组件实例
 * @param {{_idx: number, id: number, cat:string, name:string,abb:string, url:string, status?:string, type:string, ext?:string}[]} value - 数据卡 值，对象数组
 * @param {*} td - td
 * @param {boolean} [read] - 只读
 * @param {number} [idx] - Kv编辑数据索引或表格编辑字段索引
 * @param {number} [idy] - 表格编辑时的数据行索引
 */
function fillChip(_, value, td, read = false, idx = 0, idy = 0) {
  try {
    const $td = $(td)
    $td.data('idx', idx) // td 保存 EditTable 的数据索引
    $td.data('idy', idy) // td 保存 EditTable 的数据行索引
    td._chipValue = value
    $td.click(chipClick)
    fillTd(_, td, value, read, idx, idy)
  } catch (e) {
    log.err(e, 'fillChip')
  }
}

/**
 * 点击tr、td 浏览大图或删除附件
 * @param {*} ev
 */
async function chipClick(ev) {
  try {
    const btnAdd = $(ev).upper('.add-btn')
    const td = $(ev).upper('td')
    if (td.dom && btnAdd.dom) {
      const chip = td.find('.etChip')
      chip?.hide()
      const dvAc = td.find('.autocomplete')
      const ac = dvAc.dom?._wiaAutocomplete
      ac?.show()
      ac?.focus() // 自动触发下拉
    }

    const btnDel = $(ev).upper('.chip-delete')
    // 删除
    if (btnDel.dom) {
      const chip = $(ev).upper('.chip')
      const key = chip.data('key')

      const td = $(ev).upper('td')
      const field = td.data('field')
      const idx = td.data('idx') // EditTable data 列索引
      const idy = td.data('idy') // EditTable data 行索引

      const value = td?.dom?._chipValue

      delItem(td, chip, field, key, value, idx, idy)
    }
  } catch (e) {
    log.err(e, 'attachClick')
  }
}

/**
 * 填充 td 内容
 * @param {*} _ - editDable 实例
 * @param {*} td
 * @param {*} value
 * @param {boolean} read
 * @param {number} idx - EditTable 数组数据索引
 * @param {number} [idy] - EditTable 数组数据索引
 */
function fillTd(_, td, value, read, idx, idy = 0) {
  try {
    const {fields, opt} = _

    const r = fields[idx] || {}
    const {field} = r
    if (!r.color) r.color = ['pink', 'yellow', 'red']

    td = $(td)
    td.data('field', field) // td 保存 EditTable 的字段名

    const chip = $(<div class={'etChip'} />).appendTo(td)
    _.chip = chip

    // 封装层，超出左右滑动
    const wrap = $(<div class="chip-wrap" />).appendTo(chip)

    let vs = value || []

    // @ts-expect-error
    if (!Array.isArray(vs[0])) vs = vs.map(v => [v, v]) // 转为二维数组

    fillItem(vs, wrap, r)

    // 新增
    if (!read) {
      wrap.append(
        <div class="wia-add">
          <input name={`${field}-chip-add`} type="hidden" />
          <div class="add-box">
            <div name="btnAdd" class="add-btn" />
          </div>
        </div>
      )

      if (_.Autocomplete) {
        const {source, field, addUrl} = r
        const {placeholder} = r
        if (!r.option) r.option = []

        // 创建Ac
        const dvAc = $(<div class="autocomplete" />).appendTo(td)
        dvAc.hide()

        // tx.addClass('dy-input')
        const ac = new _.Autocomplete(_.page, {
          el: dvAc,
          // name: `${field}-chip-ac`, // 不纳入getVal
          placeholder,
          data: r.option, // 设置初始数据
          // refEl: [el.dom], // 关联元素，点击不关闭列表，否则会关闭列表
          source,
          addUrl,
        })

        ac.on('blur', () => {
          // 选择赋值在 blur 后
          setTimeout(() => {
            const val = ac.val()
            const key = ac.key()

            let vs
            if (key && val) vs = [[key, val]]
            else if (val) vs = [[val, val]]

            fillItem(vs, wrap, {...r, add: true})

            chip.show()
            ac.hide()
          }, 200)
        })

        ac.hide()
      }

      if (!opt.edit) wrap.find('.add-box').hide()
    }
  } catch (e) {
    log.err(e, 'fillTd')
  }
}

/**
 *
 * @param {*[][]} vs
 * @param {Dom} wrap
 * @param {{field: string, color: string[], maxWord: number, add: boolean}} opts
 */
function fillItem(vs, wrap, opts) {
  try {
    if (!vs?.length) return

    const {color, add, maxWord = 6} = opts

    if (add) addItem(vs, wrap, opts)

    // @ts-expect-error
    vs = vs.map((v, i) => {
      const clr = color?.[i % color.length] || 'pink'
      const media = firstLetter(v[1], true) // 颜色
      let val = v[1]
      if (val.length > maxWord) val = val.substr(0, maxWord)
      return {media, color: clr, key: v[0], val}
    })

    const htm = vs?.map(v => {
      const rt = (
        <div class={`chip ${add ? '_addVal' : ''}`} data-key={v.key}>
          <div class={`chip-media bg-color-${v.color}`}>{v.media}</div>
          <div class="chip-label">{v.val}</div>
          <a class="chip-delete" />
        </div>
      )
      return rt // + v
    })

    const addBtn = wrap.find('.wia-add')

    if (addBtn?.length) addBtn.before(htm)
    else wrap.append(htm)
  } catch (e) {
    log.err(e, 'addItem')
  }
}

/**
 * 添加新增项到 input
 * @param {*[][]} vs
 * @param {Dom} wrap
 * @param {{field: string, color: string[], maxWord: number, add: boolean}} opts
 */
function addItem(vs, wrap, opts) {
  try {
    const {field} = opts
    debugger
    const el = wrap.upper('.etChip')
    if (!el.dom._chipAdd) el.dom._chipAdd = new Set()
    const {_chipAdd} = el.dom

    // 保存新增
    for (const v of vs) _chipAdd.add(v)

    // 保存到 input，方便 getVal 获取
    let input = el.find('input._addVal')
    if (!input?.length) input = $(<input name={`${field}-chip-add`} class="_addVal" type="hidden" value=""></input>).appendTo(el)
    input.val(JSON.stringify([..._chipAdd]))
  } catch (e) {
    log.err(e, 'addItem')
  }
}

/**
 * 处理附件删除
 * @param {Dom} td - td
 * @param {Dom} chip - 附件（.attach-item）
 * @param {string} field - 字段名
 * @param {string} key - 字段键值
 * @param {{id:number, url:string}} value - 附件数据值
 * @param {number} idx - EditTable data 列索引
 * @param {number} idy - EditTable data 行索引
 */
function delItem(td, chip, field, key, value, idx, idy) {
  try {
    if (chip.dom) {
      // 新增附件删除
      if (chip.hasClass('_addVal')) {
        const el = chip.upper('.etChip')
        const {_chipAdd} = el.dom
        const key = chip.data('key')

        for (const item of _chipAdd) {
          if (Array.isArray(item) && item[0] === key) _chipAdd.delete(item)
        }

        // 保存到 input，方便 getVal 获取
        let input = el.find('input._addVal')
        if (!input) input = $(<input name={`${field}-chip-add`} class="_addVal" type="hidden" value=""></input>).appendTo(el)
        input.val(JSON.stringify([..._chipAdd]))

        chip.remove()
      } else {
        const el = chip.upper('.etChip')

        if (!el.dom._chipDel) el.dom._chipDel = []

        // 保存被删除元素的信息：DOM克隆、父节点、前一个兄弟节点（用于还原位置）
        el.dom._chipDel.push({
          idx,
          idy,
          field,
          key,
          value,
          chip,
          parent: chip.parentNode(), //.dom.parentElement,
        })
        chip.remove() // 移除DOM元素
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
    const es = el.find('.etChip')
    for (const e of es) {
      if (!e._chipDel) continue

      // 遍历所有需要还原的元素
      for (const r of e._chipDel) {
        if (r.chip && r.parent) {
          const {parent, chip} = r
          const add = parent.findNode('.wia_add')
          if (add.dom) add.before(chip)
          else parent.append(chip)
        }
      }
      e._chipDel = []
    }
  } catch (e) {
    log.err(e, 'cancelDel')
  }
}

/**
 * 还原所有被删除的元素
 * @param {*} el - EditTable
 * @param {*} data - EditTable data
 * @param {boolean} kv - kv 数据
 * @param {*[]} fields - 字段数组
 * @returns {{idx: number, field: string, del:[id: number, url: string, value: *]}[]}
 */
function getDel(el, data, kv, fields) {
  let R
  try {
    const es = el.find('.etChip')
    for (const e of es) {
      if (!e._chipDel) continue

      // 遍历所有需要还原的元素
      const rs = []
      for (const r of e._chipDel) {
        if (r.att && r.parent) {
          const {idx, idy, field} = r
          let {value} = r
          const {id, url} = value
          if (kv) {
            value = data[idx].value
            rs.push({idx, idy, field, fieldid: idx, id, url, value})
          } else {
            const i = fields[idx].idx
            value = data[idy][i]
            rs.push({idx: i, idy, field, fieldid: idx, id, url, value})
          }
        }
      }

      if (rs.length) {
        const map = new Map()
        for (const {idx, idy, field, fieldid, id, url, value} of rs) {
          const key = `${idx}-${idy}`
          if (!map.has(key)) map.set(key, {idx, idy, field, fieldid, value, del: []})
          map.get(key).del.push({id, url})
        }

        R = Array.from(map.values())
      }
    }
  } catch (e) {
    log.err(e, 'getDel')
  }

  return R
}

/**
 *
 * @param {*} tb
 */
function edit(tb) {
  const wrap = tb.find('.chip-wrap')
  wrap.find('.add-box').show()
}

/**
 *
 * @param {*} tb
 */
function view(tb) {
  const wrap = tb.find('.chip-wrap')
  wrap.find('.add-box').hide()
}

/**
 * 提取中文字符的拼音首字母
 * @param {string} ch - 输入字符，仅取首字符
 * @param {boolean} upper - 是否返回大写，默认 false
 * @return {string} 首字母，无效输入返回空
 */
function firstLetter(ch, upper = false) {
  if (!ch) return ''
  const t = ch[0]

  if (/^[a-zA-Z0-9]$/.test(t)) return upper ? t.toUpperCase() : t.toLowerCase()

  const letters = 'ABCDEFGHJKLMNOPQRSTWXYZ'.split('')
  const bases = '阿八嚓哒妸发旮哈讥咔垃痳拏噢妑七呥扨它穵夕丫帀'.split('')

  for (let i = 0; i < letters.length; i++) {
    if (t.localeCompare(bases[i]) >= 0 && (i === letters.length - 1 || t.localeCompare(bases[i + 1]) < 0)) {
      return upper ? letters[i] : letters[i].toLowerCase()
    }
  }
  return ''
}

export {cancelDel, edit, fillChip, getDel, view}
