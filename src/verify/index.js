/** @jsx-x jsx */
/** @jsxImportSource @wiajs/core */

import {Event} from '@wiajs/core'
import * as css from './index.less'

// const css = styles['wiaui-verify']
// console.log('verify', {styles});

/**
 * @typedef {Object} OptType
 * @prop {string} el 容器
 * @prop {string} lang 语言
 * @prop {string} url 图片下载网址
 * @prop {number} count 图片数量，随机数获取
 * @prop {string} tip 滑块半径
 * @prop {number} sr 滑块半径
 * @prop {number} sw 滑块边长
 * @prop {number} srw 滑块实际边长
 * @prop {number} width 实际宽度，iPhone会缩小
 * @prop {number} ratio 服务器图片与手机实际宽度缩小比
 * @prop {number} cw canvas宽度
 * @prop {number} ch canvas高度
 * @prop {number} len
 * @prop {number} x
 * @prop {number} y
 * @prop {()=>*} onSuccess
 * @prop {()=>*} onFail
 * @prop {()=>*} onRefresh
 * @prop {string} mobile
 * @prop {{refresh: string, slider: string, succ: string, fail: string}} icon
 */

const def = {
  el: '.wiaui_verify', // 容器
  lang: 'zh',
  tip: '请向右滑动填充拼图',
  // url: 'https://cos.wia.pub/wiajs/img/verify', // 图片下载网址
  url: 'https://test.lianlian.pub/auth', // 服务器接口地址
  count: 39, // 图片数量，随机数获取
  sr: 7.5, // 滑块半径
  sw: 42, // 滑块边长
  srw: 42, // 滑块实际边长
  cw: 300, // canvas宽度 310
  ch: 200, // canvas高度 210
  len: 0,
  x: 0,
  y: 0,
  icon: {
    refresh: '&#xe68d;', // '&#xe614;', &#xe619;
    slider: '&#xe68c;',
    succ: '&#xe664;',
    fail: '&#xe86d;',
  },
}

/** @enum {number} */
const Status = {
  fail: -1, // 失败
  null: 0, // 未加载图片
  succ: 1,
  ready: 2, // 就绪，可使用
  over: 3, // 超过三次，换图片再试
  smsMax: 4, // 短信超过最大发送次数
}

/**
 * 滑动条验证
 */
export default class Verify extends Event {
  status = Status.null

  /** @type {HTMLCanvasElement} */
  canvas
  /** @type {HTMLElement} */
  refreshIcon

  /** @type {HTMLCanvasElement} */
  block
  /** @type {HTMLElement} */
  sliderContainer

  /** @type {HTMLElement} */
  sliderMask
  /** @type {HTMLElement} */
  text
  /** @type {HTMLElement} */
  slider
  /** @type {HTMLElement} */
  sliderIcon
  /** @type {CanvasRenderingContext2D} */
  backCtx
  /** @type {CanvasRenderingContext2D} */
  blockCtx
  /** @type {number[]} */
  trail
  /** @type {string} */
  mobile
  /** @type {OptType} */
  opt
  /** @type {JQuery<HTMLElement>} */
  el

  /** @type {()=>void} */
  onSuccess
  /** @type {(status:number)=>void} */
  onFail
  /** @type {()=>void} */
  onRefresh

  /**
   * 构造函数
   * @param {*} page Page 实例
   * @param {*} opts
   */
  constructor(page, opts = {}) {
    super(opts, [page])
    const _ = this
    try {
      if (opts.lang === 'en') opts.tip = opts.tip ?? 'please slide to fill'

      /** @type {OptType} */
      const opt = {...def, ...opts}
      const {width} = opt
      // 匹配iPhone屏幕避免页面左右滑动，iPhone 13 屏幕实际宽度340，原因不明
      if (width && width < opt.cw) {
        opt.ratio = opt.cw / width
        opt.cw = width
        opt.ch = Math.round(opt.ch / opt.ratio)
      } else opt.ratio = 1

      opt.srw = Math.round((opt.sw + opt.sr * 2 + 9) / opt.ratio) // 滑块实际边长

      _.opt = opt
      _.el = $(opt.el)

      if (opt.mobile) _.mobile = opt.mobile
      if (opt.onSuccess) _.onSuccess = opt.onSuccess
      if (opt.onFail) _.onFail = opt.onFail
      if (opt.onRefresh) _.onRefresh = opt.onRefresh

      _.init()
    } catch (e) {
      console.error(`constructor exp:${e.message}`)
    }
  }

  /**
   * 初始化
   */
  async init() {
    const _ = this
    const {opt} = _
    let {el} = _
    try {
      const {tip, ch, cw, srw} = opt

      const html = (
        <div class={css.wiaui_verify} style={`width: ${cw}px`}>
          <canvas width={cw} height={ch} />
          <div class={css.refreshIcon}>
            <i class="wiaicon">{opt.icon.refresh}</i>
          </div>
          <canvas class={css.piece} width={srw} height={ch} />
          <div class={css.sliderContainer} style={`width: ${cw}px`}>
            <div class={css.sliderMask}>
              <div class={css.slider}>
                <span class={css.sliderIcon}>
                  <i class="wiaicon rot-90">{opt.icon.slider}</i>
                </span>
              </div>
            </div>
            <span class={css.sliderText}>{tip}</span>
          </div>
        </div>
      )

      // 替换当前节点
      const prev = el.before(html).prev()
      el.remove()
      el = prev
      $.el = prev

      // 所有直接子元素节点
      const child = el.dom.children
      ;[_.canvas, _.refreshIcon, _.block, _.sliderContainer] = child
      ;[_.sliderMask, _.text] = _.sliderContainer.children
      ;[_.slider] = _.sliderMask.children
      ;[_.sliderIcon] = _.slider.children
      _.backCtx = _.canvas.getContext('2d')
      _.blockCtx = _.block.getContext('2d')

      scale(_.backCtx)
      scale(_.blockCtx)

      _.trail = []
      _.bind()
    } catch (e) {
      console.error(`init exp:${e.message}`)
    }
  }

  /**
   * 加载图片
   * @param {string} mobile
   */
  async loadImg(mobile) {
    if (!mobile || !/1\d{10}/.test(mobile)) return

    const _ = this
    const {opt} = _
    const {cw, ch, srw} = opt

    try {
      _.mobile = mobile
      const rs = await _.getImg()
      if (rs) {
        const imgs = await Promise.all([loadImg(rs.back), loadImg(rs.block)])
        if (imgs) {
          _.backCtx.drawImage(imgs[0], 0, 0, cw, ch) // 背景
          _.blockCtx.drawImage(imgs[1], 0, 0, srw, ch) // 背景
          _.status = Status.ready
        }
      }
    } catch (e) {
      console.log(`loadImg exp:${e.message}`)
    }
  }

  /**
   * 清除
   */
  clean() {
    const _ = this
    const {opt} = _
    const {cw, ch, srw} = opt

    _.backCtx.clearRect(0, 0, cw, ch)
    _.blockCtx.clearRect(0, 0, srw, ch)
    // _.block.width = cw;
  }

  /**
   * 绑定事件
   */
  bind() {
    const _ = this
    const {opt} = _
    const {cw, icon} = opt

    // _.el.dom.onselectstart = () => false;

    $(_.refreshIcon).click(async ev => {
      await _.reload()
      if (_.onRefresh) _.onRefresh()
    })

    /** {number} */
    let originX = 0
    /** {number} */
    let originY = 0
    /** {number[]} */
    const trail = []
    /** {boolean} */
    let isMouseDown = false

    /**
     * 滑动开始
     * @param {MouseEvent | TouchEvent} ev
     */
    function handleStart(ev) {
      if (ev instanceof MouseEvent) {
        originX = ev.clientX
        originY = ev.clientY
      } else if (ev instanceof TouchEvent) {
        originX = ev.touches[0].clientX
        originY = ev.touches[0].clientY
      }
      isMouseDown = true
    }

    /**
     * 滑动
     * @param {MouseEvent | TouchEvent} ev
     */
    function handleMove(ev) {
      if (!isMouseDown) return false

      let eventX = 0
      let eventY = 0
      if (ev instanceof MouseEvent) {
        eventX = ev.clientX
        eventY = ev.clientY
      } else if (ev instanceof TouchEvent) {
        eventX = ev.touches[0].clientX
        eventY = ev.touches[0].clientY
      }
      const moveX = eventX - originX
      const moveY = eventY - originY

      if (moveX < 0 || moveX + 58 >= cw) return false

      _.slider.style.left = `${moveX}px`
      // const blockLeft = (w - 40 - 20) / (w - 40) * moveX
      const blockLeft = moveX
      _.block.style.left = `${blockLeft}px`

      $(_.sliderContainer).addClass(css.sliderContainer_active)
      _.sliderMask.style.width = `${moveX + 12}px`
      trail.push(moveY)
    }

    /**
     *
     * @param {MouseEvent | TouchEvent} ev
     */
    async function handleEnd(ev) {
      if (!isMouseDown) return false

      isMouseDown = false
      let eventX = 0
      if (ev instanceof MouseEvent) {
        eventX = ev.clientX
      } else if (ev instanceof TouchEvent) {
        eventX = ev.changedTouches[0].clientX
      }

      if (eventX === originX) return false

      $(_.sliderContainer).removeClass(css.sliderContainer_active)
      _.trail = trail

      if (_.status !== Status.over) _.status = await _.verify()

      switch (_.status) {
        case Status.succ:
          $(_.sliderIcon).html(`<i class="wiaicon">${icon.succ}</i>`)
          // $(_.sliderIcon).html(`<i class="fas fa-check" aria-hidden="true"></i>`);

          $(_.sliderContainer).addClass(css.sliderContainer_success)

          if (_.onSuccess) _.onSuccess()
          break

        case Status.ready:
          $(_.sliderContainer).addClass(css.sliderContainer_fail)
          $(_.text).html('差点成功，请再试一次')
          _.reset()
          break

        case Status.over:
          $(_.sliderContainer).addClass(css.sliderContainer_fail)
          $(_.text).html('请点击右上角刷新图标')
          _.reset()
          alert('请点击右上角刷新图标重新匹配！')
          break

        case Status.smsMax:
          $(_.sliderContainer).addClass(css.sliderContainer_fail)
          $(_.text).html('登录次数太多，请联系管理员！')
          alert('登录次数太多，请联系管理员！')

          if (_.onFail) _.onFail(Status.smsMax)

          break

        default: {
          $(_.sliderIcon).html(`<i class="wiaicon">${icon.fail}</i>`)
          $(_.sliderContainer).addClass(css.sliderContainer_fail)

          if (_.onFail) _.onFail(Status.fail)

          setTimeout(() => {
            _.reset()
          }, 1000)
        }
      }
    }

    _.slider.addEventListener('mousedown', handleStart)
    _.slider.addEventListener('touchstart', handleStart)
    _.block.addEventListener('mousedown', handleStart)
    _.block.addEventListener('touchstart', handleStart)

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('touchmove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchend', handleEnd)
  }

  /**
   * 核验
   * @returns {Promise<Status>}
   */
  async verify() {
    let R = Status.fail

    const _ = this
    const {mobile, trail, opt} = _
    const {url, ratio} = opt
    try {
      const left = Math.round(parseInt(_.block.style.left.replace('px', '')) * ratio)

      const rs = await $.post(`${url}/verify`, {left, mobile, trail})
      console.log('verify', {rs})

      if (rs?.code === 200) R = Status.succ
      else if (rs?.code === 4039) R = Status.over
      else if (rs?.code === 4041) R = Status.ready
      else if (rs?.code === 4028) R = Status.smsMax
    } catch (e) {
      console.error(`verify exp:${e.message}`)
    }

    return R
  }

  reset() {
    const _ = this
    const {opt} = _

    _.sliderContainer.className = css.sliderContainer

    $(_.sliderIcon).html(`<i class="wiaicon rot-90">${opt.icon.slider}</i>`)
    // $(_.sliderIcon).html(`<i class="fas fa-bars fa-rotate-90" aria-hidden="true"></i>`);

    _.slider.style.left = '0'
    _.block.style.left = '0'
    _.sliderMask.style.width = '0'
  }

  async reload() {
    const _ = this
    const {opt} = _
    try {
      const {tip} = opt

      _.status = Status.null
      _.reset()
      _.clean()
      await _.loadImg(_.mobile)
      $(_.text).html(tip)
    } catch (e) {
      console.error(`reload exp:${e.message}`)
    }
  }

  /**
   * 获取随机图片网址
   * @returns {Promise<{back: string, block: string, time: number}>}
   */
  async getImg() {
    let R
    const _ = this
    const {mobile, opt} = _
    const {url, count} = opt

    try {
      // R = `${url}/${random(1, count)}.jpg`;
      const rs = await $.post(`${url}/getVerify`, {mobile})
      if (rs?.code === 200 && rs.data) {
        console.log('getImg', {rs})
        // {
        //   back: 'https://img.wia.pub/lianlian/verify/b2f300ffbf949460037368c18a0be637.jpg';
        //   block: 'https://img.wia.pub/lianlian/verify/b2f300ffbf949460037368c18a0be637.png';
        //   time: 120;
        // }
        R = rs.data
      } else if (rs?.code === 4039) alert('登录次数太多，请联系管理员！')
    } catch (e) {
      console.log(`getImg exp:${e.message}`)
    }

    return R
  }

  destroy() {}
}

/**
 *
 * @param {CanvasRenderingContext2D} ctx
 * @returns
 */
function getRatio(ctx) {
  let R = 1
  try {
    // 设备像素比，高清屏上，一个图片像素点对应屏幕2-4个像素点
    // 如果图片密度不够，就会模糊，高清屏需要高密度图片
    const dpr = window.devicePixelRatio || 1
    // 存储像素比，浏览器在渲染 canvas 之前会用几个像素存储画布信息
    const bsr =
      ctx.backingStorePixelRatio ||
      ctx.webkitBackingStorePixelRatio ||
      ctx.mozBackingStorePixelRatio ||
      ctx.msBackingStorePixelRatio ||
      ctx.oBackingStorePixelRatio ||
      1

    // 设备与屏幕像素比例
    R = dpr / bsr

    console.log(`getRatio:${R}`)
  } catch (e) {
    console.log(`getRatio exp:${e.message}`)
  }

  return R
}

/**
 * 放大画布，避免模糊
 * 场景需同比例放大，放大后，相对显示区域的坐标、字体、尺寸会自动放大
 * 画板不变，画布字段缩小到画板展示时，像素密度更大，边界更细腻。
 * @param {*} ctx
 * @returns
 */
function scale(ctx) {
  const cv = ctx.canvas
  const {width: cw, height: ch} = cv

  const ratio = getRatio(ctx)

  // 放大画布，放大的画布最后缩小绘制到屏幕，单位面积的像素点更多，匹配高清屏
  cv.width = Math.floor(cw * ratio)
  cv.height = Math.floor(ch * ratio)
  // 画布显示尺寸不变，画布缩小到现实尺寸
  cv.style.width = `${cw}px`
  cv.style.height = `${ch}px`
  // 按缩小比例进行绘制
  ctx.scale(ratio, ratio)
  ctx.lineWidth = 1 // 修改线条宽度的值，要求为实际像素值的一半
}

/**
 *
 * @param {number} x
 * @param {number} y
 * @returns
 */
function sum(x, y) {
  return x + y
}

/**
 *
 * @param {number} x
 * @returns
 */
function square(x) {
  return x * x
}

/**
 * 指定范围随机数
 * @param {number} min 起始 >= min
 * @param {number} max 终止 < max
 * @returns
 */
function random(min, max) {
  return Math.round(Math.random() * (max - min) + min)
}

/**
 * 设置 img src
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
function loadImg(src) {
  return new Promise((res, rej) => {
    // 不能使用页面中的img,页面中的img会压缩图片，得不到图片真实大小!
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.src = src
    if (img.complete) {
      res(img)
    } else {
      img.onload = () => res(img)
    }
  })
}
