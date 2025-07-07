/** @jsxImportSource @wiajs/core */
import {Event} from '@wiajs/core'
import {log as Log} from '@wiajs/util'

const log = Log({m: 'navTab'}) // 创建日志实例

/**
 * @typedef {{path?:string, title?:string, owner?:string,appName?:string,name?:string,param?:*, active?: boolean}} Tab
 */

/** @type {*} */
const {$} = window

// 缺省值
const def = {
  selector: '.data-table',
  active: 'prj/',
  domProp: 'wiaNavTab',
}

/**
 * 历史页面的导航条
 * 共用部件，不要使用全局变量！
 */
export default class NavTab extends Event {
  /** @type {Tab[]} */
  tabs = []
  /** @type {{li:HTMLElement, tab: Tab, dist: number}[]} */
  leftTabs = []
  /** @type {{li:HTMLElement, tab: Tab, dist: number}[]} */
  rightTabs = []

  /**
   *
   * @param {*} page 页面实例
   * @param {*} opts 选项
   */
  constructor(page, opts) {
    const opt = {...def, ...opts}
    super(opt, [page])
    const _ = this
    _.page = page
    _.view = page.view
    _.opt = opt
    // 容器
    const $el = opt.el || _.view.findNode(opt.selector)
    if ($el.length === 0) return undefined

    _.el = $el
    if (opt.tabs?.length) _.tabs = opt.tabs

    // 已创建，直接返回
    if (_.el.dom[opt.domProp]) {
      const instance = _.el.dom[opt.domProp]
      _.destroy()
      return instance
    }

    _.el.dom[opt.domProp] = _
    _.init()
    _.render()
    _.bind()
  }

  init() {
    const _ = this

    _.intObs = _.createObserver()
  }

  /**
   * 绑定点击事件
   */
  bind() {
    const _ = this
    try {
      const {el, tabs, opt} = _
      const {btnLeft, btnRight, lsLeft, lsRight} = opt

      btnLeft?.click(ev => {
        if (_.leftTabs.length === 0) return
        let cnt = el.find('li.nav-item.visible').length
        cnt = Math.min(cnt, _.leftTabs.length)
        _.intoView(_.leftTabs[cnt - 1].li)
      })

      btnRight?.click(ev => {
        if (_.rightTabs.length === 0) return
        let cnt = el.find('li.nav-item.visible').length
        cnt = Math.min(cnt, _.rightTabs.length)

        // 获取最接近右侧的元素
        _.intoView(_.rightTabs[cnt - 1].li)
      })

      // 点击下拉菜单
      lsLeft.click(ev => {
        const mu = lsLeft.find('.dropdown-menu')
        if (!mu?.hasClass('show')) mu?.addClass('show')
        else mu?.removeClass('show')
      })

      lsRight.click(ev => {
        const mu = lsRight.find('.dropdown-menu')
        if (!mu?.hasClass('show')) mu?.addClass('show')
        else mu?.removeClass('show')
      })

      const muLeft = lsLeft.find('.dropdown-menu')
      muLeft?.click(ev => {
        const el = $(ev).upper('a.dropdown-item')
        if (el.dom) {
          const path = el.attr('path')
          if (path) {
            _.active(path)
            $.go(path)
          }
        }
      })

      const muRight = lsRight.find('.dropdown-menu')
      muRight?.click(ev => {
        const el = $(ev).upper('a.dropdown-item')
        if (el.dom) {
          const path = el.attr('path')
          if (path) {
            _.active(path)
            $.go(path)
          }
        }
      })

      // tab点击
      el.click(ev => {
        const btn = $(ev).upper('.btn')
        if (btn.dom) {
          const path = btn.upper('.nav-item').find('.nav-link').data('path')
          if (path) _.delTab(path)
        } else {
          const link = $(ev).upper('.nav-link')
          if (link.dom) {
            const path = link.data('path')
            const r = tabs.find(v => v.path === path)
            if (path) $.go(path, r?.param)
          }
        }
      })

      // 路由事件标签页
      $.router.on('show', ev => {
        _.showTab(ev)
      })

      $.router.on('back', ev => {
        _.showTab(ev)
      })

      $.router.on('hide', ev => {
        // log(ev, 'router hide')
        // hideTab(ev)
      })

      // 捕获应用级别页面事件;
      $.app.on('pageShow', p => {
        if (p?.path) {
          console.log('pageShow:', p.path)
          // _.active(p.path)
        }
      })

      // 捕获应用级别页面事件;
      $.app.on('pageBack', p => {
        if (p?.path) {
          console.log('pageBack:', p.path)
          // _.active(p.path)
        }
      })
    } catch (e) {
      log.err(e, 'bind')
    }
  }

  createObserver() {
    let R
    const _ = this
    try {
      // 返回一个防抖函数,更新隐藏元素列表
      const upHandler = debounce(() => {
        _.upTabs()
        _.upButs()
      }, 300)

      // 创建观察器
      const obs = new IntersectionObserver(
        entries => {
          for (const entry of entries) {
            const li = entry.target
            // const id = li.dataset.id
            const {intersectionRatio: visibleRatio, isIntersecting} = entry
            const {path} = li.tab

            if (path === 'prj/index' || path === 'prj/detail') {
              console.log({len: entries.length, visibleRatio, isIntersecting}, 'IntObserver')
            }

            if (isIntersecting && visibleRatio >= 0.8) li.classList.add('visible')
            else if (!isIntersecting) li.classList.remove('visible')
          }

          // 更新隐藏元素列表
          upHandler()
        },
        {
          root: _.el.dom,
          threshold: [0.8, 1], // 1 全部可见，0.5 50%可见，支持数组，单个1 触发不准确，完全可视了没有监控到
        }
      )

      R = obs

      log({R}, 'createObserver')
    } catch (e) {
      log.err(e, 'createObserver')
    }
    return R
  }

  /**
   * 更新隐藏元素列表
   */
  upTabs() {
    const _ = this
    try {
      const {el, tabs, opt} = _
      const {lsLeft, lsRight} = opt

      _.leftTabs = []
      _.rightTabs = []

      const root = el.dom.getBoundingClientRect()

      const ls = el.find('li.nav-item:not(.visible)').get()

      for (const li of ls) {
        const rect = li.getBoundingClientRect()

        // 计算元素相对于navbar的位置
        const left = rect.left - root.left
        const right = rect.right - root.right
        /** @type {Tab} */
        const {tab} = li

        if (left < 0) {
          // 元素在可视区域左侧
          _.leftTabs.push({
            li,
            tab,
            dist: Math.abs(right),
          })
        } else if (right > 0) {
          // 元素在可视区域右侧
          _.rightTabs.push({
            li,
            tab: li.tab,
            dist: left - root.width,
          })
        }
      }

      // 按距离排序（距离近的在前）
      _.leftTabs.sort((a, b) => a.dist - b.dist)
      _.rightTabs.sort((a, b) => a.dist - b.dist)

      let mu = lsLeft.find('.dropdown-menu')
      mu.empty()
      for (const r of _.leftTabs) {
        const {tab} = r
        mu.append(
          <a path={tab.path} class="dropdown-item">
            {tab.title}
          </a>
        )
      }

      mu = lsRight.find('.dropdown-menu')
      mu.empty()

      for (const r of _.rightTabs) {
        const {tab} = r
        mu.append(
          <a path={tab.path} class="dropdown-item">
            {tab.title}
          </a>
        )
      }

      // 更新UI
      // updateHiddenPanels()
      log({leftTabs: _.leftTabs, rightTabs: _.rightTabs}, 'upTabs')
    } catch (e) {
      log.err(e, 'upTabs')
    }
  }

  // 更新按钮状态
  upButs() {
    const _ = this
    const {opt, leftTabs, rightTabs} = _
    // opt.btnLeft.dom.visible =

    if (leftTabs.length === 0) {
      opt.btnLeft?.hide()
      opt.lsLeft?.hide()
    } else {
      opt.btnLeft?.show()
      opt.lsLeft?.show()
    }

    // opt.btnRight.dom.visible =
    if (rightTabs.length === 0) {
      opt.btnRight.hide()
      opt.lsRight.hide()
    } else {
      opt.btnRight.show()
      opt.lsRight.show()
    }
  }

  showBtns() {
    const _ = this
    const {opt} = _
    opt.btnLeft?.show()
    opt.btnRight?.show()
    opt.lsLeft?.show()
    opt.lsRight?.show()
  }

  /**
   * 显示tab，不存在创建，存在则显示并激活
   * @param {Tab} tab
   * @param {boolean} [init]
   */
  showTab(tab, init = false) {
    const _ = this
    try {
      const {el, tabs} = _

      const {name, path, appName, param, title, active} = tab
      if (path === 'master') return

      let r
      if (!init) {
        r = tabs.find(v => v.path === path)
        tab.active = true
        if (!r) tabs.push(tab)
      }

      // _.showBtns() // 后续显示按钮，可视区缩小，激活的标签可能被隐藏

      if (r) _.active(r.path)
      else {
        let li = (
          <li class="nav-item">
            <a class="nav-link active" data-path={path}>
              {title}
            </a>
            <button type="button" class="btn btn-tool">
              <i class="icon f7icon">delete_md</i>
            </button>
          </li>
        )
        el.find('a.nav-link.active').removeClass('active')
        el.append(li)
        li = el.dom.lastElementChild
        li.tab = tab // 保存到 li中
        // 渲染完成后启动子元素li观察，避免监视失败
        setTimeout(() => {
          _.observe(li)
          _.intoView(li)
        }, 100)
      }
    } catch (e) {
      log.err(e, 'navTab')
    }
  }

  /**
   *
   * @param {HTMLElement} li
   */
  intoView(li) {
    const _ = this
    try {
      if (!_.inView(li)) {
        _.showBtns() // 后续显示按钮，可视区缩小，激活的标签可能被隐藏
        $.nextTick(() => li.scrollIntoView(), 0)
      }

      // log.info({li}, 'intoView')
    } catch (e) {
      log.err(e, 'intoView')
    }
  }

  /**
   * 是否在可视区域
   * @param {HTMLElement} li
   * @returns {boolean}
   */
  inView(li) {
    let R = false
    const _ = this
    try {
      const {el} = _

      const root = el.dom.getBoundingClientRect()
      const rect = li.getBoundingClientRect()
      const left = rect.left - root.left
      const right = rect.right - root.right
      R = left >= 0 && right <= 0
    } catch (e) {
      log.err(e, 'inView')
    }
    return R
  }

  /**
   *
   * @param {*} item
   */
  observe(item) {
    const _ = this
    _.intObs.observe(item)
  }

  /**
   * 删除tab
   * @param {string} path
   */
  delTab(path) {
    const _ = this
    try {
      const {el, tabs} = _
      if (path === 'master') return

      const i = tabs.findIndex(v => v.path === path)
      const r = tabs[i]
      if (r) {
        tabs.splice(i, 1)
        el.find(`a.nav-link[data-path="${path}"]`).upper('li.nav-item').remove()
        if (r.active) $.back()
      }
    } catch (e) {
      log.err(e, 'delTab')
    }
  }

  /**
   *
   * @param {*} param
   */
  hideTab({name, path, appName, param, title} = {}) {
    const _ = this
    try {
      if (path === 'master') return

      const {el, tabs} = _
      const id = tabs.findIndex(v => v.path === path)
      if (id > -1) {
        tabs.splice(id, 1)

        const menu = (
          <li class="nav-item">
            <a class="nav-link" data-widget="pushmenu" role="button">
              <i class="icon wiaicon">&#xe675;</i>
            </a>
          </li>
        )

        const nav = tabs.map(v => {
          return (
            <li class="nav-item d-none d-sm-inline-block" data-path={path}>
              <a class={`nav-link ${v.active && 'active'}`}>{v.title}</a>
            </li>
          )
        })
        nav.unshift(menu)
        el.empty().html(nav.join(''))
      }
    } catch (e) {
      log.err(e, 'hideTab')
    }
  }

  /**
   *
   * @returns
   */
  render() {
    const _ = this
    try {
      const {el, tabs, opt} = _
      if (tabs?.length) for (const tab of tabs) _.showTab(tab, true)
      else el.empty()

      if (opt.active) _.active(opt.active)

      // 获取所有导航项
      // const ls = el.find('li.nav-item').get()
      // for (const li of ls) _.observe(li)

      // _.bind()
    } catch (e) {
      log(e, 'render')
    }
  }

  /**
   * 激活tab
   * @param {*} path
   */
  active(path) {
    const _ = this

    try {
      const {el, tabs} = _
      if (!path || !tabs.length) return

      let tab = el.find('a.nav-link.active')
      if (tab?.data('path') !== path) {
        tab.removeClass('active')
        tab = el.find(`a.nav-link[data-path="${path}"]`)
        if (tab.dom) tab.addClass('active')
      }

      const li = tab.upper('li.nav-item')
      if (li.dom) _.intoView(li.dom)
    } catch (ex) {
      console.log('active exp:', ex.message)
    }
  }
}

/**
 * 防抖，返回一个回调函数，限定时间内，多次执行时，仅执行一次
 * 使用时，需多次执行 该函数返回的函数
 * @param {() => void} func
 * @param {number} [wait]
 * @returns {(...args: any[]) => void}
 */
const debounce = (func, wait = 300) => {
  /** @type {NodeJS.Timeout} */
  let timer
  return function (...args) {
    clearTimeout(timer)
    // 设置新的定时器
    timer = setTimeout(() => {
      func.apply(this, args)
    }, wait)
  }
}
