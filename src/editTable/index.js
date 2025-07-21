/** @jsxImportSource @wiajs/core */
/**
 * 在线编辑表格
 */
import {Event} from '@wiajs/core'
import {Page} from '@wiajs/core'
import DataTable from '../dataTable'
import {fillAttach, getRowCat} from './attach'
import * as tool from './tool'
import {log as Log} from '@wiajs/util'

const log = Log({m: 'editTable'}) // 创建日志实例

/**
 * @typedef {import('jquery')} $
 * @typedef {JQuery} Dom
 */

/** @typedef {object} Opts
 * @prop {Dom} tb - $table
 * @prop {string[]} [editTag] - 可编辑元素标签
 * @prop {boolean} [edit] - 编辑模式
 * @prop {boolean} [add] - 新增模式
 * @prop {boolean} [kv] - key value
 * @prop {number} [col] - 最大列数
 * @prop {number[]} [colWidth] - 列宽
 */

/** @typedef {object} Opt
 * @prop {Dom} tb - $table
 * @prop {string[]} editTag
 * @prop {boolean} edit
 * @prop {boolean} add
 * @prop {boolean} kv - key value
 * @prop {number} labelWidth - label 宽度 百分比
 * @prop {number} col - 最大列数
 * @prop {number[]} [colWidth] - 列宽
 * @prop {number} [colRatio] - 列比
 */

/** @type {Opt} */
const def = {
  tb: null,
  editTag: ['input', 'textarea'], // 'span'
  edit: false,
  add: false,
  kv: false,
  labelWidth: 10, // label 宽度 百分比
  col: 8, // KV 模式数量列，k、v各占一列，实际 8 列
  // colWidth: [0.1, 0.15, 0.1, 0.15, 0.1, 0.15, 0.1, 0.15],
  colRatio: 1, // 兼容历史，col 4 模式
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

  /** @type {number} */
  editCursorPos = 0 // 最后编辑光标位置

  /** @type {number} */
  rowNum = 0 // 表行数

  /** @type {number} */
  dataid = 0 // 当前数据索引，用于render row

  /** @type {*[]} */
  data

  /**
   * 构造函数
   * @param {Page} page Page 实例
   * @param {Opts} opts
   */
  constructor(page, opts) {
    super(opts, [page])
    const _ = this
    const opt = {...def, ...opts}
    _.opt = opt
    _.tb = opt.tb
    _.page = page

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
    const {colWidth, edit} = opt

    try {
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
    } catch (e) {
      log.err(e, 'init')
    }
  }

  bind() {
    const _ = this
    const {opt} = _

    // 表格点击事件
    // 编辑元素（input） 不能 focus，不能 onblur？原因：pointer-events: none
    _.tb.click(ev => {
      if (!opt.edit) return

      // 点击 input、select 则跳过
      if (['SELECT', 'INPUT'].includes(ev.target.tagName)) return

      const $ev = $(ev)
      const td = $ev.upper('td')

      let span = $ev.upper('span')

      span = td.find('span')
      if (span.eq(0).css('display') === 'none') {
        // debugger
        return
      }

      const idx = td?.data('idx') // 数据索引
      const idv = td?.data('idv') // 数据中的value索引，多值数组模式下
      const value = td?.attr('data-value') // 数据原值 data 会自动转换 json 字符串

      const r = _.data?.[idx]
      if (r) {
        if (r.read) return // 只读

        // 方法2.2（更可靠）
        // document.body.setAttribute('tabindex', '-1')
        // document.body.focus()
        // document.body.removeAttribute('tabindex')

        let type = r.type ?? DataType.text // 默认单行字符串
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
          let val = span.html()
          let key
          let tx = td.find('select')
          if (!tx.dom) {
            tx = document.createElement('select')
            tx.name = r.field
            td.append(tx)
            tx = $(tx)
            tx.addClass('dy-select')
            const {option} = r
            // 添加选项
            let htm = []
            if (Array.isArray(option))
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
            else if (typeof option === 'object') {
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
            tx.html(htm.join(''))

            if (key) tx.val(key)
            else tx.val(val)

            tx.click(ev => ev.stopPropagation()) // 阻止事件冒泡

            // tx.addClass('dy-input')
            // tx.val(span.html())
            // tx.change(ev => {
            tx.blur(ev => {
              // _.viewCell()
              let val
              if (Array.isArray(option)) val = tx.val()
              else if (typeof option === 'object') {
              key = tx.val()
              val = option[key]
              }
              span.html(val)

              if (`${val}` === `${value}`) {
              tx.hide()
                span.show()
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
        } else if ((type === DataType.search || type === DataTypes.search) && _.Autocomplete) {
          const span = td.find('span')
          if (span.css('display') !== 'none') {
            span.hide()
            let val = span.html()
            let key
            let tx = td.find('.ac-input')
            let dvAc = td.find('.autocomplete')

            if (!tx.dom) {
              const {option, source, field} = r
              let {placeholder} = r
              placeholder = placeholder ?? '请输入'
              td.append(
                <div class="autocomplete">
                  <div class="ac-wrapper">
                    <input type="text" name={field} class="ac-input" placeholder={placeholder} autocomplete="off" />
                  </div>
                </div>
              )
              tx = td.find('.ac-input')
              dvAc = td.find('.autocomplete')

              // tx.addClass('dy-input')
              const ac = new _.Autocomplete(_.page, {
                el: dvAc,
                data: option, // 设置数据
                refEl: [span.dom], // 关联元素，点击不关闭列表，否则会关闭列表
                source,
              })

              tx.blur(ev => {
                // 选择赋值在 blur 后
                setTimeout(() => {
                  const val = tx.val()
                  if (`${val}` === `${value}`) {
                    dvAc.hide()
                    span.eq(0).html(val)
                    span.show()
                  }
                }, 200)
              })
            }

            // tx.val(span.eq(0).html())
            dvAc.show()
            const input = tx.dom
            const {ac} = dvAc.dom
            tx.focus() // 自动触发下拉
            // 触发datalist下拉显示（需要特殊处理）
            // setTimeout(() => {
            //   input.focus()
            //   ac.showAllList()
            // }, 0)
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
            tx.addClass('dy-select')
            const option = {true: '是', false: '否'}
            // 添加选项
            let htm = []
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
  }

  unbind() {
    const _ = this
  }

  use(cls) {
    this[cls.name] = cls
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
      case DataTypes.url:
      case DataType.url:
        R = 'url'
        break
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

  /**
   * 编辑模式
   */
  edit() {
    const _ = this
    _.opt.edit = true
    _.tb.tag('tbody').addClass('etEdit').removeClass('etView')
    _.bind()
  }

  /**
   * 浏览模式，禁止编辑
   * 数据未保存到data，可取消
   */
  view() {
    const _ = this
    _.opt.edit = false
    _.tb.tag('tbody').addClass('etView').removeClass('etEdit')
    _.unbind()

    if (_.data) {
      const tds = _.tb.find('td[data-idx]')
      for (const td of tds.get()) {
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
          const tx = $td.find('input')
          if (tx) tx.hide()
        }
      }
    }
  }

  /**
   * 保存修改数据到data，并切换到浏览视图
   */
  save() {
    const _ = this
    _.opt.edit = false
    _.tb.tag('tbody').addClass('etView').removeClass('etEdit')
    _.unbind()
    if (_.data) {
      const tds = _.tb.find('td[data-idx]')
      for (const td of tds.get()) {
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
          const tx = $td.find('input')
          if (tx) {
            const val = tx.val()
            // 设置 原始值
            d.value = val
            $td.data('value', val)

            tx.hide()
          }
        }
      }
    }
  }

  /**
   * 取消修改，还原值
   */
  cancel() {
    const _ = this
    _.opt.edit = false
    _.tb.tag('tbody').addClass('etView').removeClass('etEdit')
    _.unbind()
    if (_.data) {
      const tds = _.tb.find('td[data-idx]')
      for (const td of tds.get()) {
        const $td = $(td)
        const idx = $td.data('idx') // 数据索引
        const d = _.data[idx]
        const value = $td.data('value') // 原始值
        const {type, option} = d || {}
        if ((type === DataType.search || type === DataTypes.search) && _.Autocomplete) {
          const dvAc = $td.find('.autocomplete')
          dvAc?.hide()
          const span = $td.find('span')
          span.eq(0).html(value)
          span.show()
        } else if (type === DataType.checkbox || type === DataTypes.checkbox) {
          const ns = $td.find('input[type=checkbox]')
          for (const n of ns.get()) {
            const val = $(n).val()
            n.checked = value.includes(val)
          }
        } else if (type === DataType.radio || type === DataTypes.radio) {
          const ns = $td.find('input[type=radio]')
          for (const n of ns.get()) {
            const val = $(n).val()
            n.checked = value === val
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
            span.html(value)
            span.removeClass('edit')
            span.show()
          }
          const tx = $td.find('input')
          if (tx) {
            tx.val(value)
            tx.hide()
          }
        }
      }
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
    if (tx && opt.edit) {
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
   * @param tb
   * @param iRow 指定的行数
   * 返回 剩下的行数
   */
  delRow(tb, iRow) {
    let rs = 0

    if (!tb) return 0

    try {
      const tbody = tool.tags(tb, 'TBODY')[0]
      const rows = tool.tags(tbody, 'TR')

      if (rows.length === 0) return

      let delRow = null

      if (tb && iRow)
        delRow = tb.rows[iRow + 1] // 删除选择行
      else delRow = this._selRow

      // 没有选择行,直接删除最后编辑行
      if (!delRow && this.editRow) {
        delRow = this.editRow
        // x('txInfo').value = 'this._editRow';
      }

      if (!delRow) delRow = rows[rows.length - 1]

      if (!delRow) return

      if (this._selRow) {
        this.setRowClass(this._selRow, '')
        this._selRow = null
      }

      if (this._editCell) {
        tool.setClass(this._editCell, '')
        this._editCell = null
      }

      const th = tool.tags(tb, 'TH')[0]

      if (delRow.childElementCount > 0 && tool.lastChild(tool.firstChild(delRow)).value) {
        // 记录删除ID
        tool.lastChild(th).value = tool.lastChild(th).value ? `${tool.lastChild(th).value},` : ''
        tool.lastChild(th).value += tool.lastChild(tool.firstChild(delRow)).value
      }
      // alert( tl.lastChild(tl.firstChild(delRow)).value );

      if (delRow === this._selRow) this._selRow = null

      if (delRow === this.editRow) {
        this.editRow = null
        this.editTx = null
      }

      let preRow = delRow.previousSibling
      let span = tool.tags(delRow, 'span')[0]
      if (delRow.parentNode) delRow.parentNode.removeChild(delRow)

      // span 全屏编辑,没有数据,自动增加一行
      if (span) {
        // 返回剩下行数
        rs = tool.tags(tbody, 'TR').length
        if (!rs) {
          preRow = this.addRow(tb, '~~点击输入~~\n\r\n\r')
          rs = 1
        }

        if (preRow) {
          span = tool.tags(preRow, 'span')[0]
          if (span) tool.cursorEnd(span)
        }
      }

      // 对tr重新排序，排除 文本节点干扰,移动端不需要,屏蔽!!!???
      /*
       var i = 0;
       for(var j = 0; j < tbody.childNodes.length; j++) {
       var row = tbody.childNodes[j];
       if(row.nodeType == 1) {
       i++;
       tl.firstChild(tl.firstChild(row)).nodeValue = i; //innerHTML = i+1; 不能使用 innerHTML，里面有隐藏 Field，存放 ID
       // 更改交替样式
       if(i % 2 == 1)
       setRowClass(row, "etRowOdd");
       else
       setRowClass(row, 'etRowEven');
       }
       }
       */
    } catch (e) {
      console.error(`deleteRow exp:${e.message}`)
    }

    return rs
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
    const {tb} = _
    const thead = tb.tag('THEAD')
    let row
    if (!tp) row = thead.lastChild().clone()
    else row = tp.clone()

    _.rowNum++
    row.data('rowNum', _.rowNum)

    const span = row.tag('span')
    if (span) span.innerHTML = txt || ''

    /*
    const tx = tl.tags(row, 'INPUT')[0];
    if (tx)
      tx.value = txt || '';
*/

    row.show()

    const tbody = tb.tag('tbody')

    /* 移动无需 奇偶样式!!!???
     var cnt = tl.childCount(tbody);
     tl.firstChild(tl.firstChild(row)).nodeValue = cnt + 1;
     if ( cnt % 2 == 1)
     setRowClass( row, 'etRowEven' );
     */

    tbody.dom.insertBefore(row.dom, node || null)
    // row.insertBefore(node || null)

    _.editRow = row.dom
    _.editTx = row.tag('span') || row.tag('input')
    _._selRow = row.dom
    _._editCell = null
    // ???
    // x('txInfo').value = 'addRow';

    return row
  }

  /**
   * 从数据中获取一行数据，用于 kv 模式，动态生成 row  col
   * @param {*[]} rs - 数据
   * @param {number} idx - 数据起始索引
   * @returns {*[] & {idx: number}}
   */
  getRowData(rs, idx) {
    /** @type {*[] & {idx: number}} */
    let R
    const _ = this
    const {opt} = _
    if (!opt.kv || !rs.length) return

    try {
      let col = 0
      let hasCol = 0

      for (let i = idx; i < rs.length; i++) {
        const r = rs[i]
        let {left} = r
        left = left ?? 0

        let setCol = left + r.col[0] + r.col[1]
        if (setCol > opt.col) {
          setCol = opt.col
          r.col[1] = opt.col - r.col[0]
        }

        col += setCol
        if (col <= opt.col) {
          if (!R) {
            R = []
            R.idx = idx
          }
          R.push(r)
          hasCol += setCol
        } else break
      }

      // 多余列
      if (R && hasCol < opt.col) {
        const r = R.at(-1)
        r.col[1] += opt.col - hasCol
      }

      // log({R}, 'getRow')
    } catch (e) {
      log.err(e, 'getRow')
    }

    return R
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
   * @param {*[]} data
   * @param {boolean} [add] - 新增、覆盖
   * @returns {Number} - 新起始索引
   */
  setKv(data, add = false) {
    let R
    const _ = this
    try {
      if (add) _.data = [...(_.data || []), ...data]
      else {
        _.data = [...data]
        const tbody = _.tb.tag('TBODY')
        tbody.empty()
      }

      // _.data = data // 用于对比修改变化
      let r
      let idx = 0

      _.repairCol(data)
      do {
        r = _.getRowData(data, idx)
        if (r) {
          _.fillKv(r)
          idx = r.idx + r.length
        }
      } while (r)
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
      let {type, col, row} = d
      // 缺省一列、一行
      col = col ?? [1, 1]

      if (typeof col === 'number') {
        col *= opt.colRatio // 兼容旧模式，2倍
        if (col > 1) {
          if (
            [
              DataType.attach,
              DataType.table,
              DataType.view,
              DataType.page,
              DataTypes.attach,
              DataTypes.table,
              DataTypes.view,
              DataTypes.page,
            ].includes(type)
          ) {
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
   * 行填充，创建tr、td，填充 kv 值到 span
   * @param {*} rs - 行数据
   */
  fillKv(rs) {
    const _ = this
    const {opt} = _

    try {
      const thead = _.tb.tag('THEAD')
      const tbody = _.tb.tag('TBODY')
      let tr = thead.lastChild().clone()

      let {idx} = rs // 数据数组索引
      idx -= 1
      // 行赋值
      for (const r of rs) {
        idx++

        try {
          const {field, left, vertical} = r
          let {name, type, value, unit, option, row, col, align} = r

          if (field === 'debug') debugger

          type = type ?? DataType.text
          value = _.getKv(r)
          // label
          if (col[0]) {
            if (!Array.isArray(name)) name = [name]

            for (let nm of name) {
              let code
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
            }
          }

          // value
          const vcol = col[1]
          if (vcol > 0) {
            let types = type
            let muti = true // 多个value
            if (!Array.isArray(type)) {
              types = [type]
              muti = false
            }

            // 多值
            let i = -1
            for (const type of types) {
              i++
              let val = value
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
            } else if ([DataType.table, DataType.attach, DataTypes.table, DataTypes.attach].includes(type)) td.innerHTML = `<span name="tx"/>`
          else {
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
                else td.innerHTML = `<span name="tx" class="etValue">${val}</span>`
                // else td.innerHTML = `<input name="tx" class="etValue dy-input" value=${val}></input>`

            //  txs[i].setAttribute('idx', '') // 每行编辑节点设置idx属性，对应名称与数据索引，方便获取、设置节点数据
            $td.data('idx', idx) // td 保存 数据索引
                if (muti) $td.data('idv', i) // td 保存 数据索引
                $td.data('value', val) // td 保存 原值
          }

            tr.append(td)
          }
          }

          // 插入到空行前
          tbody.dom.insertBefore(tr.dom, null)
          tr.show()

          // 嵌套表，换行
          if ([DataType.table, DataTypes.table].includes(r.type) && value?.head && value?.data) {
            tr = thead.lastChild().clone()
            const td = document.createElement('td')
            td.colSpan = col[0] // vcol // col * 2 与 label 相同

            const $td = $(td)
            $td.data('idx', idx) // td 保存 数据索引

            $td.append(<div class="data-table" />)

            const dtb = new DataTable(_.page, {
              el: $td.find('div.data-table'),
              name: `dtb${name}`, // datatable 名称
              head: value.head, // 表头
              data: value.data, // 数据
            })

            tr.append(td)
            // 插入到空行前
            tbody.dom.insertBefore(tr.dom, null)
            tr.show()
          } else if ([DataType.attach, DataTypes.attach].includes(type) && value?.length) {
            const {cat} = r
            let {catCol} = r
            catCol = catCol.map(v => v * opt.colRatio)
            let cats
            let catid = 0

            do {
              cats = getRowCat(cat, catCol, opt.col, catid)
              if (cats) {
                fillAttach(_, value, thead, tbody, cats, catCol, idx)
                catid = cats.catid + cats.length
              }
            } while (cats)
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
   * @returns {*}
   */
  getKv(r) {
    let R
    try {
      const {div, mul, option} = r
      let {type, value, unit, qian, decimal, zero} = r

      type = type ?? DataType.text
      value = value ?? ''

      // option: {1: '小型', 2: '中旬', 3: '大型'
      if (typeof option === 'object' && !Array.isArray(option)) value = option[value]
      else if (Array.isArray(option) && option?.length && Array.isArray(option[0])) {
        const r = option.find(v => v[0] === value)
        value = r[1]
      }

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
   * 获得输入值
   * @returns
   */
  getVal() {
    let R
    const _ = this

    try {
      const {tb} = _

      // 将data存入 value，方便FormData读取
      const rs = []
      const ck = []

      let els = tb.find('input')
      for (const el of els.get()) {
        const r = _.getCellVal(el)
        if (r !== undefined) {
          if (r.checked) ck.push(r.data)
          else rs.push(r.data)
        }
      }

      els = tb.find('select')
      for (const el of els.get()) {
        const r = _.getCellVal(el)
        if (r !== undefined) rs.push(r.data)
      }

      // 合并checkbox多选值
      const vs = ck.reduce((acc, r) => {
        const {idx, field, value, val} = r
        const v = `${idx}-${field}`
        const o = acc[v]
        if (o) o.val.push(r.val)
        else acc[v] = {idx, field, value, val: [r.val]}

        return acc
      }, {})

      for (const k of Object.keys(vs)) {
        const v = vs[k]
        rs.push(v)
      }

      R = rs

      log({R}, 'getVal')
    } catch (e) {
      log.err(e, 'getVal')
    }
    return R
  }

  /**
   * 获得变化的输入值
   * @param {HTMLElement} el
   * @returns
   */
  getCellVal(el) {
    let R
    const _ = this

    try {
      const $el = $(el)
      const field = $el.attr('name')
      const td = $el.upper('td')
      const idx = td.data('idx')
      const d = _.data[idx]
      const {value, type, div, mul} = d
      let val = $el.val()
      const key = $el.data('key')

      let skip
      let checked
      if ([DataType.number, DataTypes.number].includes(type)) {
        val = Number(val)
        if (div) val = val * div
        else if (mul) val = val / mul
      } else if ([DataType.bool, DataTypes.bool].includes(type)) val = val === 'true' || val === '是'
      else if ([DataType.radio, DataTypes.radio].includes(type)) skip = !el.checked
      else if ([DataType.checkbox, DataTypes.checkbox].includes(type)) {
        checked = el.checked
        skip = !checked
      } else if ([DataType.search, DataTypes.search].includes(type)) {
        val = key
      }

      if (!skip && `${val}` !== `${value}`) R = {data: {idx, field, value, val}, checked}

      log({R}, 'getCellVal')
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
  if (typeof value === 'number') R = true
  else R = Number.isFinite(Number(value)) && value.trim() !== ''

  return R
}

/**
 * 数据库中返回的iso字符串，转换为当地时区日期字符串
 * @param {Date} date
 * @returns
 */
function getDate(date) {
  if (!date) return ''

  if (typeof date === 'string') date = new Date(date)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
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

export {EditTable as default, DataType, DataTypes}
