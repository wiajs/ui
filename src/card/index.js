/**
 * --------------------------------------------
 * AdminLTE CardWidget.js
 * License MIT
 * --------------------------------------------
 */

import {Event} from '@wiajs/core'
import {Page} from '@wiajs/core'

/**
 * Constants
 * ====================================================
 */

const NAME = 'CardWidget'
const DATA_KEY = 'wia.cardwidget'
const EVENT_KEY = `.${DATA_KEY}`
const JQUERY_NO_CONFLICT = $.fn[NAME]

const EVENT_EXPANDED = `expanded${EVENT_KEY}`
const EVENT_COLLAPSED = `collapsed${EVENT_KEY}`
const EVENT_MAXIMIZED = `maximized${EVENT_KEY}`
const EVENT_MINIMIZED = `minimized${EVENT_KEY}`
const EVENT_REMOVED = `removed${EVENT_KEY}`

const CLASS_NAME_CARD = 'card'
const CLASS_NAME_COLLAPSED = 'collapsed-card'
const CLASS_NAME_COLLAPSING = 'collapsing-card'
const CLASS_NAME_EXPANDING = 'expanding-card'
const CLASS_NAME_WAS_COLLAPSED = 'was-collapsed'
const CLASS_NAME_MAXIMIZED = 'maximized-card'

const SELECTOR_DATA_REMOVE = '[data-card-widget="remove"]'
const SELECTOR_DATA_MAXIMIZE = '[data-card-widget="maximize"]'

const SELECTOR_CARD = `.${CLASS_NAME_CARD}`
const SELECTOR_CARD_HEADER = '.card-header'
const SELECTOR_CARD_BODY = '.card-body'
const SELECTOR_CARD_FOOTER = '.card-footer'

/**
 * @typedef {Object} Opts
 * @prop {string} [el] 容器
 * @prop {string} [collapseIcon] 图标
 * @prop {string} [expandIcon] 图标
 * @prop {string} [maximizeIcon] 图标
 * @prop {string} [minimizeIcon] 图标
 * @prop {()=>*} [onSuccess]
 * @prop {()=>*} [onFail]
 * @prop {()=>*} [onRefresh]
 */

const def = {
  // el: '.card', // 容器
  animationSpeed: 300,
  collapseTrigger: '[data-card-widget="collapse"]',
  removeTrigger: SELECTOR_DATA_REMOVE,
  maximizeTrigger: SELECTOR_DATA_MAXIMIZE,
  collapseIcon: 'wiaicon:&#xe9eb;',
  expandIcon: 'wiaicon:&#xea63;',
  maximizeIcon: 'wiaicon:&#xe62f;',
  minimizeIcon: 'wiaicon:&#xe7d6;',
}

// .bianjiqianbi:before {
//   content: "\e682";
// }

/**
 * Card Widget
 */
export default class Card extends Event {
  /**
   * 构造函数
   * @param {Page} page Page 实例
   * @param {Opts} opts
   */
  constructor(page, opts = {}) {
    super(opts, [page])
    const _ = this
    /** @type {Opts} */
    const opt = {...def, ...opts}
    _.opt = opt
    if (!opt.el) opt.el = page.view.findNode(SELECTOR_CARD)
    this.el = opt.el
  }

  /**
   * el 容器中所有card的click事件响应
   * @param {*} page - Page 实例，不传el，page.view 作为容器
   * @param {*} [el] - 容器
   */
  static bind(page, el) {
    if (!el && page?.view) el = page.view

    // collapse|expand|remove|toggle|maximize|minimize|toggleMaximize
    for (const fn of ['toggle', 'remove', 'toggleMaximize']) {
      let btns
      if (fn === 'toggle') btns = el.find(def.collapseTrigger)
      else if (fn === 'remove') btns = el.find(SELECTOR_DATA_REMOVE)
      else if (fn === 'toggleMaximize') btns = el.find(SELECTOR_DATA_MAXIMIZE)

      btns.click(ev => {
        ev.preventDefault()
        const {target} = ev
        const root = $(target).upper(SELECTOR_CARD)
        if (root) {
          let card = root[DATA_KEY]
          if (!card) {
            card = new Card(page, {el: root})
            root[DATA_KEY] = card
          }
          card[fn]()
        }
      })
    }
  }

  collapse() {
    this.el
      .addClass(CLASS_NAME_COLLAPSING)
      .children(`${SELECTOR_CARD_BODY}, ${SELECTOR_CARD_FOOTER}`)
      .slideUp(this.opt.animationSpeed, 'ease-in-out', () => {
        this.el.addClass(CLASS_NAME_COLLAPSED).removeClass(CLASS_NAME_COLLAPSING)
      })
    // this.el.addClass(CLASS_NAME_COLLAPSED).removeClass(CLASS_NAME_COLLAPSING)

    const icon = this.el.find(`${SELECTOR_CARD_HEADER} ${this.opt.collapseTrigger} .icon`)
    const expand = this.opt.expandIcon.split(':') //   : 'wiaicon:&#xe9eb;',
    const collapse = this.opt.collapseIcon.split(':') //   : 'wiaicon:&#xe9eb;',

    icon.removeClass(collapse[0]).addClass(expand[0]).html(expand[1])

    this.emit(`local::${EVENT_COLLAPSED}`, this.el)
    // this._element.trigger($.Event(EVENT_COLLAPSED), this._parent)
  }

  expand() {
    this.el
      .addClass(CLASS_NAME_EXPANDING)
      .children(`${SELECTOR_CARD_BODY}, ${SELECTOR_CARD_FOOTER}`)
      .slideDown(this.opt.animationSpeed, () => {
        this.el.removeClass(CLASS_NAME_COLLAPSED).removeClass(CLASS_NAME_EXPANDING)
      })

    const icon = this.el.find(`${SELECTOR_CARD_HEADER} ${this.opt.collapseTrigger} .icon`)
    const expand = this.opt.expandIcon.split(':') //   : 'wiaicon:&#xe9eb;',
    const collapse = this.opt.collapseIcon.split(':') //   : 'wiaicon:&#xe9eb;',

    icon.removeClass(expand[0]).addClass(collapse[0]).html(collapse[1])

    this.emit(`local::${EVENT_EXPANDED}`, this.el)
  }

  remove() {
    this.el.slideUp()
    emit(`local::${EVENT_REMOVED}`, this.el)
  }

  toggle() {
    if (this.el.hasClass(CLASS_NAME_COLLAPSED)) {
      this.expand()
      return
    }

    this.collapse()
  }

  maximize() {
    const icon = this.el.find(`${this.opt.maximizeTrigger} .icon`)

    const minimize = this.opt.minimizeIcon.split(':') //   : 'wiaicon:&#xe9eb;',
    const maximize = this.opt.maximizeIcon.split(':') //   : 'wiaicon:&#xe9eb;',

    icon.removeClass(maximize[0]).addClass(minimize[0]).html(minimize[1])

    this.el.css({
      height: this.el.height(),
      width: this.el.width(),
      transition: 'all .15s',
    })

    setTimeout(() => {
      const $element = this.el

      $element.addClass(CLASS_NAME_MAXIMIZED)
      $('html').addClass(CLASS_NAME_MAXIMIZED)
      if ($element.hasClass(CLASS_NAME_COLLAPSED)) {
        $element.addClass(CLASS_NAME_WAS_COLLAPSED)
      }
    }, 150)

    this.emit(`local::${EVENT_MAXIMIZED}`, this.el)
  }

  minimize() {
    const icon = this.el.find(`${this.opt.maximizeTrigger} .icon`)

    const minimize = this.opt.minimizeIcon.split(':') //   : 'wiaicon:&#xe9eb;',
    const maximize = this.opt.maximizeIcon.split(':') //   : 'wiaicon:&#xe9eb;',

    icon.removeClass(minimize[0]).addClass(maximize[0]).html(maximize[1])

    this.el.css('cssText', `height: ${this.el[0].style.height} !important; width: ${this.el[0].style.width} !important; transition: all .15s;`)

    setTimeout(() => {
      const $element = this.el
      $element.removeClass(CLASS_NAME_MAXIMIZED)
      $('html').removeClass(CLASS_NAME_MAXIMIZED)
      $element.css({
        height: '', // 'inherit',
        width: '', // 'inherit',
        transition: '',
      })
      if ($element.hasClass(CLASS_NAME_WAS_COLLAPSED)) {
        $element.removeClass(CLASS_NAME_WAS_COLLAPSED)
      }
    }, 20)
    this.emit(`local::${EVENT_MINIMIZED}`, this.el)
  }

  toggleMaximize() {
    if (this.el.hasClass(CLASS_NAME_MAXIMIZED)) {
      this.minimize()
      return
    }

    this.maximize()
  }
}
