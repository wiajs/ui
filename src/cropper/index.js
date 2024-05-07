/** @jsx jsx */
import {jsx, Event} from '@wiajs/core'
import {getExif, getRotate, urlToBuf, bufToUrl} from '@wiajs/lib/img/util'
// @ts-ignore
import styles from './index.less'

import DEFAULTS from './default'
import render from './render'
import preview from './preview'
import events from './event'
import handlers from './handler'
import change from './change'
import methods from './method'
import {
  ACTION_ALL,
  CLASS_HIDDEN,
  CLASS_HIDE,
  CLASS_INVISIBLE,
  CLASS_MOVE,
  DATA_ACTION,
  EVENT_READY,
  MIME_TYPE_JPEG,
  NAMESPACE,
  REGEXP_DATA_URL,
  REGEXP_DATA_URL_JPEG,
  REGEXP_TAG_NAME,
  WINDOW,
} from './constant'

import {addTimestamp, isCrossOriginURL} from './util'

const AnotherCropper = WINDOW.Cropper

export default class Cropper extends Event {
  /**
   * Create a new Cropper.
   * @param {Element} el - The target element for cropping.
   * @param {Object} [opt={}] - The configuration opt.
   */
  constructor(app, opt = {}) {
    super(opt, [app])

    this.el = opt.el
    this.img = this.el.findNode('img').dom

    if (!this.img || !REGEXP_TAG_NAME.test(this.img.tagName)) {
      throw new Error('The img argument is required and must be an <img> or <canvas> element.')
    }

    this.opt = {...DEFAULTS, ...opt}
    this.cropped = false
    this.disabled = false
    this.pointers = {}
    this.ready = false
    this.reloading = false
    this.replaced = false
    this.sized = false
    this.sizing = false
    this.init()
  }

  init() {
    const {img} = this
    const tagName = img.tagName.toLowerCase()
    let url

    if (img[NAMESPACE]) {
      return
    }

    img[NAMESPACE] = this

    if (tagName === 'img') {
      this.isImg = true

      // e.g.: "img/picture.jpg"
      url = img.getAttribute('src') || ''
      this.originalUrl = url

      // Stop when it's a blank image
      if (!url) {
        return
      }

      // e.g.: "https://example.com/img/picture.jpg"
      url = img.src
    } else if (tagName === 'canvas' && window.HTMLCanvasElement) {
      url = img.toDataURL()
    }

    this.load(url)
  }

  load(url) {
    if (!url) {
      return
    }

    this.url = url
    this.imageData = {}

    const {img, opt} = this

    // Only IE10+ supports Typed Arrays
    if (!opt.checkOrientation || !window.ArrayBuffer) {
      this.clone()
      return
    }

    // Detect the mime type of the image directly if it is a Data URL
    if (REGEXP_DATA_URL.test(url)) {
      // Read ArrayBuffer from Data URL of JPEG images directly for better performance
      if (REGEXP_DATA_URL_JPEG.test(url)) {
        this.read(urlToBuf(url))
      } else {
        // Only a JPEG image may contains Exif Orientation information,
        // the rest types of Data URLs are not necessary to check orientation at all.
        this.clone()
      }

      return
    }

    // 1. Detect the mime type of the image by a XMLHttpRequest.
    // 2. Load the image as ArrayBuffer for reading orientation if its a JPEG image.
    const xhr = new XMLHttpRequest()
    const clone = this.clone.bind(this)

    this.reloading = true
    this.xhr = xhr

    // 1. Cross origin requests are only supported for protocol schemes:
    // http, https, data, chrome, chrome-extension.
    // 2. Access to XMLHttpRequest from a Data URL will be blocked by CORS policy
    // in some browsers as IE11 and Safari.
    xhr.onabort = clone
    xhr.onerror = clone
    xhr.ontimeout = clone

    xhr.onprogress = () => {
      // Abort the request directly if it not a JPEG image for better performance
      if (xhr.getResponseHeader('content-type') !== MIME_TYPE_JPEG) {
        xhr.abort()
      }
    }

    xhr.onload = () => {
      this.read(xhr.response)
    }

    xhr.onloadend = () => {
      this.reloading = false
      this.xhr = null
    }

    // Bust cache when there is a "crossOrigin" property to avoid browser cache error
    if (opt.checkCrossOrigin && isCrossOriginURL(url) && img.crossOrigin) {
      url = addTimestamp(url)
    }

    xhr.open('GET', url)
    xhr.responseType = 'arraybuffer'
    xhr.withCredentials = img.crossOrigin === 'use-credentials'
    xhr.send()
  }

  read(arrayBuffer) {
    const {opt, imageData} = this

    // Reset the orientation value to its default value 1
    // as some iOS browsers will render image with its orientation
    const {orientation} = getExif(arrayBuffer, true)
    let rotate = 0
    let scaleX = 1
    let scaleY = 1

    if (orientation > 1) {
      // Generate a new URL which has the default orientation value
      this.url = bufToUrl(arrayBuffer, MIME_TYPE_JPEG)
      ;({rotate, scaleX, scaleY} = getRotate(orientation))
    }
    if (opt.rotatable) imageData.rotate = rotate

    this.clone()
  }

  clone() {
    const {img, url} = this
    let {crossOrigin} = img
    let crossOriginUrl = url

    if (this.opt.checkCrossOrigin && isCrossOriginURL(url)) {
      if (!crossOrigin) {
        crossOrigin = 'anonymous'
      }

      // Bust cache when there is not a "crossOrigin" property (#519)
      crossOriginUrl = addTimestamp(url)
    }

    this.crossOrigin = crossOrigin
    this.crossOriginUrl = crossOriginUrl

    const image = document.createElement('img')

    if (crossOrigin) {
      image.crossOrigin = crossOrigin
    }

    image.src = crossOriginUrl || url
    image.alt = img.alt || 'The image to crop'
    this.image = image
    image.onload = this.start.bind(this)
    image.onerror = this.stop.bind(this)
    $(image).addClass(CLASS_HIDE)
    img.parentNode.insertBefore(image, img.nextSibling)
  }

  start() {
    const {image} = this

    image.onload = null
    image.onerror = null
    this.sizing = true

    // Match all browsers that use WebKit as the layout engine in iOS devices,
    // such as Safari for iOS, Chrome for iOS, and in-app browsers.

    const isIOSWebKit =
      WINDOW.navigator && /(?:iPad|iPhone|iPod).*?AppleWebKit/i.test(WINDOW.navigator.userAgent)
    const done = (naturalWidth, naturalHeight) => {
      $.assign(this.imageData, {
        naturalWidth,
        naturalHeight,
        aspectRatio: naturalWidth / naturalHeight,
      })
      this.sizing = false
      this.sized = true
      this.build()
    }

    // Most modern browsers (excepts iOS WebKit)
    if (image.naturalWidth && !isIOSWebKit) {
      done(image.naturalWidth, image.naturalHeight)
      return
    }

    const sizingImage = document.createElement('img')
    const body = document.body || document.documentElement

    this.sizingImage = sizingImage

    sizingImage.onload = () => {
      done(sizingImage.width, sizingImage.height)

      if (!isIOSWebKit) {
        body.removeChild(sizingImage)
      }
    }

    sizingImage.src = image.src

    // iOS WebKit will convert the image automatically
    // with its orientation once append it into DOM (#279)
    if (!isIOSWebKit) {
      sizingImage.style.cssText =
        'left:0;' +
        'max-height:none!important;' +
        'max-width:none!important;' +
        'min-height:0!important;' +
        'min-width:0!important;' +
        'opacity:0;' +
        'position:absolute;' +
        'top:0;' +
        'z-index:-1;'
      body.appendChild(sizingImage)
    }
  }

  stop() {
    const {image} = this

    image.onload = null
    image.onerror = null
    image.remove()
    this.image = null
  }

  build() {
    if (!this.sized || this.ready) {
      return
    }
    const {img, opt, image} = this

    // Create cropper elements
    const container = img.parentNode
    const div = document.createElement('div')

    div.innerHTML = (
      <div class={styles.container} touch-action='none'>
        <div class={styles.wrapbox}>
          <div class={styles.canvas}></div>
        </div>
        <div class={styles.dragbox}></div>
        <div class={styles.cropbox}>
          <span class={styles.viewbox}></span>
          <span class={`${styles.dashed} ${styles.dashed_h}`}></span>
          <span class={`${styles.dashed} ${styles.dashed_v}`}></span>
          <span class={styles.center}></span>
          <span class={styles.face}></span>
          <span class={`${styles.line} ${styles.line_e}`} data-cropper-action='e' />
          <span class={`${styles.line} ${styles.line_n}`} data-cropper-action='n' />
          <span class={`${styles.line} ${styles.line_w}`} data-cropper-action='w' />
          <span class={`${styles.line} ${styles.line_s}`} data-cropper-action='s' />
          <span class={`${styles.point} ${styles.point_e}`} data-cropper-action='e' />
          <span class={`${styles.point} ${styles.point_n}`} data-cropper-action='n' />
          <span class={`${styles.point} ${styles.point_w}`} data-cropper-action='w' />
          <span class={`${styles.point} ${styles.point_s}`} data-cropper-action='s' />
          <span class={`${styles.point} ${styles.point_ne}`} data-cropper-action='ne' />
          <span class={`${styles.point} ${styles.point_nw}`} data-cropper-action='nw' />
          <span class={`${styles.point} ${styles.point_sw}`} data-cropper-action='sw' />
          <span class={`${styles.point} ${styles.point_se}`} data-cropper-action='se' />
        </div>
      </div>
    )

    const cropper = $(div).class(`${styles.container}`)
    const canvas = cropper.class(`${styles.canvas}`)
    const dragBox = cropper.class(`${styles.dragbox}`)
    const cropBox = $(cropper).class(`${styles.cropbox}`)
    const face = cropBox.class(`${styles.face}`)

    this.container = container
    this.cropper = cropper
    this.canvas = canvas
    this.dragBox = dragBox
    this.cropBox = cropBox
    this.viewBox = cropper.class(`${styles.viewbox}`)
    this.face = face

    canvas.append(image)

    // Hide the original image
    $(img).addClass(CLASS_HIDDEN)

    // Inserts the cropper after to the current image
    cropper.insertAfter(img)

    // Show the image if is hidden
    if (!this.isImg) {
      $(image).removeClass(CLASS_HIDE)
    }

    this.initPreview()
    this.bind()

    opt.initialAspectRatio = Math.max(0, opt.initialAspectRatio) || NaN
    opt.aspectRatio = Math.max(0, opt.aspectRatio) || NaN
    opt.viewMode = Math.max(0, Math.min(3, Math.round(opt.viewMode))) || 0

    cropBox.addClass(CLASS_HIDDEN)

    if (!opt.guides) cropBox.class(`${styles.dashed}`).addClass(CLASS_HIDDEN)

    if (!opt.center) cropBox.class(`${styles.center}`).addClass(CLASS_HIDDEN)

    if (opt.background) cropper.addClass(`${styles.bg}`)

    if (!opt.highlight) face.addClass(CLASS_INVISIBLE)

    if (opt.cropBoxMovable) {
      face.addClass(CLASS_MOVE)
      face.data(DATA_ACTION, ACTION_ALL)
    }

    if (!opt.cropBoxResizable) {
      cropBox.class(`${styles.line}`).addClass(CLASS_HIDDEN)
      cropBox.class(`${styles.point}`).addClass(CLASS_HIDDEN)
    }

    this.render()
    this.ready = true
    this.setDragMode(opt.dragMode)

    if (opt.autoCrop) {
      this.crop()
    }

    this.setData(opt.data)

    if ($.isFunction(opt.ready)) {
      $(img).once(EVENT_READY, opt.ready)
    }

    // 触发组件事件
    this.emit(`local::${EVENT_READY} cropper${EVENT_READY}`, img)

    // dispatchEvent(el, EVENT_READY);
  }

  unbuild() {
    if (!this.ready) {
      return
    }

    this.ready = false
    this.unbind()
    this.resetPreview()
    this.cropper.remove()
    $(this.img).removeClass(CLASS_HIDDEN)
  }

  uncreate() {
    if (this.ready) {
      this.unbuild()
      this.ready = false
      this.cropped = false
    } else if (this.sizing) {
      this.sizingImage.onload = null
      this.sizing = false
      this.sized = false
    } else if (this.reloading) {
      this.xhr.onabort = null
      this.xhr.abort()
    } else if (this.image) {
      this.stop()
    }
  }

  /**
   * Get the no conflict cropper class.
   * @returns {Cropper} The cropper class.
   */
  static noConflict() {
    window.Cropper = AnotherCropper
    return Cropper
  }

  /**
   * Change the default opt.
   * @param {Object} opt - The new default opt.
   */
  static setDefaults(opt) {
    $.assign(DEFAULTS, $.isPlainObject(opt) && opt)
  }
}

$.assign(Cropper.prototype, render, preview, events, handlers, change, methods)
