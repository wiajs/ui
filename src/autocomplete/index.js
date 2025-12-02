/** @jsxImportSource @wiajs/core */
/**
 * 带搜索、新增功能的自动完成输入组件
 *
 * 功能特性：
 * 1、支持本地数据和远程数据源
 * 2、支持键盘导航和鼠标操作
 * 3、支持中文输入法
 * 4、支持清除和搜索按钮
 * 5、支持状态指示器
 * 6、支持关联元素，点击不关闭下拉列表
 * 7、支持新增网址按钮
 * 8、限制显示数量，避免性能问题
 * 9、支持键值对数据（统一[key, value]格式）
 * 10、支持高亮匹配字符
 * 11、支持数据缓存，避免重复查询，查询的数据与缓存数据合并去重
 * 12、支持多实例，实例之间共享数据，比如 列表编辑，同一列多行使用同一数据源
 * 13、支持原值显示
 * 14、不被父滚动元素overflow隐藏，如限制高度的表格容器
 * 15、点击查询按钮，触发查询，没有输入时按限制条数查询、返回数据
 * 16、输入框输入时，按输入内容过滤显示，不触发查询
 * 14、下拉列表挂载page-content，跟随input滚动，不被overflow隐藏
 * 16、输入时本地过滤，空值时显示所有列表
 * 17、滚动内部父元素，自动隐藏列表
 * 18、改变窗口大小，自动隐藏列表
 * 19、所有ac input 共用一个 list
 *
 * ai：
 * 2025-06-12 10:00:00
    以上代码是个 带搜索的自动完成输入组件，需修改，实现如下功能：
    1、点击 input 输入框，或者不输入点击搜索时，显示下拉选项列表时，列表的第一个值，为外部通过 opts 传入的 value值
    2、input输入框中输入字符时，不触发 search接口，只对缓存在 data中的数据，进行过滤、高亮
    3、点击搜索按钮，无论输入框是否有值，都触发调用搜索接口，从传入的source参数获取数据
    4、获取的数据为二维数组，子数组有两个值，类似[key, value]数据对，如果数组元素不是数组，而是value值，需将值转换为[value, value]形式的数组
    5、返回的数据与缓存的data中的数据进行合并，key、value 值对不能重复（同时判断key与value）
    6、下拉列表中显示key value中的value，选择value，value填入input，key存入input的 data-key 属性中
    7、提供clear函数，清空缓存的 data 数据
    8、提供setData函数，设置下拉数据，并显示下拉列表
    9、提供addData函数，向下拉添加数据（数据不可重复），并显示下拉列表
    10、下拉列表不能被父容器的 overflow 隐藏，需挂载在 传入的 page.view上，view类型为jQuery实例，位置还是在input的下面，类似select，不被其他页面元素遮挡。

 */
import {Event} from '@wiajs/core'
import {log as Log} from '@wiajs/util'

const log = Log({m: 'autoComplete'}) // 创建日志实例

/**
 * @typedef {import('jquery')} $
 * @typedef {JQuery} Dom
 * @typedef {import('@wiajs/core').Page} Page
 */

/** @typedef {object} Opts
 * @prop {Dom} el - 容器元素
 * @prop {boolean} [status] - 状态指示器
 * @prop {boolean} [search] - 显示搜索按钮
 * @prop {boolean} [clear] - 显示清除按钮
 * @prop {number} [maxItems] - 最大显示数量
 * @prop {*[]} [data] - 初始数据（会自动转为[key, value]格式）
 * @prop {string} [name] - input 名称
 * @prop {string|number} [value] - 初始值（显示在列表第一个）
 * @prop {string} [placeholder] - 输入框占位符
 * @prop {HTMLElement[]} [refEl] - 关联元素，点击不关闭列表
 * @prop {{url:string, token:string, param?:object}} [source] - 远程数据源配置
 * @prop {string} [addUrl] - 新增网址
 * @prop {number} [gap] - // 列表与输入框的间隙（默认4px）
 */

/** @typedef {object} Opt
 * @prop {Dom} el - 容器元素
 * @prop {boolean} status - 状态指示器
 * @prop {boolean} search - 显示搜索按钮
 * @prop {boolean} clear - 显示清除按钮
 * @prop {*[]} data - 缓存数据（已转为[key, value]格式）
 * @prop {string} name - input 名称
 * @prop {string|number} value - 初始值
 * @prop {string} placeholder - 占位符
 * @prop {number} maxItems - 最大显示数量
 * @prop {HTMLElement[]} refEl - 关联元素
 * @prop {{url:string, token:string, param?:object}} source - 远程数据源
 * @prop {string} addUrl - 新增网址
 * @prop {number} gap - // 列表与输入框的间隙（默认4px）
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
  name: '',
  value: undefined,
  placeholder: '',
  gap: 4, // 列表与输入框的间隙（默认4px）
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
  /** @type {Page} */
  page
  /** @type {Dom} */
  pageContent // page-content容器（相对定位，内部滚动）
  /** @type {[string, string][]} */
  data = [] // 缓存数据（统一[key, value]格式）

  currentFocus = -1 // 当前高亮选项索引
  isComposing = false // 是否在中文输入过程中
  lastValue = '' // 上一次的值（用于防抖）
  optValueKv = null // 传入value转换后的[key, value]格式
  scrollListener = null // 滚动监听函数引用（用于解绑）
  listMaxHeight = 300 // 列表最大高度（与样式一致）
  btnTrigger = false // 内部按钮点击，不触发 blur 事件
  selTrigger = false // 内部选择点击，不触发 focus的showAllList 事件
  searchTrigger = false // 内部选择点击，不触发 focus的showAllList 事件
  arrowTrigger = false // 内部按键，上下按键

  /**
   * 构造
   * @param {Page} page 页面实例
   * @param {Opts} opts 选项
   */
  constructor(page, opts) {
    /** @type{Opt} */
    const opt = {...def, ...opts}
    super(opt, [page])
    const _ = this

    _.page = page // Page实例
    _.opt = opt

    // 处理初始值，转为[key, value]格式
    _.optValueKv = opt.value !== undefined ? _.convertToKvArray(opt.value) : null

    // 处理初始数据，转为[key, value]格式并去重
    _.data = _.mergeAndDeduplicateData([], opt.data)

    let {el} = opt
    if (typeof el === 'string') el = $(el)

    if (el?.dom) {
      _.el = el
      el.dom._wiaAutocomplete = _ // 关联实例

      // 查找page-content容器（相对定位，内部滚动）
      _.pageContent = _.page.view.find('.page-content')
      if (!_.pageContent.length) {
        log.warn('未找到.page-content容器，默认使用page.view')
        _.pageContent = _.page.view
      }

      _.init()
      _.bind()
      // 设置输入框placehold值
      if (_.optValueKv) {
        _.input.val(_.optValueKv[1])
        _.input.data('key', _.optValueKv[0])
        _.lastValue = _.optValueKv[1]
    }
      _.upClearButton()

      // 如果 param 中有 q 参数，初始化时先调用一次 search
      if (opt.source?.param && 'q' in opt.source.param) {
        ;(async () => {
          try {
            _.showStatus('查询中...')
            await _.search(opt.source, '')
            // 查询完成后显示列表
            _.showAllList()
          } catch (e) {
            log.err(e, 'init search')
          } finally {
            _.hideStatus()
          }
        })()
      }
    }
  }

  /**
   * 工具函数：将任意数据转为[key, value]格式
   * @param {*} item 要转换的数据
   * @returns {[string, string]} [key, value]数组
   */
  convertToKvArray(item) {
    if (Array.isArray(item) && item.length >= 2) {
      // 已是[key, value]格式，取前两个元素并转为字符串
      return [String(item[0]), String(item[1])]
    }
    // 单个值，转为[value, value]格式
    const val = String(item)
    return [val, val]
  }

  /**
   * 工具函数：合并数据并去重（key和value都相同才视为重复）
   * @param {[string, string][]} existingData 原有数据
   * @param {*[]} newData 新数据（可单个值或数组）
   * @returns {[string, string][]} 合并去重后的数据
   */
  mergeAndDeduplicateData(existingData, newData) {
    const _ = this
    // 处理新数据格式：如果 newData 为空或未定义，直接返回空数组
    if (!newData || (Array.isArray(newData) && newData.length === 0)) {
      return existingData
    }
    const processedNewData = (Array.isArray(newData) ? newData : [newData]).map(item => _.convertToKvArray(item)).filter(kv => kv[0] && kv[1]) // 过滤空数据

    // 合并原有数据和新数据
    const combined = [...existingData, ...processedNewData]
    // 用key+value作为唯一标识去重
    const uniqueMap = new Map()
    combined.forEach(kv => {
      const uniqueKey = `${kv[0]}_${kv[1]}`
      if (!uniqueMap.has(uniqueKey)) {
        uniqueMap.set(uniqueKey, kv)
      }
    })
    return Array.from(uniqueMap.values())
  }

  init() {
    const _ = this
    try {
      const {el, opt} = _
      const {status, search, addUrl, clear, name, source} = opt
      const {placeholder = '请输入'} = opt

      _.wrapper = el.find('.ac-wrapper')

      // 生成容器和输入框
      if (!_.wrapper?.length) {
        _.wrapper = $(
          <div class="ac-wrapper">
            <input
              type="text"
              name={name}
              class="ac-input"
              placeholder={placeholder}
              autocomplete="off"
              // value={_.optValueKv?.[1] || ''}
            />
          </div>
        ).appendTo(el)
      }

      const {wrapper} = _
      _.input = wrapper.find('.ac-input')

      // 添加清除按钮
      if (clear) {
        _.btnClear = $(
          <button type="button" class="ac-clear">
            <i class="icon wiaicon">&#xe9fb;</i>
          </button>
        ).appendTo(wrapper)
      }

      // 添加搜索按钮
      if (search && source) {
        _.btnSearch = $(
          <button type="button" class="ac-search">
            <i class="icon wiaicon">&#xeabd;</i>
          </button>
        ).appendTo(wrapper)
      } else _.btnClear.css('right', '3px')

      // 添加新增按钮
      if (addUrl) {
        el.addClass('has-add')
        _.btnAdd = $(
          <button type="button" class="ac-add">
            <i class="icon wiaicon">&#xea63;</i>
          </button>
        ).appendTo(wrapper)
      }

      // 添加状态指示器
      if (status) _.dvStatus = $(<div class="ac-status" />).appendTo(wrapper)

      // 全局共享一个 list
      _.dvList = _.pageContent.find('.ac-list')
      // 关键修改：下拉列表挂载到page-content（相对定位，内部滚动） name={`${name}AcList`}
      if (!_.dvList?.length) _.dvList = $(<div class="ac-list" />).appendTo(_.pageContent)
      _.hideList() // 初始隐藏
    } catch (e) {
      log.err(e, 'init')
    }
  }

  bind() {
    const _ = this
    try {
      const {el, input, opt, wrapper, data, dvList} = _
      const {source, addUrl} = opt

      // 清除按钮事件（添加mousedown标记，click执行原有逻辑）
      _.btnClear?.on('mousedown', () => {
        _.btnTrigger = true
      })

      _.btnSearch?.on('mousedown', () => {
        _.btnTrigger = true
      })

      // 清除按钮事件
      _.btnClear?.click(() => {
        _.input.val('')
        _.input.data('key', '')
        _.lastValue = ''
        _.hideStatus()
        _.upClearButton()
        // setTimeout(() => {
        //   _.input.focus()
        //   _.showAllList()
        // }, 100)
        _.input.focus()
      })

      input.blur(ev => {
        const {btnTrigger} = _

        // 若标记为清除按钮触发，不发射事件，且重置标记
        if (btnTrigger) {
          _.btnTrigger = false // 重置标记，避免影响后续blur
          return
        }

        _.hideList() // 隐藏 列表
        _.emit('local::blur', ev)
      })

      // 输入框聚焦时显示所有列表
      input.focus(ev => {
        if (_.selTrigger) {
          _.selTrigger = false
          return
        }

        if (_.searchTrigger) {
          _.searchTrigger = false
          return
        }

        _.showAllList()
      })

      // 输入事件监听（需求2：只过滤本地数据，不触发接口）
      input.input(function (ev) {
        const inputValue = this.value.trim()

        if (_.isComposing) return // 中文输入过程中忽略

        // 更新清除按钮状态
        _.upClearButton()

        // 值未变化时忽略
        if (inputValue === _.lastValue) return
        _.lastValue = inputValue

        // 关键修改：空值时显示所有列表，而非隐藏
        if (!inputValue.trim()) {
          _.showAllList() // 显示所有列表
          _.hideStatus()
          return
        }

        // await _.search(source, inputValue)
        // 只过滤本地缓存数据
        const filteredData = _.filter(inputValue)
        _.showList(filteredData, inputValue)
      })

      // 中文输入法开始
      input.dom.addEventListener('compositionstart', () => {
        _.isComposing = true
        _.input.addClass('composing')
        _.showStatus('输入中...')
      })

      // 中文输入法结束
      input.dom.addEventListener('compositionend', function () {
        _.isComposing = false
        _.input.removeClass('composing')

        const inputValue = this.value.trim()
        _.lastValue = inputValue
        _.upClearButton()

        // 关键修改：空值时显示所有列表，而非隐藏
        if (!inputValue) {
          _.showAllList() // 显示所有列表
          _.hideStatus()
          return
        }

        // await _.search(source, inputValue)
        // 只过滤本地缓存数据
        const filteredData = _.filter(inputValue)
        _.showList(filteredData, inputValue)
        _.hideStatus()
      })

      // 键盘事件监听
      input.keydown(ev => {
        const items = _.dvList.find('.ac-item')
        if (items.length > 0) {
          if (ev.key === 'ArrowDown') {
            // 向下键
            _.arrowTrigger = true
            ev.preventDefault()
            _.currentFocus = (_.currentFocus + 1) % items.length
            _.setActive(items)
          } else if (ev.key === 'ArrowUp') {
          // 向上键
            _.arrowTrigger = true
            ev.preventDefault()
            _.currentFocus = (_.currentFocus - 1 + items.length) % items.length
            _.setActive(items)
          } else if (ev.key === 'Enter') {
          // 回车键
            if (_.arrowTrigger) {
            ev.preventDefault()
            if (_.currentFocus > -1) {
                items.eq(_.currentFocus).click()
          }
            } else _.btnSearch?.click()
        }
        } else _.btnSearch?.click()
      })

      // 点击页面其他区域关闭下拉框
      // _.page.view.click(ev => {
      //   if (!_.el.dom.contains(ev.target) && _.opt.refEl.every(el => !el.contains(ev.target))) {
      //     _.hideList()
      //   }
      // })

      // 搜索按钮事件（无论是否有值都触发接口）
      _.btnSearch?.click(async () => {
        const inputValue = _.input.val().trim()
        _.showStatus('查询中...')

        try {
          await _.search(opt.source, inputValue)
          // 接口返回后显示列表
          inputValue ? _.showList(_.filter(inputValue), inputValue) : _.showAllList()
          _.searchTrigger = true
          input.focus()
        } catch (e) {
          log.err(e, 'btnSearch click')
          _.dvList.html('<div class="ac-item"><i class="fas fa-exclamation-circle"></i> 查询失败，请重试</div>')
          _.updateListPosition()
        } finally {
          _.hideStatus()
        }
      })

      if (addUrl && _.btnAdd) {
        // 新增按钮事件
        _.btnAdd.click(ev => {
          const newWin = window.open(addUrl, '_blank')
          if (newWin) newWin.focus()
        })
      }

      _.scroll()
    } catch (e) {
      log.err(e, 'bind')
    }
  }

  /**
   * 滚动时，隐藏列表
   */
  scroll() {
    const _ = this
    try {
      const {input, pageContent} = _
      // 关键：监听page-content滚动事件，实现列表跟随input滚动
      // _.scrollListener = () => {
      //   if (_.dvList.is(':visible')) _.updateListPosition()
      // }
      // _.pageContent.on('scroll', _.scrollListener) 监听之外的层

      // 5) 滚动/缩放/软键盘：统一用 rAF 节流读取 rect
      let ticking = false
      const schedule = () => {
        if (ticking) return
        ticking = true
        requestAnimationFrame(() => {
          ticking = false
          _.hideList()
          input.blur()
        })
      }

      // 5.1 全局窗口尺寸
      window.addEventListener('resize', schedule, {passive: true})

      // 5.2 可滚动祖先：找到并监听（被 A/B/C 滚动时也能跟随）
      const scrollables = new Set()

      const isScrollable = el => {
        if (!(el instanceof Element)) return false
        const s = getComputedStyle(el)
        return /(auto|scroll|overlay)/.test(s.overflow + s.overflowX + s.overflowY)
      }

      for (let p = input.dom.parentNode; p && p !== document; p = p.parentNode || p.host) {
        if (isScrollable(p)) {
          if (p === pageContent.dom) break
          scrollables.add(p)
        }
      }

      for (const s of scrollables) s.addEventListener('scroll', schedule, {passive: true})
    } catch (e) {
      log.err(e, 'scroll')
    }
  }

  /**
   * 调用搜索接口获取数据
   * @param {Opt['source']} source 数据源配置
   * @param {string} value 输入框值
   */
  async search(source, value) {
    const _ = this
    try {
      if (!source?.url) throw new Error('未配置搜索接口地址')

      // 显示加载状态
      // _.showStatus('查询中...')

      const {url, token = 'token', param = {}} = source
      const tk = $.store.get(token)

      // 构建请求参数
      const requestParam = {...param, value}

      const rs = await $.post(url, requestParam, {'x-wia-token': tk})

      // 输入完成后再触发查询
      if (rs && Array.isArray(rs)) {
        // 需求4：转换数据格式为[key, value]
        const processedData = rs.map(item => _.convertToKvArray(item))
        // 合并数据并去重
        _.data = _.mergeAndDeduplicateData(_.data, processedData)
        // _.data = rs
        // const filteredData = _.filter(value)
        // _.showList(filteredData, value)
        // _.hideStatus()
      }
    } catch (e) {
      log.err(e, 'search')
    }
  }

  focus() {
    this.input.focus()
  }

  val() {
    return this.input.val()
  }

  key() {
    return this.input.data('key')
  }

  /**
   * 更新清除按钮显示状态
   */
  upClearButton() {
    const _ = this
    if (!_.btnClear) return
    _.input.val().trim() ? _.btnClear.addClass('show') : _.btnClear.removeClass('show')
  }

  /**
   * 过滤本地缓存数据（根据value匹配），包含 _.data 和 optValueKv 两组数据
   * @param {string} input 输入值
   * @returns {[string, string][]} 过滤后的[key, value]数组（去重）
   */
  filter(input) {
    let R = []
    const _ = this
    try {
      const inputLower = input.toLowerCase()
      // return _.data?.filter(([x, val]) => val.toLowerCase().includes(inputLower))

      // 处理空值：将 null/undefined 转为空数组，避免过滤报错
      const dataList = _.data || []
      const optValueKvList = _.optValueKv ? [_.optValueKv] : []

      // 统一过滤规则：val 转小写后包含输入值小写
      // @ts-expect-error
      const fun = ([key, val]) => {
        return val ? val.toLowerCase().includes(inputLower) : false
    }
      // 分别过滤两组数据
      const filteredData = dataList.filter(fun)
      const filteredOptValueKv = optValueKvList.filter(fun)

      // 合并并去重（基于 key+value 组合去重，保留先出现的条目）
      const mergedMap = new Map()
      // 先放 _.data 的结果，优先级更高
      filteredData.forEach(kv => {
        const uniqueKey = `${kv[0]}_${kv[1]}`
        if (!mergedMap.has(uniqueKey)) {
          mergedMap.set(uniqueKey, kv)
        }
      })
      // 后放 optValueKv 的结果，重复的会被忽略
      filteredOptValueKv.forEach(kv => {
        const uniqueKey = `${kv[0]}_${kv[1]}`
        if (!mergedMap.has(uniqueKey)) {
          mergedMap.set(uniqueKey, kv)
        }
      })

      // 转回 [key, value] 数组格式
      R = Array.from(mergedMap.values())
    } catch (e) {}

    return R
  }

  show() {
    const _ = this
    const {el} = _
    el.show()
  }

  hide() {
    const _ = this
    const {dvList, el} = _
    el.hide()
    _.hideList()
  }

  /**
   * 显示所有列表（第一个值为传入的value）
   * @param {*[]} [data] 可选传入数据（会合并到缓存）
   */
  showAllList(data) {
    const _ = this
    try {
      // 处理传入数据，合并到显示数据中
      const displayData = data ? _.mergeAndDeduplicateData(_.data, data) : [..._.data]

      // 需求1：添加传入的value到列表第一个位置（去重）
      if (_.optValueKv) {
        const isDuplicate = displayData.some(([key, val]) => key === _.optValueKv[0] && val === _.optValueKv[1])
        if (!isDuplicate) displayData.unshift(_.optValueKv)
      }

      if (!displayData.length) {
        _.dvList.html('<div class="ac-item"><i class="fas fa-info-circle"></i> 暂无数据</div>')
        _.updateListPosition()
        return
      }

    // 限制显示数量，避免性能问题
    const {maxItems} = _.opt
      const rs = displayData.slice(0, maxItems)
    _.dvList.empty()

      for (const [key, val] of rs) {
        const el = $('<div class="ac-item"></div>')
          .text(val)
          .data('key', key)
          .mousedown(() => {
            _.btnTrigger = true
          })
          .click(() => {
            _.selTrigger = true
            _.input.val(val).data('key', key).focus()
        _.lastValue = val
        _.upClearButton()
        _.hideList()
      })
          .appendTo(_.dvList)
    }

      // 添加超出数量提示
      if (displayData.length > maxItems) {
        const infoEl = $('<div class="ac-item"></div>').html(`<i class="fas fa-info-circle"></i> 显示前 ${maxItems} 条，共 ${displayData.length} 条`)
        _.dvList.append(infoEl)
    }

      // 更新列表位置（关键）
      _.updateListPosition()
    _.currentFocus = -1
    } catch (e) {
      log.err(e, 'showAllList')
    }
  }

  /**
   * 显示过滤后的列表（带高亮）
   * @param {[string, string][]} data 过滤后的[key, value]数组
   * @param {string} inputValue 输入值（用于高亮）
   */
  showList(data, inputValue) {
    const _ = this

    if (data.length === 0) {
      _.dvList.html('<div class="ac-item"><i class="fas fa-exclamation-circle"></i>匹配失败</div>')
      _.updateListPosition()
      return
    }

    _.dvList.empty()
      // 高亮匹配字符
      const regex = new RegExp(inputValue, 'gi')

    // 渲染列表项（需求6：显示value，存储key，高亮匹配）
    for (const [key, val] of data) {
      const highlightedText = val.replace(regex, match => `<span class="ac-highlight">${match}</span>`)

      const el = $('<div class="ac-item"></div>')
        .html(highlightedText)
        .data('key', key)
        .mousedown(() => {
          _.btnTrigger = true
        })
        .on('click', () => {
          _.selTrigger = true
          _.input.val(val).data('key', key).focus()
        _.lastValue = val
        _.upClearButton()
        _.hideList()
      })
        .appendTo(_.dvList)
    }

    // 更新列表位置（关键）
    _.updateListPosition()
    _.currentFocus = -1
  }

  /**
   * 隐藏下拉列表
   */
  hideList() {
    this.dvList?.hide()
    this.arrowTrigger = false
  }

  /**
   * 设置高亮选项
   * @param {JQuery} items 列表项JQuery集合
   */
  setActive(items) {
    const _ = this
    if (!items.length) return

    // 移除所有高亮
    items.removeClass('highlighted')
    // 设置当前高亮
    if (_.currentFocus >= 0 && _.currentFocus < items.length) {
      items.eq(_.currentFocus).addClass('highlighted')
      // 滚动到可见区域
      items[_.currentFocus].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }

  /**
   * 显示状态指示器
   * @param {string} text 状态文本
   */
  showStatus(text) {
    const _ = this
    if (!_.dvStatus) return

    _.btnClear?.removeClass('show')
    _.dvStatus.text(text).addClass('show')
    if (text === '查询中...') {
      _.dvStatus.html(`${text}<span class="loading-spinner"></span>`)
    }
  }

  /**
   * 隐藏状态指示器
   */
  hideStatus() {
    const _ = this
    if (!_.dvStatus) return

    _.dvStatus.removeClass('show')
    _.upClearButton()
  }

  /**
   * 核心优化：基于page-content（相对定位）的列表位置计算
   * 列表跟随input滚动，宽度一致，不被overflow隐藏
   * 核心优化：自动上下适配弹出的列表位置计算
   * 逻辑：优先向下弹出，下方空间不足时向上弹出（列表底部对齐input顶部）
   */
  updateListPosition() {
    const _ = this
    try {
      // 列表最大高度（与样式一致）
      const {input, dvList, pageContent, opt} = _
      let {listMaxHeight} = _
      const {gap} = opt

      if (!input || !dvList || !pageContent) return

      // debugger

      // 1. 获取关键元素的位置和尺寸信息（基于视口，不受滚动影响）
      const prev = {
        visibility: dvList.dom.style.visibility,
      }
      dvList.dom.style.visibility = 'hidden'
      dvList.show()

      const listRect = dvList.rect()
      const inputRect = input.rect() // 输入框视口位置
      const contentRect = pageContent.rect() // page-content视口位置
      const viewportHeight = window.innerHeight // 视口高度

      // 2. 计算page-content的滚动和内边距信息（定位基准）
      const contentScrollLeft = pageContent.scrollLeft() // page-content横向滚动距离
      const contentScrollTop = pageContent.scrollTop() // page-content纵向滚动距离
      // const contentPaddingLeft = parseInt(pageContent.css('paddingLeft')) || 0 // page-content左内边距
      // const contentPaddingTop = parseInt(pageContent.css('paddingTop')) || 0 // page-content上内边距

      // 3. 计算输入框相对于page-content的基础位置（用于定位）
      const inputLeft = inputRect.left - contentRect.left + contentScrollLeft
      //  - contentPaddingLeft
      const inputTop = inputRect.top - contentRect.top + contentScrollTop
      //  - contentPaddingTop
      const listHeight = Math.min(listRect.height, listMaxHeight)

      // 4. 空间检测：计算上下可用空间（基于视口，判断是否足够显示列表）
      const spaceBelow = viewportHeight - inputRect.bottom - gap // 输入框下方可用空间
      const spaceAbove = inputRect.top - gap // 输入框上方可用空间
      const needUpward = spaceBelow < listHeight && spaceAbove >= listHeight // 是否需要向上弹出

      // 5. 计算列表最终位置（完全基于pageContent内部坐标）
      const listLeft = inputLeft
      let listTop = inputTop + inputRect.height + gap // 向下弹出：列表顶部 = 输入框底部 + 间隙

      if (needUpward) listTop = inputTop - listHeight - gap // 向上弹出：列表底部 = 输入框顶部 - 间隙

      // 修正：防止列表超出pageContent顶部边界（极端情况兜底）
      if (listTop < 0) listTop = 0

      // 防止列表超出pageContent底部边界（向下弹出时兜底）
      if (!needUpward && inputRect.bottom + gap + listHeight > contentRect.height) {
        const calculatedHeight = contentRect.height - inputRect.bottom - gap
        listMaxHeight = Math.max(50, calculatedHeight) // 确保最小高度为50px
      }

      // 6. 强制列表样式，确保与input对齐且跟随滚动
      _.dvList.css({
        left: `${listLeft}px`,
        top: `${listTop}px`,
        width: `${inputRect.width}px`, // 与输入框宽度完全一致
        maxHeight: `${listMaxHeight}px`, // 固定最大高度
      })

      dvList.dom.style.visibility = prev.visibility
    } catch (e) {
      log.err(e, 'updateListPos')
    }
  }

  /**
   * 清空缓存数据
   */
  clearData() {
    this.data = []
    this.hideList()
  }

  /**
   * 设置下拉数据（覆盖原有数据）并显示列表
   * @param {*[]} data 要设置的数据（单个值或数组）
   */
  setData(data) {
    const _ = this
    // 处理数据格式并去重
    _.data = _.mergeAndDeduplicateData([], data)
    _.showAllList()
  }

  /**
   * 添加下拉数据（不重复）并显示列表
   * @param {*|*[]} data 要添加的数据（单个值或数组）
   */
  addData(data) {
    const _ = this
    // 合并数据并去重
    _.data = _.mergeAndDeduplicateData(_.data, data)
    _.showAllList()
  }

  /**
   * 组件销毁时解绑事件（避免内存泄漏）
   */
  destroy() {
    const _ = this
    // 移除滚动监听
    if (_.pageContent && _.scrollListener) {
      _.pageContent.off('scroll', _.scrollListener)
    }
    // 移除列表元素
    if (_.dvList) _.dvList.remove()

    super.destroy()
  }
}
