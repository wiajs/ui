/** @jsxImportSource @wiajs/core */
/**
 * editTable 中的chip模块
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
 * @param {*[][]} value - 二维数组
 * @param {HTMLElement} td - td
 * @param {boolean} [read] - 只读
 * @param {number} [idx] - Kv编辑数据索引或表格编辑字段索引
 * @param {number} [idy] - 表格编辑时的数据行索引
 */
function fillChip(_, value, td, read = false, idx = 0, idy = 0) {
  try {
    const $td = $(td)
    $td.data('idx', idx) // td 保存 EditTable 的数据索引
    $td.data('idy', idy) // td 保存 EditTable 的数据行索引
    // @ts-expect-error
    td._value = value // 原值
    $td.click(chipClick)
    fillTd(_, td, value, read, idx, idy)
  } catch (e) {
    log.err(e, 'fillChip')
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
        <div class="_add">
          <input name={`${field}-chip-add`} class="_addVal" type="hidden" />
          <div class="_box">
            <div name="btnAdd" class="_btn" />
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

      if (!opt.edit) wrap.find('._add').hide()
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
        <div class={`chip ${add ? '_addChip' : ''}`} data-key={v.key} data-val={v.val}>
          <div class={`chip-media bg-color-${v.color}`}>{v.media}</div>
          <div class="chip-label">{v.val}</div>
          <a class="chip-delete" />
        </div>
      )
      return rt // + v
    })

    const addBtn = wrap.find('._add')

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
    const td = wrap.upper('td')
    const input = wrap.find('input._addVal')
    if (!input.dom._add) input.dom._add = new Set()
    const {_add, _del} = input.dom

    // 保存新增
    for (const v of vs) _add.add(v)

    if (_add?.size || _del?.size) td.addClass('etChange')
    else td.removeClass('etChange')
  } catch (e) {
    log.err(e, 'addItem')
  }
}

/**
 * 删除
 * @param {Dom} chip -
 */
function delItem(chip) {
  try {
    if (chip.dom) {
      const td = chip.upper('td')
      const input = td.find('input._addVal')
      const {_add} = input.dom
      let {_del} = input.dom

      const key = chip.data('key')
      const val = chip.data('val')

      // 新增附件删除
      if (chip.hasClass('_addChip')) {
        for (const item of _add) if (Array.isArray(item) && item[0] === key) _add.delete(item)
      } else {
        if (!_del) {
          _del = new Set()
          input.dom._del = _del
        }

        _del.add([key, val])
      }
      chip.remove()

      if (_add?.size || _del?.size) td.addClass('etChange')
      else td.removeClass('etChange')
    }
  } catch (e) {
    log.err(e, 'delItem')
  }
}

/**
 * 点击tr、td 浏览大图或删除附件
 * @param {*} ev
 */
async function chipClick(ev) {
  try {
    const btnAdd = $(ev).upper('._btn')

    if (btnAdd.dom) {
      const td = btnAdd.upper('td')
      const chip = td.find('.etChip')
      chip?.hide()
      const dvAc = td.find('.autocomplete')
      const ac = dvAc.dom?._wiaAutocomplete
      ac?.show()
      ac?.focus() // 自动触发下拉
          } else {
      const btnDel = $(ev).upper('.chip-delete')
      if (btnDel.dom) {
        // 删除
        const chip = btnDel.upper('.chip')
        delItem(chip)
      }
    }
  } catch (e) {
    log.err(e, 'chipClick')
  }
}

/**
 *
 * @param {*} tb
 */
function edit(tb) {
  const wrap = tb.find('.chip-wrap')
  wrap.find('._add').show()
}

/**
 *
 * @param {*} tb
 */
function view(tb) {
  const wrap = tb.find('.chip-wrap')
  wrap.find('._add').hide()
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

export {edit, fillChip, view}
