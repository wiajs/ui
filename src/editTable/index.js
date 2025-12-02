/** @jsxImportSource @wiajs/core */
/**
 * 在线编辑表格
 */
import {Event} from '@wiajs/core'
import {isDate, promisify} from '@wiajs/core/util/tool'
import {log as Log} from '@wiajs/util'
import DataTable, {col, th} from '../dataTable'
import {edit as editAttach, fillAttach, view as viewAttach} from './attach'
import * as chip from './chip'
import * as tool from './tool'

const log = Log({m: 'editTable'}) // 创建日志实例

/**
 * @typedef {import('jquery')} $
 * @typedef {JQuery} Dom
 */

/** @typedef {object} Opts
 * @prop {Dom} [el] - contain
 * @prop {Dom} [tb] - $table
 * @prop {string} [name]
 * @prop {string[]} [editTag] - 可编辑元素标签
 * @prop {boolean} [edit] - 编辑模式
 * @prop {boolean} [newEdit] - 新编辑
 * @prop {boolean} [add] - 新增模式
 * @prop {boolean} [kv] - key value
 * @prop {number} [col] - 最大列数
 * @prop {number[]} [colWidth] - 列宽
 * @prop {number} [viewid] - 数据卡id
 * @prop {*} [upload] - 上传接口
 * @prop {*} [updateJson] - 编辑卡片json
 * @prop {*[]} [head] - 非kv模式表头
 * @prop {*[]} [data] - 非kv模式数据
 * @prop {*[]} [use] - 插件，如果带data，则需带插件，否则附件加载有问题
 */

//  * @prop {{url:string, token: string, param:*}} [api]

/** @typedef {object} Opt
 * @prop {Dom} tb - $table
 * @prop {Dom} el - contain
 * @prop {string} name
 * @prop {string} domProp
 * @prop {string[]} editTag
 * @prop {boolean} edit
 * @prop {boolean} newEdit
 * @prop {boolean} add
 * @prop {boolean} kv - key value
 * @prop {number} labelWidth - label 宽度 百分比
 * @prop {number} col - 最大列数
 * @prop {number[]} [colWidth] - 列宽
 * @prop {number} [colRatio] - 列比
 * @prop {number} [viewid] - 数据卡id
 * @prop {*} [upload] - 上传接口
 * @prop {*} [prjid] - 项目id
 * @prop {*} [getSelAll] - 公司列表接口
 * @prop {*} [saveEmbTb] - 保存表格接口
 * @prop {*} [updateJson] - 编辑卡片json
 * @prop {*[]} [head] - 非kv模式表头
 * @prop {*[]} [data] - 非kv模式数据
 * @prop {*[]} [use] - 插件，如果带data，则需带插件，否则附件加载有问题
 */

/** @type {Opt} */
const def = {
  domProp: 'wiaEditTable',
  tb: null,
  el: null,
  editTag: ['input', 'textarea'], // 'span'
  edit: false,
  newEdit: false,
  add: false,
  kv: false,
  labelWidth: 10, // label 宽度 百分比
  col: 8, // KV 模式数量列，k、v各占一列，实际 8 列
  // colWidth: [0.1, 0.15, 0.1, 0.15, 0.1, 0.15, 0.1, 0.15],
  colRatio: 1, // 兼容历史，col 4 模式
  name: null,
  head: null,
  data: null,
}

/**
 * @enum {number} 数据类型-页面呈现方式
 */
const DataType = {
  null: 0,
  text: 1, // 单行文本，默认
  texts: 2, //多行文本，使用 span 编辑
  number: 3, // range: 15, // min="0" max="100"
  date: 4, // 日期
  bool: 5,
  select: 6, // 下拉选项
  radio: 7, // 单选
  checkbox: 8, // 复选框
  chip: 9, // 多个标签
  button: 10, // 按钮
  img: 11, // 图片
  file: 12, // 文件
  path: 13, // hash 网址
  url: 14, // 网址
  email: 15,
  tel: 16,
  password: 17, // password
  time: 18,
  datetime: 19, // datetime-local
  month: 20, // 年月选择器
  week: 21, // 年周选择器
  color: 22, // 颜色
  attach: 23, // 附件
  table: 24, // dataTable
  view: 25, // 嵌套视图
  page: 26, // 内嵌页
  search: 27, // search input
  html: 28, // html
  json: 29, // json
}

/**
 * @enum {string} 数据类型-页面呈现方式
 */
const DataTypes = {
  null: 'null',
  text: 'text', // 单行文本，默认
  texts: 'texts', //多行文本，使用 span 编辑
  number: 'number', // range: 15, // min="0" max="100"
  date: 'date', // 日期
  bool: 'bool',
  select: 'select', // 下拉选项
  radio: 'radio', // 单选
  checkbox: 'checkbox', // 复选框
  chip: 'chip', // 多个标签
  button: 'button', // 按钮
  img: 'img', // 图片
  file: 'file', // 文件
  path: 'path', // hash 网址
  url: 'url', // 网址
  email: 'email',
  tel: 'tel',
  password: 'password', // password
  time: 'time',
  datetime: 'datetime', // datetime-local
  month: 'month', // 年月选择器
  week: 'week', // 年周选择器
  color: 'color', // 颜色
  attach: 'attach', // 附件
  table: 'table', // dataTable
  view: 'view', // 嵌套视图
  page: 'page', // 内嵌页
  search: 'search', // 搜索
  html: 'html', // html
  json: 'json', // json
}

/**
 * @enum {number} 状态
 */
const State = {
  null: 0,
  view: 1, // 浏览
  edit: 2, // 编辑
  json: 3, // json
}

/**
 * EditTable
 */
class EditTable extends Event {
  /** @type {*} */
  editTx = null // 当前被编辑的目标对象

  /** @type {boolean} */
  _keyDown = false // 记录键盘被按下的状态，当有键盘按下时其值为true

  /** @type {*} */
  _selRow = null // 最近的选择行

  /** @type {*} */
  _editCell = null // 当前编辑对象

  /** @type {*} */
  editRow = null // 最后编辑行

  editCursorPos = 0 // 最后编辑光标位置
  rowNum = 0 // 表行数
  newNum = 0 // 新增行数
  dataid = 0 // 当前数据索引，用于render row

  /** @type {*[]} */
  data

  /** @type {Object.<string, string>[]} */
  fields // 字段数组，kv 为 data，非kv为 head.slice(1)，统一管理字段

  /** @type {Object.<string, string>[]} */
  vals // 修改后的字段值，用于字段动态计算

  /** @type {State} */
  state = State.null

  sel = new Set() // 选择
  add = new Set() // 新增
  del = new Set() // 删除
  uses = new Set() // 插件

  /**
   * 构造函数
   * @param {Page} page Page 实例
   * @param {Opts} opts
   */
  constructor(page, opts) {
    super(opts, [page])
    const _ = this
    _.page = page

    const opt = {...def, ...opts}
    _.opt = opt
    const {el, tb, kv, head, data} = opt

    // 是否为kv模式，非kv需带表头
    if (kv && tb) {
      _.tb = tb
      // 克隆数组数据，操作时，不改变原数据
      if (data?.length) _.data = [...data]
    } else if (head && el) {
      _.head = opt.head
      const cfg = {...(opt.head[0] || {})}

      if (cfg.id) cfg.checkbox = cfg.id
      else cfg.checkbox = 'index'
      _.cfg = cfg

      const fields = _.head.slice(1)
      // 创建 field 的深拷贝，避免修改原配置对象value后，导致原列表出问题
      _.fields = fields.map(f => ({...f}))

      _.lastW = window.innerWidth
      _.lastH = window.innerHeight

      // 已创建，直接返回
      if (el.dom[opt.domProp]) {
        const instance = el.dom[opt.domProp]
        _.destroy()
        return instance
      }

      el.dom[opt.domProp] = this

      // 容器
      _.el = el
      // 克隆数组数据，操作时，不改变原数据
      if (data) _.data = [...data]
    }

    // 4 改为 8,兼容旧模式
    if (!opt.colWidth) {
      opt.colRatio = 2
      opt.col = opt.col * 2
      if (opt.col === 8) opt.colWidth = [0.1, 0.15, 0.1, 0.15, 0.1, 0.15, 0.1, 0.15]
    }

    _.init()

    if (opt.edit) _.edit()
    else _.view()

    _.bind()

    // const txs = $(tr).find('input.etCellView')
    // const spans = $(tr).find('span.etLabel')
    // spans.html('hello')

    // for (const tx of txs.get()) {
    //   const $tx = $(tx)
    //   $tx.click(ev => editSpec(tx))
    //   $tx.focus(ev => editSpec(tx))
    //   $tx.blur(ev => viewSpec(tx))
    //   $tx.upper('td').addClass('border-bot')
    // }
  }

  static hi(msg) {
    alert(msg)
  }

  /**
   * kv模式，构建空表头、表体
   */
  init() {
    const _ = this
    const {opt, tb} = _
    const {colWidth, edit, kv, use} = opt

    try {
      // 加载数据之前，先加载插件
      for (const u of use || []) if (u.cls) _.use(u.cls, u.opts)

      if (kv) {
      // 列宽控制
      const cg = tb.find('colgroup')
      if (!cg.dom && colWidth?.length) {
        tb.prepend(
          <colgroup>
            {colWidth.map(v => {
              let width
              if (v < 1) width = `${v * 100}%`
              else width = `${v}px`

              return <col style={`width: ${width}`} />
            })}
          </colgroup>
        )
      }

      // 构造空body
      let body = tb.find('tbody')
      if (!body.dom) {
          if (edit) tb.append(<tbody class="etEdit" />)
          else tb.append(<tbody class="etView" />)
      }

      body = tb.find('tbody')
      // 构造空表头
      const th = tb.find('thead')
      if (!th.dom) {
        body.before(
          <thead>
              <tr style="display: none" class="etRowOdd" />
          </thead>
        )
      }

        // 数据视图
        if (_.data?.length) _.setKv()
      } else _.render()
    } catch (e) {
      log.err(e, 'init')
    }
  }

  /**
   * 生成edit table，包括 thead、tbody
   * @returns
   */
  render() {
    const _ = this
    try {
      const {el, opt, cfg, fields} = _
      const {edit} = opt
      const head = [cfg, ...fields]

      if (!head) {
        console.log('param is null.')
        return
      }

      // checkbox
      const {checkbox: ck, layout, sum, fix} = cfg

      if (fix.includes('table'))
        // 固定表格，上下滚动
        el.append(<div class="data-table-content overflow-auto" />)
      else el.append(<div class="data-table-content" />)

      let ckv = ''
      if (ck) {
        // checkbox
        if (Array.isArray(ck) && ck.length) {
          ckv = `\${r[${ck[0]}]}`
        } else if (ck === 'index') ckv = '${r.index}'
      }

      const {name} = opt

      // 默认固定表头、表尾
      const clas = ['edit-table', 'fix-h', 'fix-b']
      if (fix.includes('right1'))
        // 固定表头 表尾
        clas.push('fix-r1')
      if (fix.includes('right2')) clas.push('fix-r2')
      if (fix.includes('left1')) clas.push('fix-l1')
      if (fix.includes('left2')) clas.push('fix-l2')
      if (fix.includes('left3')) clas.push('fix-l3')
      if (fix.includes('left4')) clas.push('fix-l4')
      if (fix.includes('left5')) clas.push('fix-l5')

      const style = [`table-layout: ${layout}`]
      const tb = $(<table name={name} class={clas.join(' ')} style={style.join(';')} />)
      // 保存tb
      _.tb = tb

      // 加入到容器
      const tbWrap = el.findNode('.data-table-content')
      tbWrap.append(tb)

      // 列宽
      tb.append(<colgroup>{col(head)}</colgroup>)

      // <table name="tbLoan">
      // jsx 通过函数调用，实现html生成。
      let v = th(head, false)

      // 加入到表格
      tb.append(v)

      const thead = tb.tag('THEAD')
      thead.append(
        <tr name={`${name}-tp`} style="display: none">
          {ck && (
            <td class="checkbox-cell">
              <label class="checkbox">
                <input type="checkbox" data-val={ckv} />
                <i class="icon-checkbox" />
              </label>
            </td>
          )}
        </tr>
      )

      // 表主体
      v = <tbody name="tbBody" class={`${edit ? 'etEdit' : 'etView'}`}></tbody>

      // 加入到表格
      tb.append(v)

      _.header = el.findNode('.data-table-header')
      _.$headerSel = el.findNode('.data-table-header-selected')

      // 数据视图
      if (_.data?.length) _.setView()
    } catch (ex) {
      console.log('render', {ex: ex.message})
    }
  }

  bind() {
    const _ = this
    const {opt, fields, vals} = _
    const {kv} = opt

    // 表格点击事件
    // 编辑元素（input） 不能 focus，不能 onblur？原因：pointer-events: none
    _.tb.click(async ev => {
      // 阻止冒泡，否则会莫名其妙的（内嵌表格编辑叠加到kv编辑，导致混乱）事件！
      // ev.preventDefault()
      ev.stopPropagation()

      const $ev = $(ev)
      const th = $ev.upper('th')
      if (th?.length) return

      if (_.state !== State.edit) return

      // 点击 input、select 则跳过
      if (['SELECT', 'INPUT'].includes(ev.target.tagName)) return

      const td = $ev.upper('td')

      let span = $ev.upper('span')

      span = td.find('span')
      if (span.eq(0).css('display') === 'none') {
        // debugger
        return
      }

      const idx = td?.data('idx') // 数据或字段索引
      const idy = td?.data('idy') // 表编辑，多行数据行索引
      const idv = td?.data('idv') // 数据中的value索引，多值数组模式下
      const value = td?.attr('data-value') // 数据原值 data() 会自动转换 json 字符串

      const r = fields?.[idx]

      if (r) {
        if (r.read) return // 只读

        // 方法2.2（更可靠）
        // document.body.setAttribute('tabindex', '-1')
        // document.body.focus()
        // document.body.removeAttribute('tabindex')
        let type = r.type ?? DataType.text // 默认单行字符串
        if (type === 'string') type = DataType.text

        // 多值
        if (idv && idv >= 0 && Array.isArray(type) && type[idv]) {
          type = type[idv]
        }

        const inputType = _.getInputType(type)
        if (inputType) {
          const span = td.find('span')
          span.hide()
          let tx = td.find('input')
          if (!tx.dom) {
            tx = document.createElement('input')
            tx.name = r.field
            tx.type = inputType
            td.append(tx)
            tx = $(tx)
            tx.addClass('dy-input')
            tx.blur(ev => {
              // _.viewCell()
              const val = tx.val()
              span.eq(0).html(val)
              // 比较值是否被修改
              if (`${val}` === `${value}`) {
                tx.hide()
              span.show()
                td.removeClass('etChange')
              } else {
                vals[idy][r.field] = val
                td.addClass('etChange')
              }
            })
          }
          tx.val(span.eq(0).html())
          tx.show()
          tx.focus()
          // 自动聚焦到输入框
          // setTimeout(() => {
          //   tx.focus()
          // }, 50)
        } else if (type === DataType.texts || type === DataTypes.texts) {
          const span = td.find('span')
          if (!span.hasClass('edit')) {
            let tx = td.find('input')
            if (!tx.dom) {
              tx = document.createElement('input')
              tx.name = r.field
              tx.value = span.html()
              tx.hidden = true
              td.append(tx)
            }

            span.dom.tabIndex = '-1'
            // span 可编辑
            // span.focus(ev => span.addClass('edit'))
            span.addClass('edit')
            span.blur(ev => {
              // _.viewCell()
              const val = span.html()
              tx.value = val
              if (`${val}` === `${value}`) {
                span.removeClass('edit') // span 可编辑
                td.removeClass('etChange')
              } else {
                vals[idy][r.field] = val
                td.addClass('etChange')
              }
            })
            span.focus()

            // span.dom.addEventListener('focusout', ev => {
            //   tx.value = span.html()
            //   span.removeClass('edit') // span 可编辑
            // })
          }
        } else if (type === DataType.select || type === DataTypes.select) {
          const span = td.find('span')
          span.hide()
          let key
          let sel = td.find('select')
          // 第一次创建
          if (!sel.dom) {
            sel = document.createElement('select')
            sel.name = r.field
            td.append(sel)
            sel = $(sel)
            sel.addClass('dy-select dy-select-primary')

            sel.click(ev => ev.stopPropagation()) // 阻止事件冒泡 tb 无感知？

            // tx.addClass('dy-input')
            // tx.val(span.html())
            // tx.change(ev => {
            sel.blur(ev => {
              // _.viewCell()
              let val
              const {option} = r
              if (Array.isArray(option)) val = sel.val()
              else if (typeof option === 'object') {
                key = sel.val()
              val = option[key]
              }

              if (`${val}` === `${value}` || val === '') {
                sel.hide()
                span.html(value) // 还原值
                span.show()
                td.removeClass('etChange')
              } else {
                span.html(val) // 修改值
                vals[idy][r.field] = val
                td.addClass('etChange')
              }
            })

            sel.focus(ev => {
              // 关联参数发生编号，重新查询
              _.fillOption(r, td, sel, value, idy)
            })
          }

          // 选项
          await _.fillOption(r, td, sel, value, idy)
          sel.show()
          sel.focus()

          // 弹出下拉列表，基本无效！
          // 等待一帧，确保已渲染
          requestAnimationFrame(() => {
            // 尝试用鼠标事件打开（Chromium 下通常有效）
            const ev = new MouseEvent('mousedown', {bubbles: true, cancelable: true, view: window})
            sel.dom.dispatchEvent(ev)

            // 如果还不行，退一步触发键盘组合（某些浏览器用 Alt+↓ 打开）
            if (document.activeElement === sel) {
              const keyEv = new KeyboardEvent('keydown', {key: 'ArrowDown', altKey: true, bubbles: true})
              sel.dom.dispatchEvent(keyEv)
            }
            })
        } else if ((type === DataType.search || type === DataTypes.search) && _.Autocomplete) {
          const span = td.find('span')
          // 切换到编辑模式
          if (span.css('display') !== 'none') {
            span.hide()
            let dvAc = td.find('.autocomplete')

            let ac = dvAc.dom?._wiaAutocomplete
            // 创建Ac
            if (!ac) {
              const {source, field, addUrl} = r
              const {placeholder} = r
              // td.append()
              dvAc = $(<div class="autocomplete" />).appendTo(td)

              // 保存当前字段 search回来的数据，表编辑时 其它行共享
              if (!r.option) r.option = []

              // 处理 source.param 中的 ${} 引用（与 select 组件保持一致）
              let processedSource = source
              if (source && typeof source === 'object' && source.param) {
                let {param = {}} = source
                // 查询参数 可引用其他字段值
                param = _.parseRef(param, idy)
                processedSource = {...source, param}
              }

              // r.option = option // 不保存到字段定义，避免污染
              // tx.addClass('dy-input')
              ac = new _.Autocomplete(_.page, {
                el: dvAc,
                data: r.option, // 设置初始数据、缓存查询数据，不传则不缓存
                name: field, // input name，用于获取字段值
                value, // 原始值 用于初始选中
                placeholder,
                // refEl: [span.dom], // 点击该关联元素不关闭下拉列表，点击其他地方，关闭列表
                source: processedSource,
                addUrl,
              })

              ac.on('blur', () => {
                // 选择赋值在 blur 后
                setTimeout(() => {
                  const val = ac.val() //tx.val()
                  if (`${val}` === `${value}` || val === '') {
                    ac.hide()
                    span.eq(0).html(value) // 还原值
                    span.show()
                    td.removeClass('etChange')
                  } else {
                    span.eq(0).html(val) // 修改值
                    vals[idy][r.field] = val
                    td.addClass('etChange')
                  }
                }, 200)
              })
            }

            ac.show()
            ac.focus() // 自动触发下拉
          }
        } else if (type === DataType.bool || type === DataTypes.bool) {
          const span = td.find('span')
          span.hide()
          let val = span.html()
          let key
          let tx = td.find('select')
          if (!tx.dom) {
            tx = document.createElement('select')
            tx.name = r.field
            td.append(tx)
            tx = $(tx)
            tx.addClass('dy-select dy-select-primary')
            const option = {true: '是', false: '否'}
            // 添加选项
            const htm = []
            for (const k of Object.keys(option)) {
              const v = option[k]
              if (v === val) {
                key = k
                htm.push(
                  <option selected value={k}>
                    {v}
                  </option>
                )
              } else htm.push(<option value={k}>{v}</option>)
            }

            tx.html(htm.join(''))

            if (key) tx.val(key)
            else tx.val(val)

            tx.click(ev => ev.stopPropagation()) // 阻止事件冒泡

            // tx.addClass('dy-input')
            // tx.val(span.html())
            tx.blur(ev => {
              // _.viewCell()
              key = tx.val()
              val = option[key]

              span.html(val)

              if (`${val}` === `${value}`) {
              tx.hide()
                span.show()
                td.removeClass('etChange')
              } else {
                vals[idy][r.field] = val
                td.addClass('etChange')
              }
            })
          }
          tx.show()
          tx.focus()
          setTimeout(() => {
            // 创建并触发鼠标事件来展开下拉框
            // const event = new MouseEvent('mousedown')
            const event = new MouseEvent('mousedown', {
              bubbles: true,
              cancelable: true,
              view: window,
            })
            tx.dom.dispatchEvent(event)
          }, 100)

          // tx.click()
        } else if (type === DataType.url || type === DataTypes.url) {
                // urlChange
          const span = td.find('span')
          span.hide()
          let tx = td.find('input')
                    if (!tx.dom) {
            tx = document.createElement('input')
            tx.name = r.field
            tx.type = 'url'
            td.append(tx)
            tx = $(tx)
            tx.addClass('dy-input')
            tx.blur(ev => {
                            // _.viewCell()
              const val = tx.val()
              span.eq(0).find('a').attr('href', val)
                            // 比较值是否被修改
                            if (`${val}` === `${value}`) {
                tx.hide()
                span.show()
                td.removeClass('etChange')
              } else {
                vals[idy][r.field] = val
                td.addClass('etChange')
              }
            })
                    }
                    // urlChange
          tx.val(span.eq(0).find('a').attr('href'))
          tx.show()
          tx.focus()
                }
      }
      // for (const tag of _.opt.editTag) {
      //   const tx = $ev.upper(tag)
      //   if (tx.dom) {
      //     _.editCell(tx.dom)
      //     break
      //   }
      // }
    })

    // 处理checkbox
    _.tb.on('change', '.checkbox-cell input[type="checkbox"]', function (ev) {
      _.handleCheck(ev, this)
    })

    _.tb.on('change', '.etCheckbox input[type="checkbox"]', ev => {
      const td = $(ev).upper('td')
      const idx = td?.data('idx') // 数据或字段索引
      const r = fields?.[idx]
      const {type} = r

      if ([DataType.checkbox, DataTypes.checkbox].includes(type)) {
        const {val, value} = _.getVal(td)?.[0] || {}
        if (JSON.stringify(val) !== JSON.stringify(value)) td.addClass('etChange')
        else td.removeClass('etChange')
      }
    })

    _.tb.on('change', '.etRadio input[type="radio"]', ev => {
      const td = $(ev).upper('td')
      const idx = td?.data('idx') // 数据或字段索引
      const r = fields?.[idx]
      const {type} = r

      if ([DataType.radio, DataTypes.radio].includes(type)) {
        const {val, value} = _.getVal(td)?.[0] || {}
        if (JSON.stringify(val) !== JSON.stringify(value)) td.addClass('etChange')
        else td.removeClass('etChange')
      }
    })
  }

  /**
   * checkbox Events
   * @param {*} ev
   * @param {HTMLElement} el
   * @returns
   */
  handleCheck(ev, el) {
    const _ = this
    try {
      // 代码更改checkbox属性，不会触发change，代码触发change，这里需排除，避免循环
      if (ev.detail && ev.detail.sentByWiaF7Table) {
        // Scripted event, don't do anything
        return
      }

      const $el = $(el)
      // 是否被选中
      const {checked} = el
      const val = $el.data('val')
      if (val != null) {
        if (checked) _.sel.add(val)
        else _.sel.delete(val)
      }

      // 列数
      const columnIndex = $el.parents('td,th').index()

      // 表体checkbox
      if (columnIndex === 0) $el.parents('tr')[checked ? 'addClass' : 'removeClass']('data-table-row-selected')
      // _.headerCheck(columnIndex)

      // 延迟到change事件后触发，避免统计选择行数据差错
      _.handleSel()
    } catch {}
  }

  /**
   * 表头选择区域显示切换，统计选择行，触发选择改变事件，方便跨页统计
   */
  handleSel() {
    const _ = this
    try {
      const {el} = _
      // 选中行
      const rs = el.find('.data-table-row-selected')
      const len = rs.length
      // 改变表头操作面板
      const hd = el.find('.data-table-header')
      const hdSel = el.find('.data-table-header-selected')
      if (hd.length && hdSel.length) {
        if (len && !el.hasClass('data-table-has-checked')) el.addClass('data-table-has-checked')
        else if (!len && el.hasClass('data-table-has-checked')) el.removeClass('data-table-has-checked')

        // 选中数量，跨行选择数量与当前也选择数量不一致
        hdSel.find('.data-table-selected-count').text(len)
      }

      // 触发当前表选择事件，参数为选择行
      // 延迟到change事件后触发，避免跨页统计选择行数据差错
      setTimeout(() => {
        _.emit('local::select', rs)
      }, 10)
    } catch {}
  }

  /**
   * 选择表所有行，包括跨页
   * 表头checkbox只能选择当前页面所有行
   */
  cancelSel() {
    try {
      this.clearSel()
      // 每行checkbox
      // this.headerCheck()

      // 表头选择区
      this.handleSel()
    } catch (e) {
      log.err(e, 'cancelSel')
    }
  }

  /**
   * 清除选择（包括跨页），切换表头区及表头checkbox状态
   */
  clearSel() {
    const _ = this
    try {
      const {el} = _

      if (_.sel?.size) _.sel.clear()

      // 切换表头为非选择模式
      el?.removeClass('data-table-has-checked')
      const rs = el.find('.data-table-row-selected')
      if (rs.length) rs.removeClass('data-table-row-selected')

      // 更新header的checkbox
      // const col = 0
      // const ckb = this.el.findNode(`thead .checkbox-cell:nth-child(${col + 1}) input[type="checkbox"]`)
      // ckb.prop('indeterminate', false) // 部分选中
      const cks = el.find(`.checkbox-cell input[type="checkbox"]`)
      if (cks.length) cks.prop('checked', false)
    } catch (e) {
      log.err(e, 'clearSel')
    }
  }

  /**
   * 填充select option
   * 每次点击下拉时，检查关联参数是否变化，变化则重新获取选项
   * 根据选项，重新生成select 内容，不缓存
   * @param {*} r - 字段定义
   * @param {Dom} td
   * @param {Dom} sel - select
   * @param {string} value - 原数据
   * @param {number} idy - 表数据行索引
   * @returns
   */
  async fillOption(r, td, sel, value, idy = 0) {
    const _ = this
    try {
      const {source} = r
      let {param = {}} = source || {}
      // 查询参数 可引用其他字段值
      param = _.parseRef(param, idy)

      // 引用字段值是否变化
      let change
      const curParam = JSON.stringify(param)
      const lastParam = r.lastSourceParam
      // if (typeof lastParam !== 'string') lastParam = JSON.stringify(lastParam)

      if (curParam !== lastParam) {
        change = true
        r.lastSourceParam = curParam // 保存查询参数，避免重复查询
      }

      let {option} = r
      let {name} = param
      // if (name?.includes('${')) {
      //   const lastRefField = td.data('lastRefField') // 保存关联

      //   const match = name.match(/\$\{([^}]+)\}/)
      //   const ref = match?.[1]
      //   const i = _.getDataIdx({field: ref})
      //   if (i) {
      //     // 关联节点
      //     const n = _.tb.findNode(`[data-idx="${i}"]`)
      //     const v = n.findNode('span').html()
      //     if (v && v !== lastRefField) {
      //       change = true

      //       td.data('lastRefField', v) // 保存关联
      //       // 替换 'city:${province}'
      //       name = name.replace(`\${${ref}}`, v)
      //     }
      //   }
      // }

      // 关联字段变化或无选项，动态获取
      if (source && (change || !option?.length)) {
        sel.html('')
        // 数据字典查询
        // 默认 name = field
        if (!name) name = r.field

        // source.param.name = name
        option = await getOption(source, name)
        r.option = option // 保存选项到字段定义，避免重复查询
        let cnt = 0

        if (Array.isArray(option)) cnt = option.length
        else if (typeof option === 'object') cnt = Object.keys(option).length

        log({source, name, cnt}, 'fillOption.getOption')
      }

      // 插入当前值，保存后需清除
      if (!option && value) option = [value]

        if (option) {
          let key
          const span = td.find('span')
        const val = span.html() // 当前显示值
          // 添加选项
          let htm = []
        if (Array.isArray(option)) {
          if (!option.includes(value)) option.unshift(value) // 加入原始值

            htm = option.map(v => {
              let rt
              if (v === val)
                rt = (
                  <option selected value={v}>
                    {v}
                  </option>
                )
              else rt = <option value={v}>{v}</option>
              return rt
            })
        } else if (typeof option === 'object') {
          const has = Object.values(option).some(v => `${v}` === `${value}`)
          if (!has) option[value] = value // 加入原始值

            if (!val) {
              htm.push(
              <option selected value="">
                  请选择
                </option>
              )
            }

            for (const k of Object.keys(option)) {
              const v = option[k]
              if (v === val) {
                key = k
                htm.push(
                  <option selected value={k}>
                    {v}
                  </option>
                )
              } else htm.push(<option value={k}>{v}</option>)
            }
          }
        // r.option = option // 不保存到字段定义，避免污染

          sel.html(htm.join(''))

          if (key) sel.val(key)
          else sel.val(val)
        }
    } catch (e) {
      log.err(e, 'fillOption')
    }
  }

  clearOption() {}

  /**
   * 解析引用字段
   * @param {*} src
   * @param {number} [idy] - 表数据行索引
   * @param {*} [fv] - 字段值，外部传入可加快速度
   * @returns
   */
  /**
   * 递归检查对象中是否包含 ${} 引用
   * @param {*} obj 要检查的对象
   * @returns {boolean} 是否包含引用
   */
  hasRef(obj) {
    // 处理 null/undefined
    if (obj == null) return false
    // 字符串类型：直接检查
    if (typeof obj === 'string') {
      return /\$\{[^}]*\}/.test(obj)
    }
    // 对象类型（排除数组）：递归检查
    if (typeof obj === 'object' && !Array.isArray(obj)) {
      for (const k of Object.keys(obj)) {
        if (this.hasRef(obj[k])) return true
      }
    }
    return false
  }

  /**
   * 递归解析对象中的 ${} 引用（直接修改原对象）
   * @param {*} obj 要解析的对象
   * @param {*} fv 字段值对象
   * @returns {*} 解析后的值或对象
   */
  parseRefRecursive(obj, fv) {
    // 处理 null/undefined：直接返回
    if (obj == null) return obj
    // 字符串类型：检查并解析
    if (typeof obj === 'string') {
      if (/\$\{[^}]*\}/.test(obj)) {
        const val = Function('r', `return \`${obj}\``)(fv)
        log({src: obj, val}, 'parseRef')
        return val
      }
      return obj
    }
    // 对象类型（排除数组）：递归解析每个属性
    if (typeof obj === 'object' && !Array.isArray(obj)) {
      for (const k of Object.keys(obj)) {
        obj[k] = this.parseRefRecursive(obj[k], fv)
      }
      return obj
    }
    // 其他类型（数组、数字等）：直接返回
    return obj
  }

  parseRef(src, idy = 0, fv = null) {
    let R = src

    const _ = this
    try {
      const {data, opt, vals, fields} = _
      const {kv} = opt

      // 使用递归方法检查是否包含引用
      const ref = _.hasRef(src)

      if (ref) {
        if (!fv) {
        /** @type {*} */
          fv = {} // 获取当前行最新数据
        if (kv) {
          for (const d of data) {
            const {field, type} = d
              fv[field] = vals[0][field] ?? d.value
              if (['number', DataType.number].includes(type) && isNumber(fv[field])) fv[field] = Number(fv[field])
          }
        } else {
            for (const f of fields) {
            const {field, idx, type} = f
            const val = data[idy][idx]
              fv[field] = vals[idy][field] ?? val
              if (['number', DataType.number].includes(type) && isNumber(fv[field])) fv[field] = Number(fv[field])
            }
          }
        }

        // 使用递归方法解析引用（直接修改原对象）
        if (typeof src === 'object' && !Array.isArray(src)) {
          _.parseRefRecursive(src, fv)
          R = src
        } else {
          const val = Function('r', `return \`${src}\``)(fv)
          R = val
          log({idy, src, val}, 'parseRef')
        }
      }
    } catch (e) {
      log.err(e, 'parseRef')
    }
    return R
  }

  /**
   * 获得数据索引
   * @param {*} opts
   * @returns {number}
   */
  getDataIdx(opts) {
    let R
    const _ = this
    try {
      const {field} = opts
      if (field) {
        const idx = _.data.findIndex(v => v.field === field)
        if (idx >= 0) R = idx
      }
    } catch (e) {
      log.err(e, 'getData')
    }

    return R
  }

  /**
   * 加载插件
   * @param {*} cls
   * @param {*} [opts]
   */
  use(cls, opts) {
    const _ = this
    try {
      const {opt} = _

      _[cls.name] = cls
      _.uses.add({cls, opts})

      if (cls.name === 'Uploader' && opts?.upload) opt.upload = opts.upload
      else if (cls.name === 'Tabulate' && (opts?.getSelAll || opts?.saveEmbTb)) {
        opt.getSelAll = opts.getSelAll
        opt.saveEmbTb = opts.saveEmbTb
        opt.prjid = opts.prjid
        opt.upload = opts.upload
      } else if (cls.name === 'JsonView' && opts?.updateJson) opt.updateJson = opts.updateJson
    } catch (e) {
      log.err(e, 'use')
    }
  }

  /**
   * input type
   * @param {DataType|DataTypes} type
   */
  getInputType(type) {
    let R
    switch (type) {
      case DataTypes.text:
      case DataType.text:
        R = 'text'
        break
      case DataTypes.number:
      case DataType.number:
        R = 'text'
        break
      case DataTypes.date:
      case DataType.date:
        R = 'date'
        break
            // urlChange
            // case DataTypes.url:
            // case DataType.url:
            //     R = 'url'
            //     break
      case DataTypes.email:
      case DataType.email:
        R = 'email'
        break
      case DataTypes.tel:
      case DataType.tel:
        R = 'tel'
        break
      case DataTypes.password:
      case DataType.password:
        R = 'password'
        break
      case DataTypes.time:
      case DataType.time:
        R = 'time'
        break
      case DataTypes.datetime:
      case DataType.datetime:
        R = 'datetime-local'
        break
      case DataTypes.month:
      case DataType.month:
        R = 'month'
        break
      case DataTypes.week:
      case DataType.week:
        R = 'week'
        break
      case DataTypes.color:
      case DataType.color:
        R = 'color'
        break
    }

    return R
  }

  /*
   // 异步存储
   set(key, data, expires) {
   _storage.save({
   key: key,   // Note: Do not use underscore("_") in key!
   data: data,
   expires: expires
   });
   }

   // Promise同步方法

   getStore(key) {
      // load
      _storage.load({
        key: key,
        autoSync: true,
        syncInBackground: true
      }).then(data => {
        return data;
    }).catch(err => {
        console.warn(err);
      return null;
    })
    }

    // async 的写法
    async get(key) {
      try {
        let data = await storage.load({
          key: key
        });
        return data;
      }
      catch (err) {
        console.warn(err);
        return null;
      }
    }
  */
  // Chrome、Safari 阻止浏览器的默认事件，实现 全选
  mouseupCell(evt) {
    const ev = evt || window.event
    ev.preventDefault()
  }
  addHandler() {
    const data = this.tabulate.getData()
    this.tabulate.addRow()
  }
  saveTable() {
    this.tabulate.saveTable()
  }

  /**
   * 初始化表格编辑器
   */
  async editModeTable() {
    const _ = this
    try {
      const {page, opt, data} = _
    const tds = _.tb.find('td[data-idx]')
    console.log(tds, 'tds')
    //! 应该根据field 创建，支持多个内嵌表格编辑
    //! 需判断是否已创建，避免重复创建
    //! 应该根据字段类型(内嵌表)创建，而不是在编辑模式没有内嵌表也创建
      // if (_.hasTable && !_.tabulate && _.Tabulate) {
      if (_.hasTable) {
        if (opt.newEdit) {
        const dvs = _.tb.find('div.data-table')
        for (const dv of dvs) {
          const $dv = $(dv)
          const name = $dv.attr('name')
          const {wiaDataTable: dtb, wiaEditTable: etb} = dv

          if (!etb) {
              const {head} = dtb
              const {api} = head[0]
              if (api.param) api.param = _.parseRef(api.param)
            dv.wiaEditTable = makeEdit(page, {
              el: $dv,
              name,
                head,
              data: dtb.data,
                use: [..._.uses],
    })
    } else {
            etb.show()
            dtb.hide()
          }
        }
      } else {
          _.tabulate = new _.Tabulate({
            containerName: 't-table',
            addButtonName: 'add-button',
            targetBox: _.tb.tag('tbody')[0].querySelectorAll('.data-table'),
            baseTableInfo: _.baseTableInfo, // 基础表格信息对象
            getSelAll: opt.getSelAll, // 获取公司数据的方法
            saveEmbTb: opt.saveEmbTb, // 保存表格的接口方法
            viewid: opt.viewid,
            prjid: opt.prjid,
            upload: opt.upload,
          })
        }
      } else {
      const tTableDivs = new Set()
      const dataTables = _.tb.tag('tbody')[0].querySelectorAll('.data-table')
      dataTables.forEach(table => {
        table.style.display = 'none'
        // 获取当前 .data-table 的父节点（兄弟元素的共同容器）
        const parent = table.parentNode
        // 在父节点中查找 name="t-table" 的 div
        const tTableDiv = parent.querySelector('div[name="t-table"]')
        const addButton = parent.querySelector('button[name="add-button"]')
        // 找到后添加到集合（去重，避免重复元素）
        if (tTableDiv) {
          tTableDiv.style.display = 'block'
          addButton.style.display = 'block'
          tTableDivs.add(tTableDiv)
        } else {
          _.tabulate.destroyTabulateInstance(_.tabulate)
      _.tabulate = new _.Tabulate({
        containerName: 't-table',
        addButtonName: 'add-button',
        targetBox: _.tb.tag('tbody')[0].querySelectorAll('.data-table'),
        baseTableInfo: _.baseTableInfo, // 基础表格信息对象
        getSelAll: opt.getSelAll, // 获取公司数据的方法
        saveEmbTb: opt.saveEmbTb, // 保存表格的接口方法
        viewid: opt.viewid,
        prjid: opt.prjid,
            upload: opt.upload,
      })
  }
      })
    }
    } catch (e) {}
  }

  /**
   * 编辑模式
   */
  edit() {
    try {
    const _ = this
      if ( _.state === State.json) {
        _.tb.parent().find('.json-view-box').hide()
        _.tb.show()
      }
      _.state = State.edit
    _.tb.tag('tbody').addClass('etEdit').removeClass('etView')
    _.editModeTable()

      editAttach(_.tb)
      chip.edit(_.tb)

      // _.bind()
    } catch (e) {
      log.err(e, 'edit')
    }
  }

  /**
   * @param {{ etb: EditTable; dtb: any; path: string; no: string; tab?: string; name: string; icon?: string; card?: HTMLElement; tb?: JQuery; data: any[]; }} data
   */
  json(data) {
    const _ = this
    try {
      _.state = State.json
      _.tb.hide()
      const jsonView = _.tb.parent().find('.json-view-box')
      if (jsonView.dom) jsonView.show()
      else {
        _.jsonView = new _.JsonView({
          parent: _.tb.parent(),
          data: data,
          source: _.opt.updateJson,
        })
      }

      // console.log(_.tb.parent().parent().data('tab'), '_.tb.parent')
      // _.bind()
    } catch (e) {
      log.err(e, 'json')
    }
  }

  /**
   * 浏览模式，禁止编辑
   * 数据未保存到data，可取消
   */
  view() {
    const _ = this
    try {
      if (_.state === State.json) {
        _.tb.parent().find('.json-view-box').hide()
        _.tb.show()
      }
      _.state = State.view
    _.tb.tag('tbody').addClass('etView').removeClass('etEdit')
      _.tabulate?.togglePreview()
      viewAttach(_.tb)
      chip.view(_.tb)

    if (_.data) {
      const tds = _.tb.find('td[data-idx]')
      for (const td of tds.get()) {
          try {
        const $td = $(td)
        const idx = $td.data('idx') // 数据索引
        const d = _.data[idx]
        const {type, option} = d || {}
        if ((type === DataType.search || type === DataTypes.search) && _.Autocomplete) {
          const dvAc = $td.find('.autocomplete')
          dvAc?.hide()
          const span = $td.find('span')
          span.show()
        } else if (
          type !== DataType.checkbox &&
          type !== DataTypes.checkbox &&
          type !== DataType.radio &&
          type !== DataTypes.radio &&
          type !== DataType.attach &&
          type !== DataTypes.attach &&
          type !== DataType.table &&
          type !== DataTypes.table &&
          type !== DataType.view &&
          type !== DataTypes.view &&
          type !== DataType.page &&
          type !== DataTypes.page
        ) {
          const span = $td.find('span')
          if (span) {
            span.removeClass('edit')
            span.show()
          }
              let tx = $td.find('input')
              if (!tx.dom) tx = $td.find('select')
              if (tx.dom) tx.hide()
            }
          } catch (e) {
            log.err(e, 'view')
        }
      }
    }
    } catch (e) {
      log.err(e, 'view')
    }
  }

  /**
   * 保存修改数据到data，并切换到浏览视图
   */
  async save() {
    const _ = this
    try {
      const {opt} = _
      const {kv} = opt

      // 保存 json 代码
      if (_.state === State.json) {
        const rt = await _.jsonView.saveJson()
        if (rt) {
          const jsonView = _.tb.parent().find('.json-view-box').hide()
          _.tb.show()
          _.state = State.view
        }
        return
      }

      _.state = State.view

      _.tb.tag('tbody').addClass('etView').removeClass('etEdit')
      viewAttach(_.tb)
      chip.view(_.tb)

      if (!kv) {
        _.saveTb()
      }

      // if (_.hasTable && _.tabulate) _.tabulate.saveTable()
      if (_.hasTable) {
        const dvs = _.tb.find('div.data-table')
        for (const dv of dvs) {
          // @ts-expect-error
          const {wiaDataTable: dtb, wiaEditTable: etb} = dv
          if (dtb && etb) {
            etb?.save()
            etb?.hide()
            dtb?.show()
          }
        }
      }

    if (_.data) {
      const tds = _.tb.find('td[data-idx]')
        for (const td of tds) {
          try {
        const $td = $(td)
        const idx = $td.data('idx') // 数据索引
        const d = _.data[idx]
        const {type, option} = d || {}
        if ((type === DataType.search || type === DataTypes.search) && _.Autocomplete) {
          const span = $td.find('span')

          // span.eq(0).html(value)
          const tx = $td.find('input')
          if (tx) {
            const val = tx.val()
            // 设置 原始值
            d.value = val
            $td.data('value', val)
            const dvAc = $td.find('.autocomplete')
            dvAc?.hide()
          }

          span.show()
        } else if (type === DataType.checkbox || type === DataTypes.checkbox) {
          const val = []
          const ns = $td.find('input[type=checkbox]')
          for (const n of ns.get()) {
            if (n.checked) {
              val.push($(n).val())
              break
            }
          }

          // 设置 原始值
          d.value = val
          $td.data('value', val)
        } else if (type === DataType.radio || type === DataTypes.radio) {
          let val
          const ns = $td.find('input[type=radio]')
          for (const n of ns.get()) {
            if (n.checked) {
              val = $(n).val()
              break
            }
          }
          // 设置 原始值
          d.value = val
          $td.data('value', val)
                        }
                        // urlChange
                        else if (type === DataType.url || type === DataTypes.url) {
                            // urlChange
              const span = $td.find('span')
              const tx = $td.find('input')
                            if (span) {
                span.eq(0).find('a').attr('href', tx.val())
                span.removeClass('edit')
                span.show()
                            }
                            if (tx.dom) {
                const val = tx.val()
                                // 设置 原始值
                d.value = val
                $td.data('value', val)
                tx.hide()
                        }
            } else if (
          type !== DataType.attach &&
          type !== DataTypes.attach &&
          type !== DataType.table &&
          type !== DataTypes.table &&
          type !== DataType.view &&
          type !== DataTypes.view &&
          type !== DataType.page &&
          type !== DataTypes.page
        ) {
          const span = $td.find('span')
          if (span) {
            span.removeClass('edit')
            span.show()
          }

              let tx = $td.find('input')
              if (!tx.dom) tx = $td.find('select')

              if (tx.dom) {
            const val = tx.val()
            // 设置 原始值
            d.value = val
            $td.data('value', val)

            tx.hide()
          }
        }
          } catch (e) {
            log.err(e, 'save')
          }
      }
    }
    } catch (e) {
      log.err(e, 'save')
    }
  }

  async saveTb() {
    const _ = this
    try {
      const {data, cfg, opt} = _
      const {checkbox: ck, api} = cfg

      const up = _.getVal()
      const del = [..._.del]

      if (up?.length || del?.length) {
        // const add = [..._etBase.add]
        for (const u of up) {
          const {idy, idx} = u
          if (ck === 'index') u.id = data[idy].index
          else if (ck?.length) u.id = data[idy][ck[0]]
        }
        up.sort((v1, v2) => v1.fieldid - v2.fieldid)

        let add = up.filter(v => v.id[0] === '+')
        let update = up.filter(v => v.id[0] !== '+')

        update = groupById(update)
        add = groupById(add)

        const {url, param} = api
        let {token} = api
        token = token ?? 'token'

        if (url) {
          const tk = token ? $.store.get(token) : ''
          const rs = await $.post(url, {...param, update, add, del}, {'x-wia-token': tk})
          console.log({rs}, 'editBase save')
        }
      }
    } catch (e) {
      log.err(e, 'saveTb')
    }
  }

  hide() {
    const {el} = this
    el.hide()
  }

  show() {
    const {el} = this
    el.show()
  }

  /**
   * 取消修改，还原
   * 根据data重置组件
   */
  cancel() {
    const _ = this
    try {
      const {opt} = _
      const {kv} = opt

      if (_.state === State.json) {
        _.tb.parent().find('.json-view-box').hide()
        _.tb.show()
      }
      _.state = State.view

    _.tb.tag('tbody').addClass('etView').removeClass('etEdit')
      viewAttach(_.tb)
      chip.view(_.tb)

      if (kv) {
        // 存在内嵌表格
        if (_.hasTable) {
          // _.tabulate?.togglePreview()
          const dvs = _.tb.find('div.data-table')
          for (const dv of dvs) {
            // @ts-expect-error
            const {wiaDataTable: dtb, wiaEditTable: etb} = dv
            if (dtb && etb) {
              etb?.cancel()
              etb?.hide()
              dtb?.show()
        }
          }
      }

        _.setKv()
      } else {
        // cancel add
        _.newNum = 0
        for (const v of _.add) _.delRow(v)

        _.cancelSel()
        _.del.clear()
        _.setView()
    }

      // if (_.data) {
      //   const tds = _.tb.find('td[data-idx]')
      //   for (const td of tds) {
      //     try {
      //       const $td = $(td)
      //       const idx = $td.data('idx') // 数据索引
      //       const d = _.data[idx]
      //       // const value = $td.data('value') // 原始值
      //       const value = $td?.attr('data-value') // 数据原值 data() 会自动转换 json 字符串
      //       const {type, option} = d || {}
      //       if ((type === DataType.search || type === DataTypes.search) && _.Autocomplete) {
      //         const dvAc = $td.find('.autocomplete')
      //         dvAc?.hide()
      //         const span = $td.find('span')
      //         span.eq(0).html(value)
      //         span.show()
      //       } else if (type === DataType.checkbox || type === DataTypes.checkbox) {
      //         const ns = $td.find('input[type=checkbox]')
      //         for (const n of ns.get()) {
      //           const val = $(n).val()
      //           n.checked = value.includes(val)
      //         }
      //       } else if (type === DataType.radio || type === DataTypes.radio) {
      //         const ns = $td.find('input[type=radio]')
      //         for (const n of ns.get()) {
      //           const val = $(n).val()
      //           n.checked = value === val
      //         }
      //       } else if (type === DataType.attach || type === DataTypes.attach) {
      //         // 取消新增
      //         // uploader 维护 input
      //         $td.dom.uploader.clear() // 清空 input 和 uploader
      //       }
      //       // urlChange
      //       else if (type === DataType.url || type === DataTypes.url) {
      //         const span = $td.find('span')
      //         if (span.dom) {
      //           span.removeClass('edit')
      //           span.eq(0).find('a').attr('href', value)
      //           span.show()
      //         }
      //         const tx = $td.find('input')
      //         if (tx.dom) {
      //           tx.val(value)
      //           tx.hide()
      //         }
      //       } else if (
      //         type !== DataType.table &&
      //         type !== DataTypes.table &&
      //         type !== DataType.view &&
      //         type !== DataTypes.view &&
      //         type !== DataType.page &&
      //         type !== DataTypes.page
      //       ) {
      //         const span = $td.find('span')
      //         if (span.dom) {
      //           span.html(value)
      //           span.removeClass('edit')
      //           span.show()
      //         }
      //         let tx = $td.find('input')
      //         if (!tx.dom) tx = $td.find('select')
      //         if (tx.dom) {
      //           tx.val(value)
      //           tx.hide()
      //         }
      //       }
      //     } catch (e) {
      //       log.err(e, 'cancel')
      //     }
      //   }
      // }
    } catch (e) {
      log.err(e, 'cancel')
    }
  }

  /**
   * 样式改为编辑状态,支持 input、span
   * textarea 不能自适应行高，不再支持 textarea，使用可编辑span替代
   * span 不支持 onchange，使用 viewCell 获取更改值
   * 如填入数据与原数据不同，cell 增加 edChange 样式
   * @param {HTMLElement} tx - input 或 span 组件
   * @param {*} sel 下拉列表, 下拉选择时，sel 为 true
   */
  editCell(tx, sel) {
    const _ = this
    const {opt} = _
    if (tx && _.state === State.edit) {
      const $tx = $(tx)

      // 点击同一网格编辑直接返回
      if (!sel && this._editCell && tx === this._editCell) return

      if (!opt.editTag.includes(tx.tagName.toLowerCase()))
        //  && tx.tagName !== 'SPAN') // || tx.type != "text")
        return

      // 最后编辑行
      this.editRow = tool.getUpperObj(tx, 'TR')
      // 最后编辑的对象
      this.editTx = tx

      // 去掉选择行样式为缺省奇偶样式
      if (this._selRow) {
        this.setRowClass(this._selRow, '')
        this._selRow = null
      }

      if (tx.tagName === 'SPAN') {
        // 替换提示字符
        if (/^~~.+~~/.exec(tx.innerHTML)) tx.innerHTML = tx.innerHTML.replace(/^~~.*~~/, '')

        // tx.scrollIntoView(true);
        // tx.scrollTop = 50;
      } else if (tx.tagName === 'INPUT') {
        // tool.setClass(this._editCell, '')
        // tool.setClass(tx, 'etCellEdit')
        // $tx.addClass('fb-input', true)
        $tx.addClass('ds-input', true)

        // input 需全选方便替换!
        if (!sel) {
          tx.focus()
          // 全选
          tx.select()
        }
      }

      // 记录当前正在编辑单元
      this._editCell = tx
    }
  }

  /**
   * 浏览状态,去掉编辑样式
   * 对于 span,不会触发 onchange 事件,在这里将 span值同步给隐藏 input,方便向服务器端提交!
   * @param {HTMLElement} tx
   */
  viewCell(tx) {
    if (!tx) return

    // 下列选项会触发 viewCell
    if (tx.getAttribute('inputing') && tx.getAttribute('inputing') === '1')
      // 下拉选择时，保持编辑状态
      return

    // 去掉编辑样式
    if (tx.tagName === 'INPUT') tool.setClass(tx, 'etCellView')
    // span的值赋给 input, span无法触发 onchange 事件
    else if (tx.tagName === 'SPAN') {
      const txTo = tool.childTag(tx.parentNode, 'input')

      let val = tx.innerHTML.replace(/^~~.*~~/, '')
      // 对输入字符进行处理
      val = val.replace(/<br>/g, '\n')
      // val = val.replace(/&gt;/g, '>');
      // val = val.replace(/&lt;/g, '<');
      val = val.replace(/&nbsp;/g, ' ')

      if (!val || /^[\s\n\r]+$/.exec(val)) {
        if (tx.className === 'imgTitle')
          // style.textAlign === 'center')
          tx.innerHTML = '~~点击输入标题~~'
        else tx.innerHTML = '~~点击输入~~<br><br>'

        if (txTo) {
          const img = tool.childTag(txTo.parentNode, 'img')
          if (img) {
            txTo.value = tool.format('![%s](%s)', '', img.getAttribute('src'))
          } else txTo.value = ''
        }
      } else if (txTo) {
        // ,号干扰后台数据读取，转换为 \~，后台读取后再转换
        // val = tx.innerHTML.replace(/,/g, '\~');
        const img = tool.childTag(txTo.parentNode, 'img')
        if (img) {
          txTo.value = tool.format('![%s](%s)', val || '', img.getAttribute('src'))
        } else txTo.value = val
      }
    }

    this._editCell = null
  }

  // 更改 行 样式
  setRowClass(row, className) {
    if (!row) return

    // 恢复原始 样式
    if (className) tool.setClass(row, className)
    else {
      tool.setClass(row, '')
      /*
      if (row.className.indexOf('Odd') > -1)
        tl.setClass(row, 'etRowOdd');
      else
        tl.setClass(row, 'etRowEven');
*/
    }
  }

  // 对指定 列，设定 只读或非只读，
  readOnly(tb, names, val) {
    try {
      const tbody = tool.tags(tb, 'TBODY')[0]
      const txs = tool.tags(tbody, 'INPUT')
      for (let i = 0; i < txs.length; i++) {
        // 排除  隐藏列
        if (txs[i].type === 'text') {
          txs[i].readOnly = !val
          for (let j = 0; j < names.length; j++) {
            if (txs[i].name === `tx${names[j]}`) txs[i].readOnly = val
          }
        }
      }
    } catch (e) {
      alert(e.message)
    }
  }

  // 对指定 列，设定隐藏
  hideCol(tb, names) {
    try {
      for (let i = 0; i < names.length; i++) {
        const th = tool.id(`th${names[i]}`)
        if (th) {
          th.style.display = 'none'
        }
      }

      // 在线编辑模版必须 带 tbody，否则工作不正常
      // ??? 为何屏蔽 tbody
      const tbody = tool.tags(tb, 'TBODY')[0]
      const txs = tool.tags(tbody, 'INPUT')
      for (let i = 0; i < txs.length; i++) {
        // 排除  隐藏列
        if (txs[i].type === 'text') {
          for (let j = 0; j < names.length; j++) {
            if (txs[i].name === `tx${names[j]}`) {
              const td = tool.getUpperObj(txs[i], 'TD')
              if (td) td.style.display = 'none'
            }
          }
        }
      }
    } catch (e) {
      alert(e.message)
    }
  }

  // 对指定 列，设定显示
  showCol(tb, ns) {
    try {
      for (let i = 0; i < ns.length; i++) {
        const th = tool.id(`th${ns[i]}`)
        if (th) {
          th.style.display = ''
        }
      }

      // 在线编辑模版必须 带 tbody，否则工作不正常
      // ??? 为何屏蔽 tbody
      const tbody = tool.tags(tb, 'TBODY')[0]
      const txs = tool.tags(tbody, 'INPUT')
      for (let i = 0; i < txs.length; i++) {
        // 排除  隐藏列
        if (txs[i].type === 'text') {
          for (let j = 0; j < ns.length; j++) {
            if (txs[i].name === `tx${ns[j]}`) {
              const td = tool.getUpperObj(txs[i], 'TD')
              if (td) td.style.display = ''
            }
          }
        }
      }
    } catch (e) {
      alert(e.message)
    }
  }

  lightonRow(row) {
    const r = tool.getUpperObj(row, 'TR')
    if (!r || r === this._selRow) return

    // 当前点击行高亮度显示
    if (r.className.indexOf('Odd') > -1) this.setRowClass(r, 'etRowSelOdd')
    else this.setRowClass(r, 'etRowSelEven')

    // 将所有未被选中的行取消高亮度现实
    this.setRowClass(this._selRow, '')
    this._selRow = r
  }

  // 指定表的指定列，指定数据删除
  deleteData(tb, name, val) {
    const txs = document.getElementsByName(name)
    for (let i = 1; i < txs.length; i++) {
      if (txs[i].value === val) {
        this.delRow(tb, i)
        i--
      }
    }
  }

  /**
   * 行选择,点击选择当前行,便于删除行
   * 支持Checkbox 多选行，用于批量行操作
   * @param obj
   */
  selRow(obj, ev) {
    if (!obj) return

    // if ( ev )
    //  ev.preventDefault();

    const row = tool.getUpperObj(obj, 'TR')
    if (row) {
      if (obj.tagName === 'TD') {
        if (row !== this._selRow) this._selRow = row
      } else {
        const tbody = tool.getUpperObj(row, 'TBODY')
        const tb = tbody.parentNode
        const th = tool.tags(tb, 'TH')[0]

        if (tool.lastChild(tool.firstChild(row)).value) {
          tool.lastChild(th).value = tool.lastChild(th).value ? `${tool.lastChild(th).value},` : ''
          if (obj.checked) tool.lastChild(th).value += tool.lastChild(tool.firstChild(row)).value
          else tool.lastChild(th).value = tool.lastChild(th).value.replace(`${tool.lastChild(tool.firstChild(row)).value},`, '')
        }
      }
    }
  }

  /**
   * 删除选择或最后编辑行，或当前行，一次只能删除一行
   * @param {*} [val]
   * @param {*} [tb]
   * @param {number} [iRow] 指定的行数
   * @returns {number}  返回 剩下的行数
   */
  delRow(val, tb, iRow) {
    const R = 0

    const _ = this
    try {
      const {tb, data, cfg} = _
      const {hide, checkbox: ck} = cfg

      // 删除tr
      const txs = tb.find(`tr input[data-val="${val}"]`)

      for (const tx of txs) {
        const row = $(tx).upper('tr')
        row?.remove()
      }

      // 清除新增数据
      if (val[0] === '+') {
        _.add.delete(val)
        for (let i = data.length - 1; i >= 0; i--) {
          const r = data[i]
          if ((ck === 'index' && r.index === val) || (ck?.length && r[ck[0]] === val)) data.splice(i, 1)
      }
      } else _.del.add(val)

      _.el.find('.data-table-count')?.text(_.data.length - _.del.size)

      // if (!tb) return 0
      // const tbody = tool.tags(tb, 'TBODY')[0]
      // const rows = tool.tags(tbody, 'TR')

      // if (rows.length === 0) return

      // let delRow = null

      // if (tb && iRow)
      //   delRow = tb.rows[iRow + 1] // 删除选择行
      // else delRow = this._selRow

      // // 没有选择行,直接删除最后编辑行
      // if (!delRow && this.editRow) {
      //   delRow = this.editRow
      //   // x('txInfo').value = 'this._editRow';
      // }

      // if (!delRow) delRow = rows[rows.length - 1]

      // if (!delRow) return

      // if (this._selRow) {
      //   this.setRowClass(this._selRow, '')
      //   this._selRow = null
      // }

      // if (this._editCell) {
      //   tool.setClass(this._editCell, '')
      //   this._editCell = null
      // }

      // const th = tool.tags(tb, 'TH')[0]

      // if (delRow.childElementCount > 0 && tool.lastChild(tool.firstChild(delRow)).value) {
      //   // 记录删除ID
      //   tool.lastChild(th).value = tool.lastChild(th).value ? `${tool.lastChild(th).value},` : ''
      //   tool.lastChild(th).value += tool.lastChild(tool.firstChild(delRow)).value
      // }

      // if (delRow === this._selRow) this._selRow = null

      // if (delRow === this.editRow) {
      //   this.editRow = null
      //   this.editTx = null
      // }

      // let preRow = delRow.previousSibling
      // let span = tool.tags(delRow, 'span')[0]
      // if (delRow.parentNode) delRow.parentNode.removeChild(delRow)

      // // span 全屏编辑,没有数据,自动增加一行
      // if (span) {
      //   // 返回剩下行数
      //   R = tool.tags(tbody, 'TR').length
      //   if (!R) {
      //     preRow = this.addRow(tb, '~~点击输入~~\n\r\n\r')
      //     R = 1
      //   }

      //   if (preRow) {
      //     span = tool.tags(preRow, 'span')[0]
      //     if (span) tool.cursorEnd(span)
      //   }
      // }
    } catch (e) {
      console.error(`deleteRow exp:${e.message}`)
    }

    return R
  }

  /**
   * 添加行
   * @param {*} [tp] - 行模板，不传取thead中的最后一个child
   * @param {string} [txt] - 文本内容
   * @param {HTMLElement} [node] - 指定节点之前
   * @returns {HTMLElement}
   */
  addRow(tp, txt, node) {
    const _ = this
    try {
      const {tb, cfg, fields} = _
      const {hide, checkbox: ck} = cfg

      if (!fields?.length) return

      _.newNum++
    _.rowNum++

      let len = fields.length
      if (hide?.length) len += hide.length

      const data = Array(len).fill('')
      const val = `+${_.newNum}`
      if (ck === 'index') data.index = val
      else if (ck?.length) data[ck[0]] = val

      _.add.add(val)

      _.addView([data])

      // const thead = tb.tag('THEAD')
      // let row
      // if (!tp) row = thead.lastChild().clone()
      // else row = tp.clone()

      // row.data('rowNum', _.rowNum)

      // const span = row.tag('span')
      // if (span) span.innerHTML = txt || ''

      // row.show()

      // const tbody = tb.tag('tbody')

      // tbody.dom.insertBefore(row.dom, node || null)

      // _.editRow = row.dom
      // _.editTx = row.tag('span') || row.tag('input')
      // _._selRow = row.dom
      // _._editCell = null
    } catch (e) {}
    // return row
  }

  /**
   * 行列数据填充，创建tr、td，填充 v 值到 span
   * fillKv 的简化版本：无Label、无多值
   * @param {*[]} r - 行字段数组
   * @param {number} idy - 数据数组行索引
     */
  fillRow(r, idy) {
    const _ = this

    try {
      const tbody = _.tb.tag('TBODY')
      const thead = _.tb.tag('THEAD')

      const tr = thead.lastChild().clone()
      // const tr = $(document.createElement('tr'))
      // <input type="checkbox" data-val="${r[0]}">
      // 替换 checkbox data-val
      const ck = tr.find('input[type="checkbox"]')
      if (ck) {
        let val = ck.data('val')
        if (/\$\{[^}]*\}/.test(val)) {
          val = Function('r', `return \`${val}\``)(_.data[idy])
          ck.data('val', val)
        }
      }

      /** @type {*} */
      const fv = {} // 获取当前行每个字段最新值
      for (const c of r) {
        const {field, type} = c
        fv[field] = _.vals[idy][field] ?? c.value
        if (['number', DataType.number].includes(type) && isNumber(fv[field])) fv[field] = Number(fv[field])
      }

      let idx = -1
      // 列赋值
      for (const c of r) {
        idx++

        try {
          const {field} = c
          let {name, type, value, unit, option, row, align} = c

          // 指定字段调试
          if (field === 'debug') debugger

          type = type ?? DataType.text
          value = _.getKv(c, fv)

          const val = value ?? ''

          const td = document.createElement('td')
          const $td = $(td)

          if ([DataType.html, DataTypes.html].includes(type)) td.innerHTML = `${val}`
          else if ([DataType.attach, DataTypes.attach].includes(type)) {
            fillAttach(_, value, td, null, c.read, idx, idy)
          } else {
            if ([DataType.checkbox, DataTypes.checkbox].includes(type)) {
              const htm = option?.map(v => {
                const rt = (
                  <label class="checkbox">
                    <input type="checkbox" name={field} value={v} checked={`${val.includes(v) ? 'true' : 'false'}`} />
                    <i class="icon-checkbox"></i>
                    {v}
                  </label>
                )
                  .replaceAll('checked="true"', 'checked')
                  .replaceAll('checked="false"', '')

                return rt // + v
              })
              if (htm) td.innerHTML = `<span name="tx" class="etCheckbox">${htm.join('')}</span>`
            } else if ([DataType.radio, DataTypes.radio].includes(type)) {
              const htm = option?.map(v => {
                const rt = (
                  <label class="radio">
                    <input type="radio" name={field} value={v} checked={`${val === v ? 'true' : 'false'}`} />
                    <i class="icon-radio"></i>
                    {v}
                  </label>
                )
                  .replaceAll('checked="true"', 'checked')
                  .replaceAll('checked="false"', '')

                return rt // + v
              })

              if (htm) td.innerHTML = `<span name="tx" class="etRadio">${htm.join('')}</span>`
            }
            // urlChange
            else if ([DataType.url, DataTypes.url].includes(type)) {
              // urlChange
              td.innerHTML = `<span title="${val}" name="tx" class="etValue" style="display: flex;align-items: center">
                                        <i class="icon wiaicon" style="color:red;font-size: 16px;">&#xe61b;</i>
                                        <a href="${val}" target="_blank" style="cursor:pointer;">点击跳转链接</a>
                                    </span>`
            } else if ([DataType.chip, DataTypes.chip].includes(type)) {
              const htm = val?.map(v => {
                // <a class="chip-delete"></a>
                const rt = (
                  <div class="chip">
                    <div class={`chip-media bg-color-${v.color}`}>{v.media}</div>
                    <div class="chip-label">{v.val}</div>
                  </div>
                )

                return rt // + v
              })
              if (htm) td.innerHTML = `<span name="tx" class="etChip">${htm.join('')}</span>`
            } else if (unit)
              td.innerHTML = `<div class=etNumber><span name="tx" class="etValue">${val}</span><span class="etSuffix">${unit}</span></div>`
            else {
              td.innerHTML = `<span name="tx" class="etValue">${val ?? ''}</span>`

              if (type === DataType.texts || type === DataTypes.texts) $td.find('span').addClass('etClamp')
            }

            // else td.innerHTML = `<input name="tx" class="etValue dy-input" value=${val}></input>`

            //  txs[i].setAttribute('idx', '') // 每行编辑节点设置idx属性，对应名称与数据索引，方便获取、设置节点数据
            $td.data('idx', idx) // td 保存 字段索引
            $td.data('idy', idy) // td 保存 数据行索引
            $td.data('value', val) // td 保存 原值
          }

          tr.append(td)
        } catch (e) {
          log.err(e, 'fillRow')
        }
        // 插入到空行前
        tbody.dom.insertBefore(tr.dom, null)
        tr.attr('name', tr.attr('name').replace(/-tp$/, '-data'))
        tr.show()
      } // for
      // 插入到空行前
      tbody.dom.insertBefore(tr.dom, null)
    } catch (e) {
      log.err(e, 'fillRow')
    }
  }

  clearRow(tb) {
    if (!tb) {
      alert('请传入table对象！')
      return
    }

    const tbody = tool.tags(tb, 'TBODY')[0]
    while (tbody.childNodes.length > 0) tbody.removeChild(tbody.childNodes[0]) // 需测试！
    // updated by dwzhao 2011/05/15
    // $(tbody).empty();
  }

  /**
   * 计算空行数，第一列为序号，第二列为空，作为空行
   * @param obj
   * @returns {*}
   */
  getNullRow(obj) {
    let rs = {row: null, cnt: 0}

    let nullRow = null
    let nullCnt = 0
    for (let i = 0; i < obj.childNodes.length; i++) {
      const nd = obj.childNodes[i]
      let val = ''
      try {
        // 第二列,不管第一列,如果去掉第一列,需修改当前代码!!!
        const tx = tool.firstChild(nd.cells[1])
        if (tx.tagName === 'IMG') val = 'img'
        else if (tx.tagName === 'SPAN') val = tool.trim(tx.innerHTML)
        else if (tx.tagName === 'INPUT') val = tool.trim(tx.value)
        else val = tool.trim(tx.nodeValue)
      } catch (e) {
        console.error(`getNullRow exp:${e.message}`)
      }

      if (nd.nodeType === 1 && !val) {
        nullCnt++
        if (!nullRow) nullRow = nd
      }
    }

    if (nullRow) rs = {row: nullRow, cnt: nullCnt}

    return rs
  }

  /**
   * 每行编辑节点设置idx属性，对应名称与数据索引，方便获取、设置节点数据
   * @param {*} txs
   * @param {*} names
   */
  setIdx(txs, names) {
    // 对 Input 添加 索引，方便操作
    for (let i = 0; i < txs.length; i++) {
      txs[i].setAttribute('idx', '')
      // 与名称对应上
      for (let j = 0; j < names.length; j++) {
        if (txs[i].tagName === 'INPUT') {
          if (txs[i].name === `tx${names[j]}`) txs[i].setAttribute('idx', j)
        } else {
          if (txs[i].getAttribute('name') === `tx${names[j]}`) txs[i].setAttribute('idx', j)
        }
      }
    }
  }

  /**
   * 设置值,以input为基准,可以带 span
   * 
   * @param {*} txs
   * @param {*} values - type pattern placeholder readonly value
      ['readonly=readonly;value=*规格', 'placeholder=如2斤、2袋（50g/袋）(必填);value=;'],
   * @returns {*}
   */
  setVal(txs, values) {
    // 列赋值
    for (let j = 0; j < txs.length; j++) {
      // 获得节点idx数据索引，通过idx与 values 对应
      let idx = txs[j].getAttribute('idx')
      if (idx === null || tool.trim(idx) === '' || isNaN(idx)) continue

      idx = Number(idx)
      if (values[idx] || values[idx] === 0) {
        const tx = txs[j]
        let val = values[idx]

        // 浏览状态
        if (tx.tagName === 'SPAN') {
          // 图片
          let rgs = /!\[(.*)]\s*\((.+)\)/.exec(val)
          if (rgs) {
            // 图片赋值
            const img = document.createElement('img')
            img.src = rgs[2]
            tool.setClass(img, 'etImg')
            tx.parentNode.insertBefore(img, tx.parentNode.childNodes[0])
            tx.innerHTML = rgs[1] || ''
            // sp.placeholder = '点这里输入标题';
            tool.setClass(tx, 'imgTitle')
          } else {
            const v = `;${val};`
            rgs = /;value=([^;]*);/.exec(v)
            if (rgs) tx.innerHTML = rgs[1] || ''
            else {
              rgs = /^~~(.*)~~/.exec(val)
              // 提示符 ~~请输入价格~~
              if (rgs) {
                tx.innerHTML = ''
              } else tx.innerHTML = val
            }
            /*
            rgs = /^~~(.*)~~$/.exec(val);
            // 提示符 ~~请输入价格~~
            if (rgs) {
              tx.innerHTML = '';
            } else {
              rgs = /^\*{2,}([^\*]+)\*{2,}$/.exec(val);
              if (rgs)  // 后面的值必填 ***价格***
                tx.innerHTML = rgs[1];
              else
                tx.innerHTML = val;
            }
*/
          }
          // 回车换行
          tx.innerHTML = tx.innerHTML.replace(/\r\n/g, '\n').replace(/[\r\n]/g, '<br>')
          tx.style.webkitUserModify = 'read-only'
        } else {
          // span、input 同时存在，Span 同步赋值,如使用 span显示,input提交,input是隐藏的!
          const sp = tool.childTag(tx.parentNode, 'span')
          if (tx.type === 'hidden' && sp) {
            tx.value = val
            val = tx.value.replace(/\r\n/g, '\n').replace(/[\r\n]/g, '<br>')

            // 图片
            const rgs = /!\[(.*)]\s*\((.+)\)/.exec(val)
            if (rgs) {
              // 图片赋值
              const img = document.createElement('img')
              img.src = rgs[2]
              tool.setClass(img, 'etImg')
              tx.parentNode.insertBefore(img, tx.parentNode.childNodes[0])
              sp.innerHTML = rgs[1] || '~~点击输入标题~~'
              // sp.placeholder = '点这里输入标题';
              tool.setClass(sp, 'imgTitle')
            } else sp.innerHTML = val
          } else {
            const v = `;${val};`
            let rgs = /;type=([^;]+);/.exec(v)
            if (rgs) tx.type = rgs[1]
            rgs = /;pattern=([^;]+);/.exec(v)
            if (rgs) tx.pattern = rgs[1]
            rgs = /;placeholder=([^;]+);/.exec(v)
            if (rgs) tx.placeholder = rgs[1]
            rgs = /;readonly=([^;]+);/.exec(v)
            if (rgs) tx.setAttribute('readonly', 'readonly')
            // tx.readonly = rgs[1];
            rgs = /;value=([^;]*);/.exec(v)
            if (rgs) tx.value = rgs[1] || ''
            else tx.value = val

            /*
            let rgs = /^~~type=(\w+);(.*)~~$|^~~(.*)~~$/.exec(val);
            // let rgs = /^~~(.*)~~$/.exec(val);
            // 提示符 ~~请输入价格~~
            if (rgs) {
              if (rgs[1]) {
                tx.type = rgs[1];
                if (tx.type === 'number')
                  tx.pattern = '[0-9]*';
                tx.placeholder = rgs[2];
              } else if (rgs[3])
                tx.placeholder = rgs[3];
              tx.value = '';
            } else {
              rgs = /^\*\*\*([^\*]*)\*\*\*$/.exec(val);
              if (rgs) { // 后面的值必填 ***价格***
                tx.value = `*${rgs[1]}`;
                tx.setAttribute('readonly', 'readonly');
                // tx.style.color = 'red';
              } else {
                rgs = /^\*\*([^\*]*)\*\*$/.exec(val);
                if (rgs) { // 只读 **价格**
                  tx.value = rgs[1];
                  tx.setAttribute('readonly', 'readonly');
                } else {
                  if ((typeof val) === 'number') {
                    tx.type = 'number';
                    tx.pattern = '[0-9]*';
                  }
                  tx.value = val;
                }
              }
            }
            */
          }
        }
      }
    }
  }

  /**
   * 生成数据视图
   * 清空table
   * @param {*[]} [data]
   * @param {boolean} [add] - 新增、覆盖
   */
  setView(data, add = false) {
    const _ = this

    try {
      if (!data?.length && !_.data?.length) return

      const {el, cfg, fields} = _
      if (!cfg) {
        console.log('param is null.')
        return
      }

      let idy = 0
      if (!_.data?.length) add = false

        // 拷贝数据
      if (add && data?.length) {
        idy = _.data.length
        _.data.push(...data)
        _.vals.push(...Array.from({length: data.length}, () => ({})))
      } else {
        if (data) _.data = [...data]
        else data = _.data
        _.vals = Array.from({length: data.length}, () => ({}))

        const tbody = _.tb.tag('TBODY')
        tbody.empty()
      }

      const {hide} = cfg

      // index 需对数组添加index属性
      if (cfg.checkbox === 'index')
        _.data.forEach((v, x) => {
          if (!v?.index) v.index = x
        })

      el.find('.data-table-count')?.text(_.data.length - _.del.size)

      for (const d of data) {
        if (d?.length) {
          let i = 0
          for (const [j, v] of d.entries()) {
            if (!hide.includes(j) && fields.length > i) {
              fields[i].value = v
              fields[i].idx = j // 对应数据
              i++
            }
          }

          _.fillRow(fields, idy)
          idy++
        }
      }
    } catch (e) {
      log.err(e, 'setView')
    }
  }

  /**
   * 增加数据视图
   * @param {*[]} [data]
   */
  addView(data) {
    this.setView(data, true)
  }

  /**
   * 添加一个实例数据行到空行之前, 返回 添加的行数
   * textarea 实现高度按行高度自动适配很麻烦,去掉支持!
   * span 可直接编辑!
   * @param {string[]}names 字段名称 ['SpecN', 'SpecV']
   * @param {*} values 值，二维数组，与 names字段名对应
    [
      ['readonly=readonly;value=*规格', 'placeholder=如2斤、2袋（50g/袋）(必填);value=;'],
      ['readonly=readonly;value=*名称;', 'placeholder=商品名称(必填);value=;'],
      ['readonly=readonly;value=品牌', 'placeholder=请填写品牌(选填);value=;'],
      ['readonly=readonly;value=产地', 'placeholder=商品产地(选填);value=;']
    ]
   * @param {HTMLElement} [node] 插入到指定的行前
   * @returns {number}
   */
  addData(names, values, node) {
    let RC = 0
    const _ = this
    const {opt} = _

    try {
      const thead = _.tb.tag('THEAD')
      const tbody = _.tb.tag(tb, 'TBODY')
      // 行模板
      const rowPat = tool.lastChild(thead)
      // 优先 input，
      let view = false
      let txs = tool.tags(rowPat, 'INPUT')
      if (!txs || txs.length === 0) {
        view = true
        txs = tool.tags(rowPat, 'SPAN')
      }

      // 对 Input 添加 索引，方便操作
      if (txs && txs.length > 0) this.setIdx(txs, names)

      let row = null
      // 行赋值
      for (let i = 0; i < values.length; i++) {
        // 拷贝 模板行
        row = rowPat.cloneNode(true)
        row.style.display = ''

        if (view) txs = tool.tags(row, 'SPAN')
        else txs = tool.tags(row, 'INPUT')

        // 列赋值
        if (txs && txs.length > 0) this.setVal(txs, values[i])

        // 计算空行数，第一列为序号，第二列为空，作为空行,dwz 为何无此部分？
        // if (node)
        const nullRow = this.getNullRow(tbody)

        const cnt = tool.childCount(tbody)
        tool.firstChild(tool.firstChild(row)).nodeValue = cnt - nullRow.cnt + 1

        if ((cnt - nullRow.cnt) % 2 === 1) this.setRowClass(row, 'etRowEven')

        // 插入到空行前
        if (nullRow.row) tbody.insertBefore(row, nullRow.row)
        else tbody.insertBefore(row, null)

        RC = i + 1
      } // for

      /* 移动端无需排序!!!???
       // 对空行重新排序，设置样式
       if (nullRow.cnt > 0) {
       // 对tr重新排序，排除 文本节点干扰
       var i = 0;
       for (var j = 0; j < tbody.childNodes.length; j++) {
       row = tbody.childNodes[j];
       if (row.nodeType == 1) {
       i++;
       tl.firstChild(tl.firstChild(row)).nodeValue = i; //innerHTML = i+1; 不能使用 innerHTML，里面有隐藏 Field，存放 ID
       // 更改交替样式
       if (i % 2 == 1)
       setRowClass(row, "etRowOdd");
       else
       setRowClass(row, 'etRowEven');

       //alert( tl.firstChild(tl.firstChild(row)).nodeValue  + " " + row.className );
       }
       }
       }
       */
    } catch (e) {
      alert(`addData exp:${e.message}`)
    }

    return RC
  }

  /**
   * 清除数据及页面
   */
  clear() {
    const _ = this
    try {
      _.data = []
      const tbody = _.tb.tag('TBODY')
      tbody.empty()
    } catch (e) {
      log.err(e, 'clear')
    }
  }

  /**
   * 设置kv 数据
   * 清空table
   * @param {*[]} [data]
   * @param {boolean} [add] - 新增、覆盖
   * @returns {Number} - 新起始索引
   */
  setKv(data, add = false) {
    let R
    const _ = this
    try {
      if (!data?.length && !_.data?.length) return

      if (!_.data?.length) add = false

      // 拷贝数据
      if (add && data?.length) {
        _.data.push(...data)
      } else {
        if (data?.length) _.data = [...data]
        else data = _.data

        _.vals = [{}]

        // 恢复原始值
        for (const d of data) {
          delete d.subCol
          delete d.subCols
        }

        const tbody = _.tb.tag('TBODY')
        tbody.empty()
      }

      _.fields = _.data // 统一字段管理

      let rs
      let idx = 0
      let subidx = 0 // 子列定义

      // 多个内嵌表？
      for (const d of data) {
        // ???
        if (d.type === DataType.table) {
          _.baseTableInfo = d.value
        }
        }

      _.repairCol(data)

      /** @type {*} */
      const fv = {}
      for (const d of data) {
        const {field, type} = d
        fv[field] = _.vals[0][field] ?? d.value
        if (['number', DataType.number].includes(type) && isNumber(fv[field])) fv[field] = Number(fv[field])
      }

      do {
        rs = _.getRowData(data, idx, subidx)
        if (rs?.length) {
          _.fillKv(rs, idx, fv)
          idx += rs.length

          subidx = rs.subidx
          // 处理子列
          if (subidx) {
            idx--
        }
        }
      } while (rs)
    } catch (e) {
      log.err(e, 'setKv')
    }

    return R
  }

  /**
   * 补充 col、row 参数,缺省为1，0 不渲染
   * @param {*[]} data
   */
  repairCol(data) {
    const _ = this
    const {opt} = _

    for (const d of data) {
      let {type, col, row, subCol, catCol, cat} = d
      if (catCol && !subCol) subCol = catCol // 兼容旧字段

      // 缺省一列、一行
      col = col ?? [1, 1]
      if (Array.isArray(subCol)) d.subCol = subCol.map(v => v * opt.colRatio) // 兼容旧模式，2倍

      if (typeof col === 'number') {
        col *= opt.colRatio // 兼容旧模式，2倍
        if (col > 1) {
          const cats = [DataType.attach, DataTypes.attach].includes(type) && cat
          if (cats || [DataType.table, DataType.view, DataType.page, DataTypes.table, DataTypes.view, DataTypes.page].includes(type)) {
            col = [col, 0]
          } else col = [1, col - 1]
        }
      } else if (Array.isArray(col) && col.length === 1) col.push(1)

      // 合并行
      row = row ?? [1, 1]
      if (typeof row === 'number') row = [row, row]
      else if (Array.isArray(row) && row.length === 1) row.push(1)

      d.row = row
      d.col = col
    }
  }

  /**
   * 添加kv 数据
   * @param {*[]} data
   */
  addKv(data) {
    this.setKv(data, true)
  }

  /**
   * 填充单行数据，创建tr、td，填充 kv 值到 span
   * @param {*[]} r - 单行数据
   * @param {number} idx - 数据数组起始索引
   * @param {*} [fv] - 字段数据
   */
  fillKv(r, idx, fv) {
    const _ = this
    const {opt} = _

    try {
      const thead = _.tb.tag('THEAD')
      const tbody = _.tb.tag('TBODY')
      let tr = thead.lastChild().clone()
      let hasTd = false

      idx -= 1
      // 列赋值
      for (const c of r) {
        idx++

        try {
          const {field, left, vertical, hide} = c
          let {name, type, value, unit, option, row, col, align, cat, subCols} = c

          // 隐藏字段，跳过
          if (hide) continue

          if (field === 'debug') debugger

          type = type ?? DataType.text
          value = _.getKv(c, fv)

          let skipLb = false
          // 子类后面行不显示label
          if ([DataType.attach, DataTypes.attach].includes(type) && (cat?.length === 1 || subCols?.[0] > 0)) {
            skipLb = true
          }

          // label
          if (col[0] && !skipLb) {
            if (!Array.isArray(name)) name = [name]

            // 支持多label
            for (let nm of name) {
              let code
              // 指令代码
              if (nm.includes('__{')) {
                let src
                ;({code, src} = _.getCode(nm))
                nm = src
              }

              // 空格转换
              nm = nm.replaceAll(' ', '&emsp;')

              const td = document.createElement('td')
              const $td = $(td)
              if (vertical) {
          // td.style.width = `${opt.labelWidth}%`
                const htm = (
                  <div class="vertical-text-wrapper">
                    <span name={`lb${field}`} class="etLabel vertical-text">
                      {nm}
                    </span>
                  </div>
                )

                td.innerHTML = htm
                $(td).addClass('vertical-text-cell')
              } else td.innerHTML = `<span name="lb${field}" class="etLabel">${nm}</span>`

              // name 数组不支持列定义
              if (name.length === 1 && col[0] > 1) td.colSpan = col[0]

              if (code?.row > 1) td.rowSpan = code?.row
              else if (row[0] > 1) td.rowSpan = row[0]

              if (code?.align) $td.addClass(`align-${code?.align}`)
              else if (align) $td.addClass(`align-${align}`)

              if (code?.col > 0) td.colSpan = code?.col
              tr.append(td)
              hasTd = true
            }
          }

          // value
          const vcol = col[1]
          if (vcol > 0) {
            let types = type
            let muti = true
            if (!Array.isArray(type)) {
              // 多个value
              types = [type]
              muti = false
            }

            // 多值
            let i = -1
            for (const type of types) {
              i++
              let val = value ?? ''
              // 多值，取其中一个
              if (muti) {
                if (Array.isArray(value)) val = value?.[i] ? value[i] : ''
              }

            const td = document.createElement('td')
          const $td = $(td)
          // 合并列
              if (!muti && col[1] > 1) td.colSpan = col[1]

            if (row[1] > 1) td.rowSpan = row[1]

              if ([DataType.html, DataTypes.html].includes(type)) {
            // if (Array.isArray(col)) td.colSpan = vcol
            // else if (col > 1) td.colSpan = col * 2 - 1
          // td.style.width = `${((r.col ?? 1) * 100) / opt.col - opt.labelWidth}%`

          // 换行
                td.innerHTML = `${val}`
              } else if ([DataType.table, DataType.attach, DataTypes.table, DataTypes.attach].includes(type)) {
                if (cat) td.innerHTML = `<span name="tx"/>`
                else fillAttach(_, value, td, null, c.read, idx)
              } else {
              if ([DataType.checkbox, DataTypes.checkbox].includes(type)) {
                  const htm = option?.map(v => {
                  const rt = (
                      <label class="checkbox">
                        <input type="checkbox" name={field} value={v} checked={`${val.includes(v) ? 'true' : 'false'}`} />
                        <i class="icon-checkbox"></i>
                    {v}
                  </label>
                )
                  .replaceAll('checked="true"', 'checked')
                  .replaceAll('checked="false"', '')

                return rt // + v
              })
                  if (htm) td.innerHTML = `<span name="tx" class="etCheckbox">${htm.join('')}</span>`
              } else if ([DataType.radio, DataTypes.radio].includes(type)) {
                  const htm = option?.map(v => {
                  const rt = (
                      <label class="radio">
                        <input type="radio" name={field} value={v} checked={`${val === v ? 'true' : 'false'}`} />
                        <i class="icon-radio"></i>
                    {v}
                  </label>
                )
                  .replaceAll('checked="true"', 'checked')
                  .replaceAll('checked="false"', '')

                return rt // + v
              })

                  if (htm) td.innerHTML = `<span name="tx" class="etRadio">${htm.join('')}</span>`
                                }
                                // urlChange
                else if ([DataType.url, DataTypes.url].includes(type)) {
                                    // urlChange
                                    td.innerHTML = `<span title="${val}" name="tx" class="etValue" style="display: flex;align-items: center">
                                        <i class="icon wiaicon" style="color:red;font-size: 16px;">&#xe61b;</i>
                                        <a href="${val}" target="_blank" style="cursor:pointer;">点击跳转链接</a>
                                    </span>`
                } else if ([DataType.chip, DataTypes.chip].includes(type)) {
                  chip.fillChip(_, value, td, c.read, idx)
            } else if (unit)
                  td.innerHTML = `<div class=etNumber><span name="tx" class="etValue">${val}</span><span class="etSuffix">${unit}</span></div>`
                else {
                  td.innerHTML = `<span name="tx" class="etValue">${val ?? ''}</span>`

                  if (type === DataType.texts || type === DataTypes.texts) $td.find('span').addClass('etClamp')
                }

                // else td.innerHTML = `<input name="tx" class="etValue dy-input" value=${val}></input>`

            //  txs[i].setAttribute('idx', '') // 每行编辑节点设置idx属性，对应名称与数据索引，方便获取、设置节点数据
                $td.data('idx', idx) // td 保存 数据列索引
                $td.data('idy', 0) // td 保存 数据行索引
                if (muti) $td.data('idv', i) // td 保存 数据索引
                $td.data('value', val) // td 保存 原值
          }

            tr.append(td)
              hasTd = true
          }
          }

          // 插入到空行前
          if (hasTd) {
          tbody.dom.insertBefore(tr.dom, null)
          tr.show()
          }

          // 嵌套表，换行
          if ([DataType.table, DataTypes.table].includes(c.type) && value?.head && value?.data) {
            tr = thead.lastChild().clone()
            const td = document.createElement('td')
            td.colSpan = col[0] // vcol // col * 2 与 label 相同

            const $td = $(td)
            $td.data('idx', idx) // td 保存 数据索引
            $td.data('idy', 0) // td 保存 数据行索引

            $td.append(<div name={field} data-idx={idx} class="data-table" />)

            _.hasTable = true // 存在内嵌表，编辑时，需切换内嵌表编辑
            const el = $td.find('div.data-table')
            // @ts-expect-error
            const dtb = new DataTable(_.page, {
              el,
              name: `dtb${field}`, // datatable 名称
              head: value.head, // 表头
              data: value.data,
            })

            tr.append(td)
            // 插入到空行前
            tbody.dom.insertBefore(tr.dom, null)
            tr.show()
          } else if ([DataType.attach, DataTypes.attach].includes(type) && cat) {
            if (hasTd) tr = thead.lastChild().clone()

            let {cat, subCol, subCols} = c
            cat = cat ?? [name]
            subCol = subCol ?? [c.col[0]]
            if (subCol.length === 1) cat[0] = name // 名称替代分类

            subCols = subCols ?? [0]
            const cats = []
            for (const i of subCols) {
              cats.push({cat: cat[i], col: subCol[i]})
            }

            // cat.catid = 0

            // let cats
            // let catid = 0
            // do {
            //   cats = getRowCat(cat, catCol, opt.col, catid)
            //   if (cats?.length) {
            //     fillAttach(_, value, thead, tbody, cats, catCol, idx)
            //     catid = cats.catid + cats.length
            //   }
            // } while (cats?.length)
            // 按 cats 分类填充
            fillAttach(_, value, tr, cats, c.read, idx)
            // 插入到空行前
            tbody.dom.insertBefore(tr.dom, null)
            tr.show()
            // setTimeout(() => _.attachLast(tr), 1000) // 换行时补全格线
            // tr.click(attachClick) // 点击浏览大图
          }
        } catch (e) {
          log.err(e, 'fillKv')
        }
      } // for
    } catch (e) {
      log.err(e, 'fillKv')
    }
  }
  /**
   * 从数据中获取一行数据，用于 kv 模式，动态生成 row  col
   * @param {*[]} rs - 数据
   * @param {number} idx - 数据起始索引
   * @param {number} [subidx] - 字段内置子索引，如附件
   * @returns {*[] & {subidx: number}}
   */
  getRowData(rs, idx, subidx) {
    /** @type {*[] & {idx: number}} */
    let R
    const _ = this
    const {opt} = _
    const max = opt.col

    if (!opt.kv || !rs.length) return

    try {
      let col = 0
      let hasCol = 0
      let subCol
      let row = false // 满一行

      for (let i = idx; i < rs.length; i++) {
        const r = rs[i]
        let {left, subCol} = r
        left = left ?? 0

        // 子列处理
        if (subCol) {
          // 处理完毕
          if (subidx >= subCol.length) {
            subidx = 0
            continue // 跳过
          }

          const subCols = []
          for (let j = subidx; j < subCol.length; j++) {
            let useCol = left + subCol[j] // 占用列宽
            if (j > subidx) left = 0

            // 设置列宽超过最大列
            if (useCol > max) {
              useCol = max
              subCol[j] = useCol - max
            }

            col += useCol
            // 超过列宽，作为下行处理
            if (col <= max) {
              subidx++

              // 子列全部完成
              if (subidx >= subCol.length) subidx = 0

              subCols.push(j)
              hasCol += useCol

              r.subCols = subCols
              if (!R) R = []

              if (!R.includes(r)) R.push(r)

              R.subidx = subidx
            } else {
              // 超出一行，下行处理
              row = true
              break
            }
          }

          if (row) break
        } else {
          subidx = 0
          let useCol = left + r.col[0] + r.col[1]
          // 列宽超过最大列
          if (useCol > max) {
            useCol = max
            r.col[1] = max - r.col[0]
          }

          col += useCol
          // 超过列宽，作为下行处理
          if (col <= max) {
            if (!R) R = []

            R.push(r)
            R.subidx = subidx

            hasCol += useCol
          } else break
        }
      }

      // 多余列
      if (R && hasCol < max) {
        const r = R.at(-1)
        if (subidx) r.subCol[subidx - 1] += max - hasCol
        else r.col[1] += max - hasCol
      }

      // log({R}, 'getRow')
    } catch (e) {
      log.err(e, 'getRowData')
    }

    return R
  }

  /**
   * 获取文本中的指令代码
   * @param {string} src
   * @returns {{*, string}}
   */
  getCode(src) {
    let R
    try {
      // 使用正则表达式匹配 __{...}__ 格式的部分
      const regex = /__({[^}]+})__/
      const match = src.match(regex)

      if (match) {
        // 提取匹配的部分
        const code = match[0] // "__{align:left,row:3,col:2}__"
        let json = match[1] // "{align:left,row:3,col:2}"

        // 从原字符串中删除提取的部分
        src = src.replace(code, '')

        try {
          // 替换单引号为双引号（处理非标准 JSON）
          json = json.replace(/'/g, '"')

          // 第一步：为键加引号
          json = json.replace(/(\w+):/g, '"$1":')

          // 第二步：处理没有引号的值
          json = json.replace(/:([^,"}]+)([,}])/g, (match, m1, m2) => {
            // 数字（包括小数和负数）
            if (/^-?\d+\.?\d*$/.test(m1)) return `:${m1}${m2}`
            // 布尔值
            if (m1 === 'true' || m1 === 'false') return `:${m1}${m2}`
            // null
            if (m1 === 'null') return `:null${m2}`
            // 其他加引号
            return `:"${m1}"${m2}`
          })

          // 第三步：处理已经加引号的值
          json = json.replace(/:"([^"]+)":/g, ':"$1":')
          // 将JSON字符串转换为JavaScript对象
          R = {code: JSON.parse(json), src}
        } catch (e) {
          log.err(e, 'getCode JSON解析错误')
        }
      }
    } catch (e) {
      log.err(e, 'getCode')
    }

    return R
  }

  /**
   * 获得kv的val
   * @param {*} r - 数据对象
   * @param {*} [fv] - fieldVal 字段值，用于字段引用
   * @returns {*}
   */
  getKv(r, fv) {
    let R

    const _ = this
    try {
      const {div, mul, option} = r
      let {type, value, unit, qian, decimal, zero} = r

      type = type ?? DataType.text
      if ([DataType.attach, DataTypes.attach, DataType.chip, DataTypes.chip].includes(type)) return value

      value = value ?? ''

      // option: {1: '小型', 2: '中旬', 3: '大型'}
      if (typeof option === 'object' && !Array.isArray(option)) value = option[value]
      else if (Array.isArray(option) && option?.length && Array.isArray(option[0])) {
        // 二维数组，如 search 返回的值
        const r = option.find(v => v[0] === value)
        value = r[1]
      }

      // 字段引用
      value = _.parseRef(value, 0, fv)

      // 数据转换
      if ([DataType.bool, DataTypes.bool].includes(type) && value) value = value ? '是' : '否'
      else if ([DataType.date, DataTypes.date].includes(type) && value) value = getDate(value)
      else if ([DataType.time, DataTypes.time].includes(type) && value) value = getTime(value)
      else if ([DataType.datetime, DataTypes.datetime].includes(type) && value) value = getDateTime(value)

      if (typeof value === 'string') value = value.replace(/^null$|^undefined$/, '-')

      if ([DataType.number, DataTypes.number].includes(type)) {
        decimal = decimal ?? 2
        qian = qian ?? true
        unit = unit ?? ''
        zero = zero ?? true

        if (typeof value === 'string') value = value.replaceAll(',', '')

        if (isNumber(value)) {
          value = Number(value)
          if (div && div > 0) value = value / div
          if (mul && mul > 0) value = value * mul
          value = formatNum(value, decimal, zero)
        }
      } else if ([DataType.text, DataTypes.text, DataType.texts, DataTypes.texts, DataType.html, DataTypes.html].includes(type)) {
        value = value.replaceAll(' ', '&emsp;')
      }
      R = value
    } catch (e) {
      log.err(e, 'getKv')
    }

    return R
  }

  /**
   * 获得容器元素中的输入值
   * @param {*} el
   * @returns
   */
  getVal(el) {
    let R
    const _ = this

    try {
      const {tb, opt, fields} = _
      el = el ?? tb

      // 将data存入 value，方便FormData读取
      const rs = []
      const ck = []

      // 隐藏内嵌表
      const tbs = tb.find('.data-table-content table.edit-table')
      for (const t of tbs) {
        t._parent = t.parentElement
        t._next = t.nextSibling // 删除前记录下一个节点
        t.remove()
      }

      // 查找所有 input，获取修改值
      let els = el.find('input')
      for (const el of els) {
        // 跳过上传的文件input 和 没有名字的
        if (el.type === 'file' || !el.name) continue

        // 通过输入input获得新旧值
        const r = _.getCellVal(el)
        if (r !== undefined) {
          if (r.checked) ck.push(r.data)
          else rs.push(r.data)
        }
      }

      els = tb.find('select')
      for (const el of els) {
        const r = _.getCellVal(el)
        if (r !== undefined) rs.push(r.data)
      }

      // 合并checkbox多选值
      const cks = ck.reduce((acc, r) => {
        const {idx, idy, field, value, val} = r
        const k = `${idx}-${idy}-${field}`
        const v = acc[k]
        if (v) v.val.push(val)
        else acc[k] = {idx, idy, field, value, val: [val]}

        return acc
      }, {})

      for (const v of Object.values(cks)) {
        const {value, val} = v
        if (JSON.stringify(value) !== JSON.stringify(val)) rs.push(v)
      }

      // 恢复内嵌表
      for (const t of tbs) {
        if (t._next) t._parent.insertBefore(t, t._next)
        else t._parent.appendChild(t) // 如果 nextSibling 是 null，说明原来在最后
      }

      R = rs

      log({R}, 'getVal')
    } catch (e) {
      log.err(e, 'getVal')
    }
    return R
  }

  /**
   * 通过input/select 输入 元素获得变化的输入值和原值
   * @param {*} el
   * @returns {*}
   */
  getCellVal(el) {
    let R
    const _ = this

    try {
      const {opt, fields} = _
      const {kv} = opt

      const $el = $(el)
      let name = $el.attr('name').replace(/-attach-add$/, '')
      name = name.replace(/-chip-add$/, '')
      const td = $el.upper('td')
      let idx = td.data('idx') // 非Kv时 字段索引，kv时，数据索引
      const fieldid = idx
      const idy = td.data('idy') // 非kv时 行索引

      const r = fields[idx]
      if (r) {
        const {type, div, mul} = r

        // 原始值
        let value
        if (kv) value = r.value
        else value = _.data[idy][r.idx]

        /** @type {*} */
        let val = $el.val()
      const key = $el.data('key') // key:val

      let skip
      let checked
      if ([DataType.number, DataTypes.number].includes(type)) {
          if (typeof val === 'string') val = val?.replace(',', '') // 千分位
        // 没有修改跳过
          val = Number(val) // 空字符串会变成0
        if (value === val) skip = true
        else {
        if (div) val = val * div
        else if (mul) val = val / mul
        }
      } else if ([DataType.bool, DataTypes.bool].includes(type)) val = val === 'true' || val === '是'
      else if ([DataType.radio, DataTypes.radio].includes(type)) skip = !el.checked
      else if ([DataType.checkbox, DataTypes.checkbox].includes(type)) {
        checked = el.checked
          skip = !checked // 只收集选中项
      } else if ([DataType.search, DataTypes.search].includes(type)) {
        val = key
        } else if ([DataType.chip, DataTypes.chip].includes(type)) {
          // chip 单独处理
          const {_add, _del} = el
          if (!_add?.size && !_del?.size) skip = true
          if (!skip) {
            skip = true
            val = []
            if (Array.isArray(value)) val = value.map(v => v[0])
            if (_del?.size) for (const v of _del) val.splice(val.indexOf(v[0]), 1)
            if (_add?.size) for (const v of _add) val.push(v[0])

            if (!kv) idx = r.idx // 数据索引
            R = {data: {idx, idy, field: name, fieldid, value, val}}
          }
        } else if ([DataType.attach, DataTypes.attach].includes(type)) {
          // attach 单独处理
          const {_del} = el
          let add = [],
            del = []
          if (val) add = JSON.parse(val)
          if (!add?.length && !_del?.size) skip = true

          if (!skip) {
            skip = true
            val = []
            if (Array.isArray(value)) val = value.map(v => v.id)
            if (_del?.size) {
              for (const i of _del) {
                val.splice(val.indexOf(value[i].id), 1)
                del.push({id: value[i].id, url: value[i].url})
              }
            }

            if (add?.length) {
              for (const v of add) val.push(v.id)
              add = add.map(v => ({id: v.id, url: v.url}))
            }

            if (!kv) idx = r.idx // 数据索引
            R = {data: {idx, idy, field: name, fieldid, value, val, add, del}}
          }
      }

        if (!skip && (checked || `${val}` !== `${value}`)) {
          if (!kv) idx = r.idx // 数据索引
          R = {data: {idx, idy, field: name, fieldid, value, val}, checked}
        }

      log({R}, 'getCellVal')
      }
    } catch (e) {
      log.err(e, 'getCellVal')
    }
    return R
  }

  /**
   * 插入文本节点
   * @param tb
   * @param txt
   * @returns {*}
   */
  addTxt(tb, txt) {
    let RC = null
    try {
      const thead = tool.tags(tb, 'THEAD')[0]
      const tbody = tool.tags(tb, 'TBODY')[0]
      // 行模板
      const rowPat = tool.lastChild(thead)

      // 拷贝 模板行
      let row = rowPat.cloneNode(true)
      row.style.display = ''

      const tx = tool.tags(row, 'INPUT')[1]
      // alert( tx.parentNode.tagName)
      // 列赋值
      tx.value = txt

      // Span 同步赋值
      const sp = tool.childTag(tx.parentNode, 'span')
      sp.innerHTML = txt

      // 插入到当前行
      row = tbody.insertBefore(row, this.editRow)
      this.editRow = row
      this.editTx = tool.tags(row, 'span') || tool.tags(row, 'input')
      if (this.editTx) this.editTx = this.editTx[0]

      this._selRow = row
      this._editCell = null

      RC = row
    } catch (e) {
      alert(`addTxt exp:${e.message}`)
    }
    return RC
  }

  /**
   * 添加一个图片数据行到当前编辑行之前, 返回添加的行对象
   * @param tb
   * @param row
   * @param src
   * @returns 新添加的行
   */
  addImg(tb, src, title) {
    let RC = null
    try {
      const thead = tool.tags(tb, 'THEAD')[0]
      const tbody = tool.tags(tb, 'TBODY')[0]
      // 行模板
      const rowPat = tool.lastChild(thead)

      // 拷贝 模板行
      let row = rowPat.cloneNode(true)
      row.style.display = ''

      const tx = tool.tags(row, 'INPUT')[1] // 隐藏 input，用于提交数据
      // alert( tx.parentNode.tagName)
      // 列赋值,参照 md语法 ![alt](url)
      tx.value = tool.format('![%s](%s)', title || '', src) // JSON.stringify({title:'',url:url});

      // Span 用于编辑图片下的标题
      const sp = tool.childTag(tx.parentNode, 'span')
      sp.innerHTML = title || '~~点击输入标题~~'
      tool.setClass(sp, 'imgTitle')

      // 图片赋值
      const img = document.createElement('img')
      img.src = src
      tool.setClass(img, 'etImg')
      tx.parentNode.insertBefore(img, tx.parentNode.childNodes[0]) // 图片插到最前面

      let cur = this._selRow || this.editRow
      // 添加到选择行的后面
      cur = cur && cur.nextSibling
      row = tbody.insertBefore(row, cur)
      this.editRow = row // 插入行作为编辑行
      this.editTx = tool.tags(row, 'span') || tool.tags(row, 'input') // 优先 span
      if (this.editTx) this.editTx = this.editTx[0]

      this._selRow = row
      this._editCell = null

      RC = row

      // 如果是最后行,则自动增加空行!
      if (!cur) this.addRow(tb, '~~点击输入~~\n\r\n\r')
      else {
        const span = tool.tags(cur, 'span')[0]
        if (span) {
          const val = span.innerHTML
          if (!val || /^[\s\n\r]+$/.exec(val)) span.innerHTML = '~~点击输入~~<br><br>'
        }
      }
      this.editTx.focus()
    } catch (e) {
      alert(`addImg exp:${e.message}`)
    }

    return RC
  }

  /**
   * 获取当前对象坐标
   * @param obj
   * @returns {{x: number, y: number}}
   */
  getPosition(obj) {
    let left = obj.offsetLeft
    let top = obj.offsetTop

    let op = obj.offsetParent
    while (op) {
      left += obj.offsetLeft
      top += obj.offsetTop
      op = obj.offsetParent
    }

    return {
      x: left,
      y: top,
    }
  }

  mouseOver(evt) {
    const ev = evt || window.event
    const elm = ev.srcElement || ev.target
    tool.setClass(elm, 'etCellSelMouseOver')
  }

  mouseOut(evt) {
    const ev = evt || window.event
    const elm = ev.srcElement ? ev.srcElement : ev.target
    tool.setClass(elm, 'etCellSel')
  }

  editMouseup(evt) {
    const ev = evt || window.event
    ev.preventDefault()
  }

  /**
   * 显示输入编辑框,或下拉列表
   * @param tx 编辑对象
   * @param inp 输入框
   */
  showInput(to, inp) {
    // debugger;
    let tx = to
    if (inp.getAttribute('show') && inp.getAttribute('show') === '1') {
      return
    }

    console.log('showInput:%s', tx.tagName)

    // 设置显示标记
    inp.setAttribute('show', '1')

    if (tx && tx.tagName === 'TD') tx = tool.childTag(tx, 'span')

    // 判断是否正在编辑标记,避免循环调用
    /*
     if(tx.getAttribute('inputing') && tx.getAttribute('inputing') == '0') {
     tx.setAttribute('inputing', "1");
     return;
     }
     */

    // 设置正在编辑标记
    tx.setAttribute('inputing', '1')

    // 进入编辑状态
    this.editCell(tx, inp)

    // 如果是多行文本编辑,则插入编辑器,编辑器实现了自适应高度
    if (inp.tagName === 'TEXTAREA') {
      let h = tx.offsetHeight
      if (h < tx.parentNode.offsetHeight) h = tx.parentNode.offsetHeight

      inp.style.height = `${h}px`
      inp.style.minHeight = `${h}px`
      // inp.style.display = '';
      // console.log( 'showInput td.style.height:' + tx.parentNode.style.height
      //  + ' td.offsetHeight:' + tx.offsetHeight );
      tx.parentNode.insertBefore(inp, tx)
      tx.style.display = 'none'
    } else {
      // 对 div 操作,调整下拉列表位置
      const pos = this.getPosition(tx)
      const pd = inp.parentNode
      // alert( pos.x, pos.y);
      // var pos = getPosition(tx);
      pd.style.top = `${tx.tagName === 'SPAN' ? pos.y : pos.y + tx.offsetHeight + 2}px`
      pd.style.left = `${pos.x}px`
      pd.style.width = `${tx.tagName === 'SPAN' ? tx.offsetWidth : tx.offsetWidth + 2}px`
      pd.style.display = ''
      // style.display = "block";
      pd.style.height = `${tx.tagName === 'SPAN' ? tx.offsetHeight : tx.style.height}px`
    }

    // 显示控件的值传给输入框!
    let val = tx.tagName === 'SPAN' ? tx.innerHTML : tx.value
    if (/^\*\*请/.exec(val)) inp.value = ''
    // 赋值给 输入框,特殊字符需转义
    else {
      val = val.replace(/<br>/g, '\n')
      val = val.replace(/&gt;/g, '>')
      val = val.replace(/&lt;/g, '<')
      val = val.replace(/&nbsp;/g, ' ')
      inp.value = `${val}\n`
    }

    // 跟随原样式
    inp.style.textAlign = tx.style.textAlign
    inp.style.fontSize = tx.style.fontSize

    // ???
    // if(tx.tagName == 'SPAN')
    //  inp.style.height = (tx.offsetHeight + 20) + 'px';

    // ??? dwzhao +++
    inp.style.zIndex = '1000'
    // 切换焦点到 Input，便于使用按键，失去焦点时，实现自动隐藏
    inp.focus()
  }

  /**
   * 隐藏输入编辑器或下拉列表
   * input onblur 不能触发该事件，点击 Select，会触发 onBlur，导致 Select 隐藏，失去整个页面焦点
   * @param obj 编辑器
   * @param div 编辑器的层
   */
  hideInput(obj, div) {
    // 结束编辑
    if (obj) obj.setAttribute('show', '0')

    if (obj.tagName === 'TEXTAREA') {
      // 保存最后编辑的光标位置,用于插入图片
      this.editCursorPos = this.getCursorPos(obj)

      this.editTx.style.display = ''
      this.editTx.parentNode.removeChild(obj)
      if (div) div.appendChild(obj)
    } else obj.parentNode.style.display = 'none'

    return true
  }

  /**
   * 将输入框的内容赋值给现实对象
   * @param objTo
   * @param objShow
   */
  changeInput(objShow) {
    // 同时对 span 及 隐藏 input 赋值！
    if (objShow) {
      const tx = objShow.value
      if (this.editTx.tagName === 'SPAN') {
        let val = tx.replace(/</g, '&lt;').replace(/>/g, '&gt;')
        val = val
          .replace(/\r\n/g, '\n')
          .replace(/[\r\n]/g, '<br>')
          .replace(/\s/g, '&nbsp;')
        val = val.replace(/\s+$/, '')
        this.editTx.innerHTML = val
        // 同时赋值给 input组件,便于提交（span无法提交）
        const txTo = tool.childTag(this.editTx.parentNode, 'input')
        if (txTo) txTo.value = tx
      } else this.editTx.value = tx
    } else {
      const txTo = tool.childTag(this.editTx.parentNode, 'input')
      if (txTo) txTo.value = this.editTx.value
    }
  }

  // 回车、鼠标点击，直接输入
  setInput(objTo, objShow) {
    if (objTo.tagName === 'SPAN') {
      objTo.innerHTML = objShow.value
      const txs = tool.tags(objTo.parentNode, 'INPUT')
      if (txs) txs[0].value = objShow.value

      objShow.parentNode.style.display = 'none'
      // 避免 切换焦点时，下拉列表 重复显示
      objTo.setAttribute('inputing', '0')
    } else {
      objTo.value = objShow.value
      objShow.parentNode.style.display = 'none'
      // 避免 切换焦点时，下拉列表 重复显示
      objTo.setAttribute('inputing', '0')
      objTo.focus()
      objTo.select()
    }
  }

  // 将全部复选框设为指定值
  setOnlineEditCheckBox(obj, value) {
    const tbody = tool.tags(obj, 'TBODY')[0]
    for (let i = tbody.childNodes.length - 1; i >= 0; i--) tbody.childNodes[i].firstChild.firstChild.checked = value
  }

  /**
   * 列隐藏，cellIndex2种浏览器返回不同的列序号
   * 在ie6/7 下点击3号这列，显示 "2"
   * 在firefox3 下点击， 显示 "3"
   * @param td
   * @returns {number}
   */
  getCellIndex(td) {
    let RC = -1 // 没找到

    if (!td) return -1

    const tds = td.parentNode.childNodes
    for (let i = 0; i < tds.length; i++) {
      const nd = tds[i]

      // 只计算 td，包括 隐藏列
      if (nd.nodeName.toUpperCase() === 'TD') {
        // 元素节点
        // 开始计数
        if (RC === -1) RC = 0

        if (td === nd) break

        RC++
      }
    }

    return RC
  }

  // 设置键盘状态，即bKeyDown的值
  setKeyDown(status) {
    this._keyDown = status
  }

  /**
   * 处理按键事件,改变按键行为
   * @param ev
   */
  keyDown(evt) {
    const ev = evt || window.event
    const el = ev.srcElement || ev.target
    const key = ev.keyCode || ev.which || ev.charCode
    const DEL = 8
    const RETURN = 13
    const TAB = 9

    // 图片标题回车自动增加行
    if (el.tagName === 'SPAN') {
      if (key === RETURN && el.className === 'imgTitle') {
        // el.style.textAlign === 'center') {
        // ev.stopPropagation && ev.stopPropagation();
        // ev.cancelBubble=true;
        // ev.keyCode = 0;
        // ev.returnvalue=false;

        // x('txInfo').value = key;

        const td = el.parentNode
        const tr = td.parentNode
        const tb = tool.getUpperObj(tr, 'TABLE')

        const nextRow = tr.nextSibling
        if (!nextRow || tool.tags(nextRow, 'img').length > 0) {
          // var row = addRow(tb, '');
          const row = this.addRow(tb, '', nextRow)
          tool.tags(row, 'span')[0].focus()
        } else if (nextRow) {
          const span = tool.tags(nextRow, 'span')[0]
          if (span) tool.cursorEnd(span)
        }
        ev.preventDefault()
      } else if (key === DEL && el.tagName === 'SPAN') {
        if (!el.innerHTML || /(^(<br>)*$)|(^(\s)*$)/.exec(el.innerHTML)) {
          // x('txInfo').value = 'deleteRow';
          const tb = tool.getUpperObj(el, 'TABLE')
          this.delRow(tb)
          ev.preventDefault()
        }
      }
    }
  }

  /**
   * 被 textarea、select 下拉列表调用，用于回车 选择列表项，注意，页面 函数需增加 event 参数！
   * event 参数放到第一个参数
   * @param ev
   * @param objTo
   * @param objShow
   */
  keyPress(evt, objTo, objShow) {
    // var key = (window.event) ? window.event.keyCode : ev.keyCode;
    const ev = evt || window.event
    const key = ev.keyCode
    const el = ev.srcElement || ev.target
    // set responses to keydown events in the field
    // this allows the user to use the arrow keys to scroll through the results
    // ESCAPE clears the list
    // TAB sets the current highlighted value
    //
    const RETURN = 13
    const TAB = 9
    const ESC = 27

    // 删除
    if (el.tagName === 'SPAN') {
      const tb = tool.getUpperObj(el, 'TABLE')
      if (key === RETURN && el.className === 'imgTitle') {
        // style.textAlign === 'center') {
        if (ev.stopPropagation) ev.stopPropagation()
        ev.cancelBubble = true
        ev.keyCode = 0
        ev.returnvalue = false
        this.addRow(tb, '~~点击输入~~\n\r\n\r')
      }
    }

    return false

    /*
    switch (key) {
      case RETURN:
        setInput(objTo, objShow);
        ev.keyCode = 0;
        if (window.event) {
          ev.cancelBubble = true;     // ie下阻止冒泡
          ev.returnValue = false;
        } else {
          //evt.preventDefault();
          ev.stopPropagation();     // 其它浏览器下阻止冒泡
        }

        break;

      case ESC:
        hideInput(objShow);
        break;
    }
*/
  }

  // 为动态表格增加键盘导航功能,要使用该功能请在表格定义中增加事件处理
  // table 需增加 tabIndex="-1"，否则无法接收按键事件
  // onKeyDown="navigateKeys(event)" onKeyUp="setKeyDown(false)"
  // 有一点点问题，当按下"->"跳转到下一输入域时，光标显示在第一个字符之后
  // 建议仍然使用Tab键跳转
  navigateKeys(evt) {
    // 长按时，是否连续移动
    // if (this._keyDown)
    //  return;

    // bKeyDown = true;
    const ev = evt || window.event
    const elm = ev.srcElement || ev.target
    let key = ev.keyCode || ev.which || ev.charCode

    if (elm.tagName !== 'INPUT' && elm.tagName !== 'SPAN') {
      // 删除
      if (key === 46 && this._selRow) this.delRow()

      // 默认只对INPUT进行导航，可自行设定
      return
    }

    const td = elm.parentNode
    const tr = td.parentNode
    const ty = tr.parentNode // TBody
    const tb = ty.parentNode

    let nRow = tr.rowIndex
    let nCell = this.getCellIndex(td) // td.cellIndex; // 隐藏列 ie 返回 值错误

    switch (key) {
      case 37:
        // <-
        // if (getCursorPosition(elm)>0)
        //  return;
        if (this.getCursorPos(elm) > 0) return

        nCell--

        // 跳过隐藏TD
        while (tb.rows[nRow].cells[nCell].style.display === 'none') {
          if (nCell > 0) nCell--
        }

        if (nCell === 0) {
          // 跳转到上一行
          nRow--
          // 最后一列
          nCell = tr.cells.length - 1
        }
        key = 0
        break

      case 38:
        // ^
        nRow--
        // 跳过隐藏TD
        while (tb.rows[nRow].cells[nCell].style.display === 'none') {
          if (nRow !== 0) nRow--
        }

        key = 0
        break

      case 39:
        // ->
        // if (getCursorPosition(elm)<elm.value.length)
        //  return;
        if (this.getCursorPos(elm) < elm.value.length) return

        nCell++
        // 跳过隐藏TD
        while (tb.rows[nRow].cells[nCell].style.display === 'none') {
          if (nCell !== 0) nCell++
        }

        if (nCell >= tr.cells.length) {
          // 跳转到下一行首位置
          nRow++
          // 第一列一般是序号，无法选择
          nCell = 2
          // var tx = tl.firstChild(tb.rows[nRow].cells[nCell]);
          // if ( tx.tagName != 'INPUT' )
          //	nCell = 2;
        }
        key = 0
        break

      case 40:
        // \|/
        nRow++
        // 跳过隐藏TD
        while (nRow < tb.rows.length && tb.rows[nRow].cells[nCell].style.display === 'none') {
          if (nRow < tb.rows.length) nRow++
        }

        if (nRow >= tb.rows.length) {
          nRow = tb.rows.length
          // 增加一个空行
          this.addRow(tb)
          // nCell=1;//跳转到第一列
        }
        key = 0
        break

      case 13:
        // Enter
        // event.keyCode = 9;
        /* nCell++;
         if(nCell==objTR.cells.length){
         nRow++;//跳转到下一行首位置
         nCell=1;//第一列
         }

         if(nRow==objTBODY.rows.length){
         addRow(objTable);//增加一个空行
         nCell=1;//跳转到第一列
         }
         */
        break

      default:
        // do nothing
        return
    }

    if (key === 0) {
      // evt.keyCode||evt.which||evt.charCode;
      ev.keyCode = 0
      if (window.event) {
        ev.cancelBubble = true // ie下阻止冒泡
        ev.returnValue = false
      } else {
        // evt.preventDefault();
        ev.stopPropagation() // 其它浏览器下阻止冒泡
      }
    }

    // 第一行为 隐藏模版行
    if (nRow < 2 || nRow >= tb.rows.length || nCell < 1 || nCell >= tr.cells.length) return

    // alert( nRow + ':' + nCell );
    // tr = ty.rows[nRow];
    // td = tr.cells[nCell];
    const tx = tool.firstChild(tb.rows[nRow].cells[nCell])
    // tx.focus();
    // tx.select();
    this.editCell(tx)
  }

  /**
   * 获取光标位置之前的所有文本后删除
   * 光标详细讲解: http://blog.csdn.net/fudesign2008/article/details/7568263
   * @param to 剪切对象，如没有则自动查找最后编辑对象
   * @returns {string} 返回剪切的文本
   */
  cutTxt(to) {
    let rs = ''

    let tx = to
    if (!tx && this.editTx) tx = this.editTx

    if (!tx) return ''

    if (window.getSelection()) {
      // dom range
      const sel = window.getSelection()
      if (sel.rangeCount > 0) {
        const rg = sel.getRangeAt(0)
        const cur = rg.startContainer
        const pos = rg.startOffset
        const dels = []
        for (let i = 0; i < tx.childNodes.length; i++) {
          const nd = tx.childNodes[i]
          if (cur === nd) {
            // 文本节点
            if (nd.nodeType === 3) {
              rs += nd.nodeValue.substr(0, pos)
              nd.nodeValue = nd.nodeValue.substr(pos)
            } else {
              rs += nd.innerHTML.substr(0, pos)
              nd.innerHTML = nd.innerHTML.substr(pos)
            }
            break
          }

          if (tx.childNodes.length > 1) {
            rs += nd.nodeType === 3 ? nd.nodeValue : nd.outerHTML
            dels.push(nd)
          }
        }

        // 删除已经返回的节点
        for (let i = 0; i < dels.length; i++) {
          tx.removeChild(dels[i])
        }
      }
    }
    return rs
  }
}

/**
 * 格式化数字：保留 cnt 位小数并添加千位分隔符
 * @param {number} val - 需要格式化的数字
 * @param {number} [cnt] - 小数位数
 * @param {boolean} [zero] - 默认保留0
 * @returns {string} 格式化后的字符串
 */
function formatNum(val, cnt = 2, zero = true) {
  let R
  try {
  if (typeof val === 'string') {
    if (!isNumber(val)) return val // 如果不是数字，返回默认值

    val = Number(val)
  }

    R = val.toLocaleString('en-US', {
      minimumFractionDigits: cnt, // 最少保留 2 位小数
      maximumFractionDigits: cnt, // 最多保留 2 位小数
    })

    if (!zero) R.replace(/\.0+$/, '').replace(/(\.\d+)0+$/, '$1')
  } catch (e) {
    log.err(e, 'formatNum')
  }
  return R
}

/**
 * 是否为数字
 * @param {*} value
 * @returns {boolean}
 */
function isNumber(value) {
  let R = false
  try {
    if (value !== undefined && value !== null && value !== '') {
  if (typeof value === 'number') R = true
  else R = Number.isFinite(Number(value)) && value.trim() !== ''
    }
  } catch (e) {
    log.err(e, 'isNumber')
  }

  return R
}

/**
 * 数据库中返回的iso字符串，转换为当地时区日期字符串
 * @param {Date} date
 * @returns
 */
function getDate(date) {
  let R = ''
  try {
    if (date) {
  if (typeof date === 'string') date = new Date(date)

      if (isDate(date)) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
        R = `${year}-${month}-${day}`
      }
    }
  } catch (e) {
    log.err(e, 'getDate')
    log.error({date}, 'getDate')
  }
  return R
}

/**
 * 数据库中返回的iso字符串，转换为当地时区日期时间字符串
 * @param {Date} date
 * @returns
 */
function getDateTime(date) {
  if (!date) return ''
  if (typeof date === 'string') date = new Date(date)

  return date.toLocaleString('zh-CN').replaceAll('/', '-')
}

/**
 * 数据库中返回的iso字符串，转换为当地时区时间字符串
 * @param {Date} date
 * @returns
 */
function getTime(date) {
  if (!date) return ''
  if (typeof date === 'string') date = new Date(date)

  return date.toLocaleTimeString()
}

/**
 * 查询选项
 * @param {*} source
 * @param {string} name
 */
async function getOption(source, name) {
  let R
  try {
    if (!source?.url) return

    const {url, param} = source
    let {token} = source
    token = token ?? 'token'

    const tk = $.store.get(token)

    const rs = await $.post(url, {...param, name}, {'x-wia-token': tk})

    // 输入完成后再触发查询
    if (rs?.code === 200) R = rs.data
  } catch (e) {
    log.err(e, 'getOption')
  }

  return R
}

/**
 * @typedef {object} EditOpts
 * @prop {JQuery} el - 位置节点
 * @prop {string} name
 * @prop {*[]} head
 * @prop {*[]} data
 * @prop {*[]} use
 */

// param: {viewid: '', refid: ''}},

/**
 * 编辑表格
 * @param {*} pg
 * @param {EditOpts} opts
 */
function makeEdit(pg, opts) {
  let R
  const {head, data, el, name, use} = opts

  try {
    const htm = (
      <div name={`dv${name}Edit`} class="data-table data-table-init">
        <div class="data-table-header">
          <div name={`lb${name}Info`} class="data-table-title">
            合计[<span className="data-table-count"></span>]条数据
          </div>
          <div class="data-table-actions">
            <button name={`btn${name}Add`} type="button" class="dy-btn dy-btn-soft dy-btn-accent dy-btn-sm">
              新增
            </button>
          </div>
        </div>
        <div class="data-table-header-selected">
          <div class="data-table-title-selected">
            选择 [<span class="data-table-selected-count"></span>] 条数据<span class="data-table-selected-info"></span>
            <span name={`lb${name}SelInfo`}></span>
          </div>
          <div class="data-table-actions">
            <button name={`btn${name}CancelSel`} type="button" class="dy-btn dy-btn-soft dy-btn-sm">
              取消
            </button>
            <button name={`btn${name}DelSel`} type="button" class="dy-btn dy-btn-soft dy-btn-secondary dy-btn-sm">
              删除
            </button>
          </div>
        </div>
      </div>
    )

    el.hide()
    el.after(htm)
    const dv = el.parent().find(`div[name="dv${name}Edit"]`)
    dv.bindName()
    // dv.dom.wiaDataTable = el.dom.wiaDataTable
    const etb = new EditTable(pg, {
      el: dv,
      name: `tb${name}Edit`, // table 名称
      edit: true,
      kv: false,
      head,
      use,
      data, // 视图数据
    })

    // @ts-expect-error
    dv[`btn${name}CancelSel`].click(ev => {
      etb.cancelSel()
    })

    // @ts-expect-error
    dv[`btn${name}Add`].click(ev => {
      etb.addRow()
    })

    // @ts-expect-error
    dv[`btn${name}DelSel`].click(async ev => {
      try {
        const {sel} = etb
        if (sel?.size) {
          if (await promisify($.app.dialog.confirm, 2)(`确认删除所选${sel.size}条记录吗?`, '温馨提示!')) {
            for (const v of sel) etb.delRow(v)
            sel.clear()
            etb.cancelSel()
            // if (!sel.size) await promisify($.app.dialog.alert, 0)('删除成功!', '温馨提示!')
            // else await promisify($.app.dialog.alert, 0)('删除失败!', '温馨提示!')
          }
        }
      } catch {}
    })
    R = etb
  } catch (e) {}

  return R
}

/**
 * 根据 id 分组合并数据
 * @param {*[]} list
 * @returns
 */
function groupById(list) {
  const map = new Map()

  for (const item of list || []) {
    if (!map.has(item.id)) {
      map.set(item.id, {
        id: item.id,
        idx:[],
        fieldid: [],
        val: [],
        value: [],
      })
    }

    const {add, del} = item
    const {val, value} = item

    const group = map.get(item.id)
    group.idx.push(item.idx ?? '')
    group.fieldid.push(item.fieldid ?? '')
    group.val.push(val ?? '')
    group.value.push(item.value ?? '')
  }

  return Array.from(map.values())
}

export {DataType, DataTypes, EditTable as default, makeEdit as edit}
