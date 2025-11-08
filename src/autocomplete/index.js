/** @jsxImportSource @wiajs/core */

import {Page, Event} from '@wiajs/core'
import {log as Log} from '@wiajs/util'

const log = Log({m: 'autoComplete'}) // 创建日志实例

/**
 * @typedef {import('jquery')} $
 * @typedef {JQuery} Dom
 */

/** @typedef {object} Opts
 * @prop {Dom} el - 容器元素
 * @prop {boolean} [status] - 状态
 * @prop {boolean} [search] - 搜索
 * @prop {boolean} [clear] - 清除
 * @prop {number} [maxItems] - 显示数量，避免性能问题
 * @prop {*[]} [data] - 初始数据
 * @prop {HTMLElement[]} [refEl] - 关联元素，点击不关闭列表
 * @prop {{url:string, token:string}} [source] - 显示数量，避免性能问题
 * @prop {string} [addUrl] - 新增网址
 */

/** @typedef {object} Opt
 * @prop {Dom} el -
 * @prop {boolean} status
 * @prop {boolean} search
 * @prop {boolean} clear
 * @prop {*[]} data - 数据
 * @prop {number} maxItems - 显示数量，避免性能问题
 * @prop {HTMLElement[]} refEl - 关联元素，点击不关闭列表
 * @prop {{url:string, token:string}} source - 显示数量，避免性能问题
 * @prop {string} addUrl - 新增网址
 */

/** @type {Opt} */
const def = {
  el: 'autocompelete',
  status: true,
  search: true,
  clear: true,
  /** @type {*[]} */
  data: [],
  /** @type {HTMLElement[]} */
  refEl: [],
  maxItems: 50, // 限制显示数量，避免性能问题
  source: undefined,
  addUrl: undefined,
}

export default class Autocomplete extends Event {
  /** @type {Dom} */
  el
  /** @type {Dom} */
  wrapper
  /** @type {Dom} */
  input
  /** @type {Dom} */
  btnClear
  /** @type {Dom} */
  btnSearch
  /** @type {Dom} */
  btnAdd
  /** @type {Dom} */
  dvStatus
  /** @type {Dom} */
  dvList
  /** @type {Opt} */
  opt

  currentFocus = -1 // 当前高亮选项索引
  isComposing = false // 是否在中文输入过程中
  lastValue = '' // 上一次的值（用于防抖）

  /**
   * 构造
   * @param {Page} page 页面实例
   * @param {Opts} opts 选项，激活名称
   */
  constructor(page, opts) {
    /** @type{Opt} */
    const opt = {...def, ...opts}
    super(opt, [page])
    const _ = this

    _.page = page // Page实例
    _.opt = opt

    const {el, data} = opt
    if (data) _.data = data

    if (typeof el === 'string') el = $(opt.el)

    if (el.dom) {
      _.el = el
      el.dom.wiaAutocomplete = _
      _.wrapper = el.find('.ac-wrapper')
      _.input = el.find('.ac-input')
      // 下面部分动态加载
      // _.btnClear = el.find('.ac-clear')
      // _.btnSearch = el.find('.ac-search')
      // _.btnAdd = el.find('.ac-add')
      // _.dvStatus = el.find('.ac-status')

      _.init()
      _.bind()
    }
  }

  init() {
    const _ = this
    try {
      const {el, opt, wrapper} = _
      const {status, search, addUrl, clear} = opt
      if (clear) {
        wrapper.append(
          <button type="button" class="ac-clear">
            <i class="icon wiaicon">&#xe9fb;</i>
          </button>
        )
        _.btnClear = el.find('.ac-clear')
      }

      if (search) {
        wrapper.append(
          <button type="button" class="ac-search">
            <i class="icon wiaicon">&#xeabd;</i>
          </button>
        )
        _.btnSearch = el.find('.ac-search')
      }

      if (addUrl) {
        el.addClass('has-add')
        wrapper.append(
          <button type="button" class="ac-add">
            <i class="icon wiaicon">&#xea63;</i>
          </button>
        )
        _.btnAdd = el.find('.ac-add')
      }

      if (status) {
        wrapper.append(<div class="ac-status" />)
        _.dvStatus = el.find('.ac-status')
      }

      el.append(<div class="ac-list" />)

      _.dvList = el.find('.ac-list')

      // 初始状态隐藏下拉框
      _.hideList()
    } catch (e) {
      log.err(e, 'init')
    }
  }

  bind() {
    const _ = this
    try {
      const {el, opt, wrapper, data} = _
      const {source, addUrl} = opt

      _.input.focus(ev => {
        _.showAllList()
      })

      // 输入事件监听
      _.input.input(async function (ev) {
        const inputValue = this.value.trim()

        if (_.isComposing)
          // 中文输入过程中忽略
          return

        // 更新清除按钮状态
        _.upClearButton()

        // 值未变化时忽略
        if (inputValue === _.lastValue) return

        _.lastValue = inputValue

        // 空值处理
        if (!inputValue.trim()) {
          _.hideList()
          _.hideStatus()
          return
        }

        await _.search(source, inputValue)
      })

      // 中文输入法开始
      _.input.dom.addEventListener('compositionstart', () => {
        _.isComposing = true
        _.input.addClass('composing')
        _.showStatus('输入中...')
      })

      // 中文输入法结束
      _.input.dom.addEventListener('compositionend', async function () {
        _.isComposing = false
        _.input.removeClass('composing')

        const inputValue = this.value.trim()
        _.lastValue = inputValue
        // 更新清除按钮状态
        _.upClearButton()

        if (!inputValue) {
          _.hideList()
          _.hideStatus()
          return
        }

        await _.search(source, inputValue)
      })

      // 键盘事件监听
      _.input.keydown(ev => {
        const items = _.dvList.find('.ac-item')

        if (items.length > 0) {
          // 向下键
          if (ev.key === 'ArrowDown') {
            ev.preventDefault()
            _.currentFocus = (_.currentFocus + 1) % items.length
            _.setActive(items)
          }
          // 向上键
          else if (ev.key === 'ArrowUp') {
            ev.preventDefault()
            _.currentFocus = (_.currentFocus - 1 + items.length) % items.length
            _.setActive(items)
          }

          // 回车键
          else if (ev.key === 'Enter') {
            ev.preventDefault()
            if (_.currentFocus > -1) {
              items[_.currentFocus].click()
            }
          }
        }
      })

      // 点击页面其他区域关闭下拉框
      _.page.view.click(ev => {
        if (!_.el.dom.contains(ev.target) && _.opt.refEl.every(el => !el.contains(ev.target))) {
          _.hideList()
        }
      })

      // 清除按钮事件
      _.btnClear.click(() => {
        _.input.val('')
        _.input.focus()
        _.showAllList()
        _.upClearButton()
        _.hideStatus()
      })

      // 搜索按钮事件
      _.btnSearch?.click(() => {
        const inputValue = _.input.val().trim()
        // 显示加载状态
        _.showStatus('查询中...')

        // 触发查询
        setTimeout(() => {
          if (inputValue) {
            const filteredData = _.filter(inputValue)
            _.showList(filteredData, inputValue)
          } else _.showAllList()

          _.hideStatus()
        }, 300)
      })

      if (addUrl && _.btnAdd) {
        _.btnAdd.click(ev => {
          const {addUrl} = opt

          const newWin = window.open(addUrl, '_blank')
          if (newWin) newWin.focus()
        })
      }
    } catch (e) {
      log.err(e, 'bind')
    }
  }

  /**
   * 查询选项
   * @param {*} source
   * @param {string} value
   */
  async search(source, value) {
    const _ = this
    try {
      if (!source?.url) return

      // 显示加载状态
      _.showStatus('查询中...')

      const {url} = source
      let {token} = source
      token = token ?? 'token'

      let {param} = source
      const tk = $.store.get(token)

      if (value) {
        if (param) param.value = value
        else param = {value}
      }

      const rs = await $.post(url, param, {'x-wia-token': tk})

      // 输入完成后再触发查询
      if (rs) {
        _.data = rs
        const filteredData = _.filter(value)
        _.showList(filteredData, value)
        _.hideStatus()
      }
    } catch (e) {
      log.err(e, 'search')
    }
  }

  // 更新清除按钮状态
  upClearButton() {
    const _ = this
    if (_.input.val().trim()) {
      _.btnClear.addClass('show')
    } else {
      _.btnClear.removeClass('show')
    }
  }
  /**
   * 过滤数据函数
   * @param {*} input
   * @returns
   */
  filter(input) {
    const _ = this
    let R = []
    try {
      const {data} = _
      if (data?.length) {
        if (Array.isArray(data[0])) R = data.filter(d => d[1].toLowerCase().includes(input.toLowerCase()))
        else R = data.filter(d => d.toLowerCase().includes(input.toLowerCase()))
      }
    } catch (e) {
      log.err(e, 'filter')
    }
    return R
  }

  //
  /**
   * 显示所有结果
   * @param {*[]} [data]
   * @returns
   */
  showAllList(data) {
    const _ = this

    if (data?.length) _.data = data
    else data = _.data

    if (!data?.length) return

    // 限制显示数量，避免性能问题
    const {maxItems} = _.opt
    const rs = data.slice(0, maxItems)
    _.dvList.empty()

    for (const r of rs) {
      const el = document.createElement('div')
      el.className = 'ac-item'
      /** @type {string|number} */
      let key
      let val = r
      if (Array.isArray(r) && r.length > 1) {
        ;[key, val] = r
        $(el).data('key', key)
      }

      el.textContent = val

      // 点击事件
      el.addEventListener('click', () => {
        _.lastValue = val
        _.input.val(val)
        if (key) _.input.data('key', key)
        _.upClearButton()
        _.hideList()
      })

      _.dvList.append(el)
    }

    if (data.length > maxItems) {
      // 添加提示信息
      const info = document.createElement('div')
      info.className = 'ac-item'
      info.innerHTML = `<i class="fas fa-info-circle"></i> 显示前 ${maxItems} 条，输入查看更多`
      _.dvList.append(info)
    }

    _.dvList.show()
    _.currentFocus = -1
  }

  /**
   * 显示查询结果
   * @param {string[]} data
   * @param {*} inputValue
   * @returns
   */
  showList(data, inputValue) {
    const _ = this

    if (data.length === 0) {
      _.hideList()
      _.dvList.html('<div class="autocomplete-item"><i class="fas fa-exclamation-circle"></i> 未找到匹配结果</div>')
      _.dvList.show()
      return
    }

    _.dvList.empty()

    for (const r of data) {
      const el = document.createElement('div')
      el.className = 'ac-item'

      /** @type {string|number} */
      let key
      let val = r
      // kv 二维数组
      if (Array.isArray(r) && r.length > 1) {
        ;[key, val] = r
        $(el).data('key', key)
      }

      // 高亮匹配字符
      const regex = new RegExp(inputValue, 'gi')
      const highlightedText = val.replace(regex, match => `<span class="ac-highlight">${match}</span>`)

      el.innerHTML = highlightedText

      // 点击事件
      el.addEventListener('click', () => {
        _.lastValue = val
        _.input.val(val)
        if (key) _.input.data('key', key)
        _.upClearButton()
        _.hideList()
      })

      _.dvList.append(el)
    }

    _.dvList.show()
    _.currentFocus = -1
  }

  // 隐藏结果
  hideList() {
    const _ = this
    // debugger
    _.dvList.hide()
  }

  /**
   * 设置高亮选项
   * @param {JQuery} items
   */
  setActive(items) {
    const _ = this

    if (!items?.length) return

    // 移除之前的高亮
    for (const item of items.get()) item.classList.remove('highlighted')

    if (_.currentFocus >= 0 && _.currentFocus < items.length) {
      items[_.currentFocus].classList.add('highlighted')
      // 滚动到可见区域
      items[_.currentFocus].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }

  /**
   * 显示状态指示器
   * @param {string} text
   */
  showStatus(text) {
    const _ = this

    _.btnClear.removeClass('show')

    _.dvStatus.dom.textContent = text
    _.dvStatus.addClass('show')

    if (text === '查询中...') {
      _.dvStatus.html(`${text}<span class="loading-spinner"></span>`)
    }
  }

  // 隐藏状态指示器
  hideStatus() {
    const _ = this

    _.dvStatus.removeClass('show')
    _.upClearButton()
  }
}
