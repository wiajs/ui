/* eslint-disable no-multi-assign */
/*
 * Swipe 2.0
 * Brad Birdsall
 * https://github.com/thebird/Swipe
 * Copyright 2013, MIT License
 *
 * modify by wia for img swipe
 * load first img, then load other img!
 * 通过函数调用实现多实例!
 */
import {Event} from '@wiajs/core'
// import {Event} from 'https://cos.wia.pub/wiajs/core.mjs'
// import * as styles from './index.less' // ???

/**
 * @typedef {Object} Opt
 * @prop {string} el
 * @prop {number} startSlide
 * @prop {number} speed
 * @prop {number} delay - 5000
 * @prop {number} WHR
 * @prop {number} width - 指定宽度，默认满屏
 * @prop {number} height - 指定高度，通过宽高比确定宽度
 * @prop {boolean} auto - 自动播放
 * @prop {boolean} loop - 循环
 * @prop {boolean} disableScroll
 * @prop {boolean} stopPropagation
 * @prop {string[]} imgs
 * @prop {(index: number, view: object)=>*} onSlide - runs at slide change.
 * @prop {(index: number, view: object)=>*} onEnd - runs at the end slide transition.
 */

const def = {
  el: '.wia-swiper', // 容器
  startSlide: 0, // index position Swipe should start at
  speed: 500, // speed of prev and next transitions in milliseconds.
  delay: 3000, // begin with auto slideshow (time in milliseconds between slides)
  auto: true, // auto slideshow
  loop: true, // create an infinite feel with no endpoints
  disableScroll: true, //  stop any touches on this container from scrolling the page
  WHR: 2, // 宽高比
}

export default class Swiper extends Event {
  /** @type {*} */
  timer

  /** @type {*} */
  slides

  /** @type {number[]} 图片距离 */
  dists

  /** @type {number} */
  width

  /** @type {number} */
  index = 0

  /** @type {Opt} */
  opt

  /** @type {*} */
  root

  /** @type {HTMLElement} */
  wrap

  // Evnets
  onTouch = {
    // @ts-ignore
    start: ev => {
      this.touchStart(ev)
    },
    // @ts-ignore
    move: ev => {
      this.touchMove(ev)
    },
    // @ts-ignore
    end: ev => {
      this.touchEnd(ev)
    },
  }

  // setup initial vars for event
  touch = {
    /** @type {*} */
    start: {},
    /** @type {*} */
    delta: {},
    isScrolling: false,
  }

  // @ts-ignore
  onTransEnd = ev => {
    const _ = this
    nextTick(_.transitionEnd.bind(_)(ev))
    if (_.opt.stopPropagation) ev.stopPropagation()
  }

  // @ts-ignore
  onResize = ev => {
    const _ = this
    nextTick(_.setup.bind(_))
    if (_.opt.stopPropagation) ev.stopPropagation()
  }

  /**
   * 构造函数
   * @param {*} opts
   * @param {*} page Page 实例
   */
  constructor(opts = {}, page = null) {
    super(opts, page ? [page] : page)
    const _ = this

    /** @type {Opt} */
    _.opt = {...def, ...opts}

    _.root = $(_.opt.el) // 容器层
    // 样式为 class='swiper' ??? 内置样式已改名，页面调试时需屏蔽
    // _.root.removeClass('swiper').addClass(`${styles.swiper} swiper`)

    // 容器里的图片层的封装层
    /** @type {HTMLElement} */
    const wrap = _.root.dom.children[0]
    _.wrap = wrap
    // ??? 内置样式已改名，页面调试时需屏蔽
    // $(el).removeClass('swiper-wrap').addClass(`${styles['swiper-wrap']} swiper-wrap`)

    _.index = _.opt.startSlide

    _.init() // trigger setup

    // add event listeners
    // set touchstart event on element
    wrap.addEventListener('touchstart', _.onTouch.start, false)
    wrap.addEventListener('transitionend', _.onTransEnd, false)
    // set resize event on window
    window.addEventListener('resize', _.onResize, false)
    // 左右点击切换
    _.root.click(ev => {
      const divWidth = _.root.dom.clientWidth
      const clickX = ev.offsetX
      // 相对于 div 的点击位置 X 坐标
      if (clickX < divWidth / 2) _.prev()
      else _.next()
    })
  }

  /**
   * walter add for dynamic create swipe img from img urls!
   * 根据图片数量创建图层
   */
  init() {
    const _ = this
    const {opt, wrap} = _
    _.stop()

    // 默认宽度满屏，可指定宽度、高度
    const w = opt.width || (window.innerWidth > 0 ? window.innerWidth : screen.width)
    const h = opt.WHR ? w / opt.WHR : opt.height // 默认通过宽高比计算，也可以直接指定

    const imgs = opt.imgs || []
    const cnt = imgs.length
    // 清除原有图层!!!
    wrap.innerHTML = ''

    // static swipe!
    if (!cnt) {
      _.setup()
    } else {
      // 按图片数量创建图层，图片放入该层
      /** @type {*} */
      const dvs = []
      for (let i = 0; i < cnt; i++) {
        const div = document.createElement('div')
        $(div).addClass('swiper-slide')
        dvs.push(div)
        wrap.appendChild(div)
      }

      // load first img!
      _.newImg(imgs[0], img => {
        _.addImg(dvs[0], img, h)

        if (imgs.length === 1) _.setup()
        else {
          // load others img
          for (let i = 1; i < imgs.length; i++) {
            _.newImg(imgs[i], pic => {
              _.addImg(dvs[i], pic, h)
              // last img loaded, start swipe!
              if (i === imgs.length - 1) {
                _.setup()
              }
            })
          }
        }
      })
    }
  }

  /**
   *
   * @param {*} src
   * @param {*} cb
   */
  newImg(src, cb) {
    const img = document.createElement('img')
    img.src = src
    if (img.complete) cb(img)
    else img.onload = () => cb(img)
  }

  /**
   *
   * @param {HTMLElement} dv
   * @param {*} img
   * @param {number} h
   */
  addImg(dv, img, h) {
    img.height = h
    img.width = (h * img.naturalWidth) / img.naturalHeight
    dv.appendChild(img)
  }

  /**
   * 根据屏幕宽度、参数控制容器宽度，根据容器宽度，设置每个图层宽度和位置，启动定时轮播
   * 容器宽度变化，需重新调用该方法
   */
  setup() {
    const _ = this
    const {opt, root, wrap, index} = _
    const {WHR} = opt

    // 默认宽度满屏
    const w = opt.width || (window.innerWidth > 0 ? window.innerWidth : screen.width)
    const h = WHR ? w / WHR : opt.height
    // const WHR = options.WHR || 2;

    root.dom.style.width = `${w}px`
    root.dom.style.height = `${h}px`
    root.css('visibility', 'visible')

    // cache slides，所有图片层
    _.slides = wrap.children
    // create an array to store current positions of each slide
    _.dists = new Array(_.slides.length)

    // determine width of each slide
    // dom加载后无法获取，好像使用 setTimeout 可以！
    // width = container.getBoundingClientRect().width || container.offsetWidth;
    // 容器的宽度
    const width = Number.parseInt(getComputedStyle(root.dom).width) // container.style.width ||
    _.width = width

    // 设置容器里图片层宽度为图片数量 * 容器宽度
    wrap.style.width = `${_.slides.length * width}px`

    // alert('dvImg width:' + element.style.width + ' swipe: '
    // + container.getBoundingClientRect().width + '/' + container.offsetWidth
    //  + '/' + container.style.width + '/' + getComputedStyle(container).width);
    // alert(slides.length + '/' + element.style.width);

    // stack elements
    let pos = _.slides.length
    while (pos--) {
      const slide = _.slides[pos]
      slide.style.width = `${width}px`
      slide.setAttribute('data-index', pos)

      slide.style.left = `${pos * -width}px`
      // eslint-disable-next-line no-nested-ternary
      const dist = index > pos ? -width : index < pos ? width : 0
      _.move(pos, dist, 0)
    }

    // reposition elements before and after index
    if (opt.loop) {
      _.move(_.circle(index - 1), -width, 0)
      _.move(_.circle(index + 1), width, 0)
    }
    root.css('visibility', 'visible')

    // start auto slideshow if applicable
    if (opt.auto && _.slides && _.slides.length > 1) _.start()
  }

  /**
   * 前一幅图片
   */
  prev() {
    const _ = this
    const {opt, index, slides} = _

    if (index) _.slide(index - 1)
    else if (opt.loop) _.slide(slides.length - 1)
  }

  /**
   * 后一幅图片
   */
  next() {
    const _ = this
    const {opt, index, slides} = _
    if (index < slides.length - 1) _.slide(index + 1)
    else if (opt.loop) _.slide(0)
  }

  /**
   * 切换图片
   * @param {number} to
   * @param {number} [slideSpeed]
   * @returns
   */
  slide(to, slideSpeed) {
    const _ = this
    const {opt, index, slides, width} = _
    let {speed} = opt
    speed = slideSpeed || speed

    // do nothing if already on requested slide
    if (index === to) return

    let direction = Math.abs(index - to) / (index - to) // 1:right -1:left
    // get the actual position of the slide
    if (opt.loop) {
      const orgDir = direction
      direction = -_.dists[_.circle(to)] / width

      // if going forward but to < index, use to = slides.length + to
      // if going backward but to > index, use to = -slides.length + to
      if (direction !== orgDir) to = -direction * slides.length + to
    }

    let diff = Math.abs(index - to) - 1
    while (diff--) _.move(_.circle((to > index ? to : index) - diff - 1), width * direction, 0)
    to = _.circle(to)
    _.move(index, width * direction, speed)
    _.move(to, 0, speed)

    if (opt.loop) _.move(_.circle(to - direction), -(width * direction), 0) // we need to get the next in place
    _.index = to

    if (opt.onSlide) nextTick(opt.onSlide(index, slides[index]))
  }

  /**
   * 移动到指定索引
   * @param {number} idx - 索引
   * @param {number} dist - 距离
   * @param {number} speed - 速度
   */
  move(idx, dist, speed) {
    const _ = this
    _.translate(idx, dist, speed)
    _.dists[idx] = dist
  }

  /**
   * 滑动图片
   * @param {number} idx - 索引
   * @param {number} dist - 距离
   * @param {number} speed - 速度
   * @returns
   */
  translate(idx, dist, speed) {
    const _ = this
    const {style} = _.slides[idx]
    style.transitionDuration = `${speed}ms`
    style.transform = `translateX(${dist}px)`
  }

  /**
   * 启动自动轮播
   */
  start() {
    const _ = this
    _.timer = setTimeout(_.next.bind(_), _.opt.delay)
  }

  /**
   * 停止自动轮播
   */
  stop() {
    // delay = 0;  点击图片后 stop，不再自动播放？
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  kill() {
    const _ = this
    const {wrap} = _

    // cancel slideshow
    _.stop()

    // reset element
    wrap.style.width = 'auto'
    wrap.style.left = '0'

    // reset slides
    let pos = _.slides.length || 0
    while (pos--) {
      const slide = _.slides[pos]
      slide.style.width = '100%'
      slide.style.left = 0
      _.translate(pos, 0, 0)
    }

    // remove current event listeners
    wrap.removeEventListener('touchstart', _.onTouch.start, false)
    window.removeEventListener('resize', _.onResize, false)
    wrap.removeEventListener('transitionend', _.onTransEnd, false)
  }

  getIndex() {
    // return current index position
    return this.index
  }

  /**
   * touchstart
   * @param {*} ev
   */
  touchStart(ev) {
    const _ = this
    const {wrap, opt} = _
    const touches = ev.touches[0]
    // stop slideshow
    _.stop()

    // measure start values
    _.touch.start = {
      // get initial touch coords
      x: touches.pageX,
      y: touches.pageY,
      // store time to determine touch duration
      time: +new Date(),
    }

    // used for testing first move event
    _.touch.isScrolling = undefined
    // reset delta and end measurements
    _.touch.delta = {}
    // attach touchmove and touchend listeners
    wrap.addEventListener('touchmove', _.onTouch.move, false)
    wrap.addEventListener('touchend', _.onTouch.end, false)

    if (opt.stopPropagation) ev.stopPropagation()
  }

  /**
   *
   * @param {*} event
   * @returns
   */
  touchMove(event) {
    const _ = this
    const {opt, index, touch, slides, dists, width} = _
    const {start, isScrolling} = touch

    // ensure swiping with one touch and not pinching
    if (event.touches.length > 1 || (event.scale && event.scale !== 1)) return

    if (opt.disableScroll) event.preventDefault()

    const touches = event.touches[0]

    // measure change in x and y
    const delta = {
      x: touches.pageX - start.x,
      y: touches.pageY - start.y,
    }

    _.touch.delta = delta

    // determine if scrolling test has run - one time test
    if (!isScrolling) _.isScrolling = !!(isScrolling || Math.abs(delta.x) < Math.abs(delta.y))

    // if user is not trying to scroll vertically
    if (!isScrolling) {
      // prevent native scrolling
      event.preventDefault()

      // stop slideshow
      _.stop()

      // increase resistance if first or last slide
      if (opt.loop) {
        // we don't add resistance at the end

        _.translate(_.circle(index - 1), delta.x + _.dists[_.circle(index - 1)], 0)
        _.translate(index, delta.x + _.dists[index], 0)
        _.translate(_.circle(index + 1), delta.x + _.dists[_.circle(index + 1)], 0)
      } else {
        // increase resistance if first or last slide
        _.delta.x =
          delta.x /
          ((!index && delta.x > 0) || // if first slide and sliding left
          (index == slides.length - 1 && // or if last slide and sliding right
            delta.x < 0) // and if sliding at all
            ? Math.abs(delta.x) / width + 1 // determine resistance level
            : 1) // no resistance if false

        // translate 1:1
        _.translate(index - 1, delta.x + dists[index - 1], 0)
        _.translate(index, delta.x + dists[index], 0)
        _.translate(index + 1, delta.x + dists[index + 1], 0)
      }
    }
    if (opt.stopPropagation) event.stopPropagation()
  }

  /**
   *
   * @param {*} event
   */
  touchEnd(event) {
    const _ = this
    const {wrap, opt, touch, slides, dists, width} = _
    let {index} = _
    const {speed} = opt
    const {start, delta, isScrolling} = touch

    // measure duration
    const duration = +new Date() - start.time
    // determine if slide attempt triggers next/prev slide
    const isValidSlide =
      (Number(duration) < 250 && // if slide duration is less than 250ms
        Math.abs(delta.x) > 20) || // and if slide amt is greater than 20px
      Math.abs(delta.x) > width / 2 // or if slide amt is greater than half the width

    // determine if slide attempt is past start and end
    let isPastBounds =
      (!index && delta.x > 0) || // if first slide and slide amt is greater than 0
      (index == slides.length - 1 && delta.x < 0) // or if last slide and slide amt is less than 0

    if (opt.loop) isPastBounds = false

    // determine direction of swipe (true:right, false:left)
    const direction = delta.x < 0
    // if not scrolling vertically
    if (!isScrolling) {
      if (isValidSlide && !isPastBounds) {
        if (direction) {
          if (opt.loop) {
            // we need to get the next in this direction in place

            _.move(_.circle(index - 1), -width, 0)
            _.move(_.circle(index + 2), width, 0)
          } else _.move(index - 1, -width, 0)

          _.move(index, dists[index] - width, speed)
          _.move(_.circle(index + 1), dists[_.circle(index + 1)] - width, speed)
          index = _.circle(index + 1)
          _.index = index
        } else {
          if (opt.loop) {
            // we need to get the next in this direction in place

            _.move(_.circle(index + 1), width, 0)
            _.move(_.circle(index - 2), -width, 0)
          } else _.move(index + 1, width, 0)

          _.move(index, dists[index] + width, speed)
          _.move(_.circle(index - 1), dists[_.circle(index - 1)] + width, speed)
          index = _.circle(index - 1)
          _.index = index
        }

        opt.onSlide && opt.onSlide(index, slides[index])
      } else if (opt.loop) {
        _.move(_.circle(index - 1), -width, speed)
        _.move(index, 0, speed)
        _.move(_.circle(index + 1), width, speed)
      } else {
        _.move(index - 1, -width, speed)
        _.move(index, 0, speed)
        _.move(index + 1, width, speed)
      }
    }

    // kill touchmove and touchend event listeners until touchstart called again
    wrap.removeEventListener('touchmove', _.onTouch.move, false)
    wrap.removeEventListener('touchend', _.onTouch.end, false)

    if (opt.stopPropagation) event.stopPropagation()
  }

  /**
   *
   * @param {*} event
   */
  transitionEnd(event) {
    const _ = this
    const {opt, index, slides} = _
    if (Number.parseInt(event.target.getAttribute('data-index')) == index) {
      if (opt.auto) _.start()

      opt.onEnd && opt.onEnd(index, slides[index])
    }
  }

  /**
   * 头尾图片按环形获取索引，避免超范围
   * @param {*} idx
   * @returns
   */
  circle(idx) {
    let R
    try {
      const _ = this
      const {slides} = _
      // a simple positive modulo using slides.length
      R = (slides.length + (idx % slides.length)) % slides.length
    } catch (e) {
      console.error(`circle exp:${e.message}`)
    }
    return R
  }
}

// utilities
function noop() {} // simple no operation function

/**
 *
 * @param {*} fn
 */
function nextTick(fn) {
  setTimeout(fn || noop, 0)
}
