/** @jsxImportSource @wiajs/core */
// import {Event} from '@wiajs/core'
// import {Page} from '@wiajs/core'
import Compress from '@wiajs/lib/compress'
// @ts-ignore
import * as css from './index.less'
import {log as Log} from '@wiajs/util'

const log = Log({m: 'uploader'}) // 创建日志实例

/**
 * @typedef {import('jquery')} $
 * @typedef {JQuery} Dom
 */

/** @typedef {object} FileType
 * @prop {number} idx：数组索引
 * @prop {Blob} rawFile
 * @prop {string} name
 * @prop {string} ext
 * @prop {number} size
 * @prop {string} status
 * @prop {HTMLCanvasElement} canvas
 * @prop {boolean} compress
 * @prop {string} url
 * @prop {string} id - 数据库中的附件id，上传时服务端返回或从数据库加载，用于修改
 */

/** @typedef {object} Opts
 * @prop {string} url - 'https://lianlian.pub/img/upload', // 图片上传服务接口
 * @prop {string} dir - 'slcj/contract', 图片存储路径，格式: 所有者/应用名称/分类，结尾不要带/
 *  dir: 'lianlian/esign/test', 图片存储路径，格式: 所有者/应用名称/分类
 * @prop {Dom} el - $('.wia_uploader'), 容器
 * @prop {boolean} [multiple] 缺省：true,  同时选择多个文件
 * @prop {number} [limit] - 缺省：0 不限制数量
 * @prop {boolean} [upload] - 缺省：true, 自动上传
 * @prop {string} [accept] - 'image/jpg,image/jpeg,image/png,image/gif', // 选择文件类型
 *  accept: '*', // 不限类型
 * @prop {boolean} [preview] - 缺省：true, 点击图片是否预览，图片可提供大图预览，其他文件可在preview事件中提供预览功能
 * @prop {number} [left] - 0, // 预览偏移，master page
 * @prop {boolean} [compress] - 缺省：true,  启用压缩
 * @prop {number} [maxSize] - 缺省：0,  压缩后最大尺寸
 * @prop {number} [quality] - 缺省：0.6,  压缩比
 * @prop {number} [width] - 缺省：0,  指定压缩后宽
 * @prop {number} [height] - 缺省：0,  指定压缩后高
 * @prop {string} [resize] - 缺省：'none',  与 width、height 一起使用，改变图像尺寸压缩 none|contain|cover'
 * @prop {number} [aspectRatio] - 缺省：0,  设置宽高比，0 关闭

 * @prop {string} [crop] - 缺省：'img/crop',  不符合比例，进入裁剪
 * @prop {*} [img] = null, // 指定 img，对于图片，如指定img，则使用img展示图片缩略图，否则自动在上传容器中加载缩略图
 * @prop {*} [input] - null, // 上传成功后的url填入输入框，便于表单数据提交
 * @prop {*} [choose] - 点击触发选择文件，默认为上传容器

 * @prop {*} [data] - 请求体参数
 * @prop {*} [header] - 请求头，传 token、bucket 等
 * @prop {boolean} [withCredentials] - 缺省：false,
*/

const def = {
  url: 'https://lianlian.pub/img/upload', // 图片上传服务接口
  // dir: 'slcj/contract', // 图片存储路径，格式: 所有者/应用名称/分类，结尾不要带/
  el: $('.wia_uploader'), // 容器
  multiple: true, // 同时选择多个文件
  limit: 0, // 0 不限制数量
  upload: true, // 自动上传
  // accept: '*', // 不限类型
  accept: 'image/jpg,image/jpeg,image/png,image/gif', // 选择文件类型
  // dir: 'lianlian/esign/test', // 图片存储路径，格式: 所有者/应用名称/分类

  preview: true, // 点击图片是否预览，图片可提供大图预览，其他文件可在preview事件中提供预览功能
  left: 0, // 预览偏移，master page
  compress: true, // 启用压缩
  maxSize: 0, // 压缩后最大尺寸
  quality: 0.6, // 压缩比
  width: 0, // 指定压缩后宽
  height: 0, // 指定压缩后高
  resize: 'none', // 与 width、height 一起使用，改变图像尺寸压缩 none|contain|cover'
  aspectRatio: 0, // 设置宽高比，0 关闭

  // crop: 'img/crop', // 不符合比例，进入裁剪
  /** @type {JQuery} */
  img: null, // 指定 img，对于图片，如指定img，则使用img展示图片缩略图，否则自动在上传容器中加载缩略图
  /** @type JQuery} */
  input: null, // 上传成功后的url填入输入框，便于表单数据提交
  /** @type JQuery} */
  choose: null, // 点击触发选择文件，默认为上传容器

  header: {},
  data: {},
  withCredentials: false,
}

/**
 * 解析服务器返回失败消息
 * @param {*} xhr
 * @returns
 */
const parseError = xhr => {
  let msg = ''
  const {responseText, responseType, status, statusText} = xhr
  if (responseText && responseType === 'text') {
    try {
      msg = JSON.parse(responseText)
    } catch (error) {
      msg = responseText
    }
  } else {
    msg = `${status} ${statusText}`
  }

  const err = new Error(msg)
  err.status = status
  return err
}

/**
 * 解析服务器返回成功消息
 * @param {*} rs
 * @returns
 */
const parseSuccess = rs => {
  if (rs) {
    try {
      return JSON.parse(rs)
    } catch (ex) {
      console.log('parseSuccess', {exp: ex.message})
    }
  }

  return rs
}

class Uploader {
  /** @type {FileType[]} */
  files // 所有文件

  /** @type {*} */
  opt

  idx = 1

  /**
   * 构造函数
   * @param {Opts} opts
   */
  constructor(opts) {
    // super(opts, [page])
    const _ = this

    const opt = {...def, ...opts}
    _.opt = opt
    _.el = opt.el
    // _.page = page

    if (!opt.accept.startsWith('image/')) {
      opt.compress = false // 关闭压缩
      opt.quality = 1 // 压缩比
      opt.preview = false // 非图形，不提供内部预览
      opt.aspectRatio = 0 // 设置宽高比，0 关闭
    }

    // if (this.opt.dir) this.opt.dir = this.opt.dir.trim;
    this.init(opt)
  }

  /**
   * 初始化，可被调用
   * @param {{el:*}} opt
   */
  init(opt) {
    const _ = this

    _.opt = opt
    _.el = _.opt.el

    /** @type {*[]} */
    _.files = []

    _.input = this.initInput(opt)
    _.page = opt.el.parentNode('.page')

    _.el.removeClass('wia_uploader').addClass(`${css.wia_uploader} wia_uploader`) // 内置样式已改名
    _.el.class('_input').removeClass('_input').addClass(`${css._input} _input`) // 内置样式已改名

    this.bind()
  }

  /**
   * 创建并返回 file input 组件保存到input中，用于选择文件
   * input.click 可触发文件选择
   * @param {*} opt
   */
  initInput(opt) {
    const _ = this
    // 选择文件后返回
    this.changeHandler = async e => {
      let {files} = e.target

      // console.log('Input', {files})

      const type = Object.prototype.toString.call(files)
      if (type === '[object FileList]') {
        files = [].slice.call(files)
      } else if (type === '[object Object]' || type === '[object File]') {
        files = [files]
      }

      _.hideChoose()

      // 外部可干预，返回false或者文件数组
      const ret = await _.callEvent('choose', files)
      // const ret = this.emit('local::choose', files)
      if (ret !== false) _.loadFiles(ret || files)
    }

    /** @type{*} */
    const el = document.createElement('input')

    for (const [key, value] of Object.entries({
      type: 'file',
      accept: opt.accept,
      multiple: opt.multiple,
      hidden: true,
    })) {
      el[key] = value
    }

    el.addEventListener('change', this.changeHandler)
    opt.el.append(el)

    return el
  }

  // 大图浏览
  getGallery() {
    const _ = this
    if (!this.opt.preview) return null

    let gal = this.page.class(`${css.wia_gallery}`)
    if (!gal || !gal.length) {
      const tmpl = (
        <div class={css.wia_gallery} style={`display: none; left: ${_.opt.left}px`}>
          <span class={css._img} />
          <div class={`flex-center ${css._opr}`}>
            <a href="javascript:;" name="delete">
              <i class="icon wiaicon">&#xe8b6;</i>
            </a>
          </div>
        </div>
      )

      gal = $(tmpl)
      gal.insertBefore(this.page.class('page-content'))
      // 图片预览
      gal.click(
        /** @param {*}ev */ ev => {
          ev.stopPropagation() // 阻止冒泡，避免上层 choose再次触发
          ev.preventDefault()
          gal.hide()
          // $gallery.fadeOut(100);
        }
      )

      gal.name('delete').click(
        /** @param {*}ev */ ev => {
          const idx = gal.class(`${css._img}`).data('fileid')
          this.remove(idx)
        }
      )

      gal = this.page.class(`${css.wia_gallery}`)
      this.gallery = gal
    }
    return gal
  }

  /**
   * 事件绑定
   */
  bind() {
    const _ = this
    const {opt} = _

    // const self = this;
    // ontouchstart/addEventListener 有时无法触发文件选择
    // opt.input.dom.onclick = ev => {
    //   this.chooseFile();
    // };
    //

    /**
     * 外部更改input时，显示图片，如：模板视图加载时
     * [{id, url}], [url], url
     */
    opt.input.change(
      /** @param {*}ev */ ev => {
        try {
          // 优先获取 data
          let p = opt.input.dom.data
          const val = opt.input.val()
          // 字符串转对象
          if ($.isEmpty(p) && val) {
            // json
            if (/^\{[\s\S]+\}/.test(val)) p = JSON.parse(val)
            else {
              p = {dir: ''}
              p.url = val.split(',')
            }
          }

          // 加载 url
          if (p?.url) {
            _.clear()
            _.files = p.url.map(v => {
              // const {dir} = p;
              // const host = dir.replace(`/${opt.dir}`, '');
              const f = {
                idx: this.idx++, // 内部索引计数
                // dir 可选
                url: p.dir ? `${p.dir}/${v}` : v,
                status: 'upload', // 已上传
                id: p.id, // 可选
              }
              return f
            })
            _.load()
          }
        } catch (ex) {
          console.error(`input value exp:${ex.message}`)
        }
      }
    )

    // 点击容器，没有点图片则选择图片，点图片则预览，
    if (opt.el) {
      opt.el.click(
        /** @param {*}ev */ ev => {
          const file = $(ev.target).closest(`.${css._file}`)
          // console.log('el click', {file, ev, _file: styles._file});

          // 点击图片，预览或裁剪
          if (file.length > 0) {
            // el 上设置，手机可以触发选择文件，pc失效
            ev.stopPropagation() // 阻止冒泡，避免上层 choose再次触发
            ev.preventDefault() // 阻止缺省行为，可能导致层缺省行为无效
            const f = this.getFile(file.data('fileid'))
            // 进入裁剪页面
            if (f && f.status === 'crop' && opt.crop)
              $.go(opt.crop, {
                src: 'crop',
                idx: f.idx,
                url: f.url, // 图像数据
                aspectRatio: opt.aspectRatio,
              })
            else {
              if (opt.preview) this.showGallery(file)

              this.callEvent('preview', f)
            }
          } else if (!opt.choose) _.chooseFile()
        }
      )
    }

    // 如指定文件选择器choose，点击则选择文件
    opt.choose?.click(ev => {
      ev.stopPropagation() // 阻止事件冒泡
      _.chooseFile() // 触发文件选择
    })
  }

  hideChoose() {
    const {opt} = this
    const el = opt.choose
    const wrap = el.upper('._wrap')
    if (wrap.dom) wrap.hide()
    else el.hide()
  }

  showChoose() {
    const {opt} = this
    const el = opt.choose
    const wrap = el.upper('._wrap')
    if (wrap.dom) wrap.show()
    else el.show()
  }

  /**
   *
   * @param {Opts} opts
   */
  config(opts) {
    this.opt = {...this.opt, ...opts}
  }

  /**
   * 图片显示
   * @param {*} file
   */
  showGallery(file) {
    if (file.length > 0) {
      const gal = this.getGallery()

      if (gal.length) {
        gal.class(`${css._img}`).attr('style', file.attr('style')).data('fileid', file.data('fileid'))
        gal.show()
      }
    }
    // $gallery.fadeIn(100);
  }

  /**
   * 响应事件[choose, load, success, error, exceed, change, progress]
   * @param {*} evt
   * @param {*} cb
   * @returns
   */
  on(evt, cb) {
    if (evt && typeof cb === 'function') {
      this['on' + evt] = cb
    }
    return this
  }

  /**
   * 调用外部响应事件
   * @param {*} evt
   * @param  {...any} args
   * @returns
   */
  callEvent(evt, ...args) {
    if (evt && this['on' + evt]) {
      return this['on' + evt].apply(this, args)
    }
  }

  /**
   * 利用隐藏的文件输入组件实现文件选择
   */
  chooseFile() {
    console.log('chooseFile')

    this.input.value = ''
    this.input.click() // 弹出文件选择
  }

  /**
   * 加载文件，选择或外部传入的文件数组
   * 注意，如果设置了 limit，则只能保留该数量文件
   * @param {File|FileType[]} files
   * @returns {boolean}
   */
  loadFiles(files) {
    const _ = this
    try {
      if (!files) return false

      const {opt} = _

      if (opt.limit > 0 && files.length && files.length + _.files.length > opt.limit) {
        if (opt.limit === 1) this.clear()
        // 单文件替换
        else {
          _.callEvent('exceed', files)
          return false
        }
      }

      _.files = _.files.concat(
        files.map(file => {
          if (file.idx && file.rawFile) return file

          // 任意后缀
          const rg = /(\.(?:\w+))$/i.exec(file.name)

          return {
            idx: _.idx++,
            rawFile: file,
            mimeType: file.type,
            type: getFileType(file.type),
            name: file.name,
            ext: rg && rg[1],
            size: file.size,
            status: 'choose',
          }
        })
      )

      _.callEvent('change', this.files) // 文件列表改变
      _.load()
    } catch (e) {
      log.err(e, 'loadFiles')
    }

    return true
  }

  /**
   *
   * @param {*} idx
   * @returns
   */
  getFile(idx) {
    return this.files.find(f => f.idx == idx)
  }

  /**
   * 裁剪后，更新文件
   * @param {number|string} idx
   * @param {Blob} blob
   */
  async update(idx, blob) {
    const file = this.files.find(f => f.idx == idx)
    if (file && blob) {
      file.status = 'croped'
      // @ts-ignore
      blob.name = file.name.replace(/\.\w+$/i, '.jpg')
      file.ext = '.jpg'
      file.size = blob.size
      file.rawFile = blob
      file.url = URL.createObjectURL(blob)
      this.load()
    }
  }

  /**
   * 加载文件图标
   * 从文件系统加载文件到上传容器，非图形文件用文件后缀图标表示，图片用缩略图表示
   */
  async load() {
    const _ = this
    const {opt} = _

    // const fs = this.files.filter(f => f.status === 'choose');
    for (const f of _.files ?? []) {
      let src
      let tp
      const {ext} = f
      if (f.status === 'choose') {
        f.status = 'load'

        if (/\.(jpeg|jpg|png|gif)/i.test(ext)) {
          const URL = window.URL || window.webkitURL || window.mozURL
          src = URL && f.rawFile && URL.createObjectURL(f.rawFile)
        } else src = getThumb(ext)

        tp = (
          <div
            name={`img${f.idx}`}
            data-fileid={f.idx}
            class={`flex-center ${css._file} ${css._status}`}
            style={`background-image: url(${src}); background-size: contain`}>
            <div class={css._content}>50%</div>
          </div>
        )

        if (opt.label)
          tp = (
            <div class="css._wrap _wrap">
              {tp}
              <p>上传中</p>
            </div>
          )

        // 指定宽高比
        if (opt.aspectRatio) {
          const img = await loadImg(src)
          if (Math.round((img.naturalWidth * 100) / img.naturalHeight) / 100 !== this.opt.aspectRatio) {
            f.status = 'crop'
            f.img = img
            f.url = src
            tp = (
              <div
                name={`img${f.idx}`}
                data-fileid={f.idx}
                class={`flex-center ${css._file} ${css._status}`}
                style={`background-image: url(${src}); background-size: contain`}>
                <div class={`flex-center ${css._content}`}>
                  <i class="icon wiaicon">&#xe61c;</i>
                </div>
              </div>
            )

            if (opt.label)
              tp = (
                <div class="css._wrap _wrap">
                  {tp}
                  <p>需裁剪</p>
                </div>
              )
          }
        }
      } else if (f.status === 'croped') {
        // 裁剪后的文件，重新加载，准备自动上传
        opt.el.name(`img${f.idx}`).remove()
        f.status = 'load'
        src = f.url

        tp = (
          <div
            name={`img${f.idx}`}
            data-fileid={f.idx}
            class={`flex-center ${css._file} ${css._status}`}
            style={`background-image: url(${src}); background-size: contain`}>
            <div class={css._content}>50%</div>
          </div>
        )

        if (opt.label)
          tp = (
            <div class="css._wrap _wrap">
              {tb}
              <p>上传中</p>
            </div>
          )
      } else if (f.status === 'upload') {
        // 已上传
        const n = opt.el.name(`img${f.idx}`)
        // 是否在内部显示图标
        if (!n.dom && !opt.img) src = `${f.url}`

        // 重新加载图标
        if (src) {
          tp = (
            <div
              name={`img${f.idx}`}
              data-fileid={f.idx}
              class={`flex-center ${css._file}`}
              style={`background-image: url(${src}); background-size: contain`}
            />
          )

          if (opt.label)
            tp = (
              <div class="css._wrap _wrap">
                {tp}
                <p>上传成功</p>
              </div>
            )
        }
      }

      // 加载图标
      if (src) {
        if (tp) $(tp).insertBefore(opt.input)
        else if (opt.img) {
          // 上传成功
          let {img} = opt
          if (img.dom.tagName !== 'IMG') img = img.find('img')
          src = getThumb(ext, src)
          img.attr('src', src)
          opt.img.show()
        }

        _.callEvent('load', f, _.files)
        console.log({f, files: _.files}, 'load')

        opt.upload && _.upload()
      }
    }
  }

  /**
   * 压缩
   * @param {FileType} file
   * @returns {Promise<FileType>}
   */
  async compress(file) {
    let R

    const _ = this
    const {opt} = _
    const {quality, maxSize, width, height, resize} = opt

    if (!file || file.compress || file.status === 'upload' || file.status === 'crop') return

    const com = new Compress(file.rawFile, {quality, maxSize, width, height, resize})
    const blob = await com.press()
    if (blob) {
      // The third parameter is required for server
      // formData.append('file', r, r.name);
      console.log('compress', {
        name: blob.name,
        rate: `${Math.round((blob.size * 100) / file.size)}%`,
      })

      file.rawFile = blob
      file.size = blob.size
      file.name = blob.name // png -> jpg
      file.ext = /(\.(?:\w+))$/i.exec(file.name)?.[1]
      file.compress = true
      // console.log('compress', {r});
      R = file
      // if (cb) cb.call(_, file);
    }

    return R
  }

  /**
   * 上传成功的文件 [{url、id}] 以json 字符串写入 input
   * 不触发 change
   * 多个文件，每个文件单独触发！
   */
  updateInput() {
    const _ = this
    const {opt, files} = _
    try {
      // 已上传成功文件
      const fs = files.filter(f => f.status === 'upload')
      // console.log({fs}, 'updateInput')

      if (fs.length > 0) {
        const rs = fs.map(f => ({id: f.id, url: f.url}))
        opt.input.val(JSON.stringify(rs))
        opt.val = rs
      } else this.opt.input.val('')
    } catch (e) {
      log.err(e, 'updateInput')
    }
  }

  /**
   * 清除内部文件
   */
  clear() {
    const _ = this

    try {
      _.idx = 1
      _.files = []
      _.opt.el.classes(`${css._file}`).remove()
      _.updateInput()
      _.callEvent('change', this.files)
    } catch (e) {
      log.err(e, 'clear')
    }
  }

  /**
   * 删除文件
   * @param {*} file
   */
  removeFile(file) {
    const idx = file.idx || file
    this.remove(idx)
  }

  /**
   * 删除文件
   * @param {{idx?:number, id?: number, url?:string}} opts
   */
  remove(opts) {
    const _ = this
    try {
      let {idx} = opts
      const {id, url} = opts
      if (typeof opts === 'number') idx = opts

      let index
      if (idx >= 0) index = _.files.findIndex(f => f.idx == idx)
      else if (id >= 0) index = _.files.findIndex(f => f.id == id)
      else if (url) index = _.files.findIndex(f => f.url == url)

      if (index > -1) {
        _.files.splice(index, 1)
        _.callEvent('change', _.files)
      }

      _.opt.el.name(`img${idx}`).remove()
      _.updateInput()
    } catch (e) {
      log.err(e, 'remove')
    }
  }

  /**
   * 非裁剪、上传状态文件，进入上传流程
   * @param {*} file
   * @returns
   */
  upload(file) {
    if (!this.files.length && !file) return

    if (file) {
      const target = this.files.find(item => item.idx === file.idx || item.idx === file)
      target && target.status !== 'upload' && target.status !== 'crop' && this.prePost(target)
    } else {
      const fs = this.files.filter(f => f.status !== 'upload' && f.status !== 'crop')
      fs.forEach(f => {
        this.prePost(f)
      })
    }
  }

  /**
   * 压缩文件
   * @param {*} file
   */
  async prePost(file) {
    const _ = this
    if (_.opt.compress) {
      const f = await _.compress(file)
      _.post(f)
    } else this.post(file)
  }

  /**
   * 图片上传，将图片转成二进制Blob对象，装入formdata上传
   * 文件上传浏览器自动设置 content-type: multipart/form-data; 分片上传
   * @param {*} file
   */
  async post(file) {
    const _ = this
    const {opt} = _

    if (!file.rawFile || file.status === 'upload') return

    console.log({file}, 'post')

    let percent = 0
    /** @type {NodeJS.Timer} */
    let timer = null
    const ls = opt.input.parent()

    // 数据后50%用模拟进度
    function mockProgress() {
      if (timer) return

      timer = setInterval(() => {
        percent += 5

        // $li.find(".progress span").css('width', percent + "%");
        const f = ls.name(`img${file.idx}`)
        const content = f.class(`${css._content}`)
        content.html(`${percent}%`)

        // self.opt.input
        //   .parent()
        //   .name(file.name)
        //   .class(`${styles._content}`)
        //   .html(`${percent}%`);
        // console.log(`... ${percent}%`);

        if (percent >= 99) {
          clearInterval(timer)
          f.removeClass(`${css._status}`)
          content.remove()
        }
      }, 50)
    }

    const {data, withCredentials, header} = opt

    const fd = new FormData()
    // 传入路径、文件数据和文件名称
    const name = `${file.idx}${file.ext}` // idx.文件扩展名，不可重复
    fd.append(opt.dir, file.rawFile, name)

    if (data)
      for (const k of Object.keys(data)) {
        fd.append(k, data[k])
      }

    const xhr = new XMLHttpRequest()
    xhr.withCredentials = !!withCredentials

    xhr.open('POST', this.opt.url)

    // 添加自定义 header
    if (header)
      for (const k of Object.keys(header)) {
        xhr.setRequestHeader(k, header[k])
      }

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4)
        if (xhr.status === 200) {
          // {code: 200, data:{}}
          const rs = parseSuccess(xhr.responseText)
          // 上传成功，返回文件名对象
          if (rs.code === 200 && rs.data[name]) {
            file.status = 'upload' // 上传成功状态
            // 返回数据：
            //  {
            //    '3.jpg': {
            //      dir: 'img/req/',
            //      file: 'a42f5e9265e42064d169c76700209d4f.jpg',
            //      host: 'https://fin.wia.pub',
            //      len: 55834,
            //      name: '3.jpg',
            //      url: 'https://fin.wia.pub/img/req/a42f5e9265e42064d169c76700209d4f.jpg',
            //      id: 4523,
            //    }
            //  }
            const r = rs.data[name]
            // 服务器返回存储路径、文件名称
            if (r.url) {
              const idx = r.name.replace(/\.\w+/i, '')
              // 去掉末尾 / 字符
              r.dir = r.dir.replace(/\/$/, '')

              // 不支持多文件、多次不同路径上传
              file.url = r.url //`${r.host}/${r.dir}/${r.file}`
              file.id = r.id

              let uf = ls.name(`img${file.idx}`)
              if (opt.label) uf = uf.parent()

              // 上传成功，更新图片缩略图
              if (opt.label) uf.find('p').html('上传成功')

              const src = getThumb(file.ext, file.url)
              let {img} = opt
              if (img) {
                if (img.dom.tagName !== 'IMG') img = img.find('img')
                img.attr('src', src)
                uf.remove() // 删除上传显示
                opt.img.show()
              } else opt.el.name(`img${idx}`).css('background-image', `url(${src})`)
            }

            _.showChoose()

            // 填入 input，方便客户读取
            _.updateInput()

            // 上传成功事件
            _.callEvent('success', rs.data, file, this.files)
            // _.emit('local::success', rs.data, file, this.files)
          }
        } else {
          file.status = 'error'
          _.callEvent('error', parseError(xhr), file, this.files)
        }
    }

    xhr.onerror = e => {
      file.status = 'error'
      _.callEvent('error', parseError(xhr), file, _.files)

      _.showChoose()
    }

    // 数据发送进度，前50%展示该进度,后50%使用模拟进度!
    xhr.upload.onprogress = e => {
      if (timer) return

      const {total, loaded} = e
      percent = total > 0 ? (100 * loaded) / total / 2 : 0
      console.log(`... ${percent}%`)

      if (percent >= 50) mockProgress()
      else {
        let n = opt.input.parent()
        n = n.name(file.name)
        n = n.class(`${css._content}`)
        n.html(`${percent}%`)
      }

      e.percent = percent
      _.callEvent('progress', e, file, _.files)
    }

    console.log({xhr, url: opt.url}, 'post')
    xhr.send(fd)
  }

  destroy() {
    this.input.removeEventHandler('change', this.changeHandler)
    $(this.input).remove()
    this.gallery.remove()
  }
}

/**
 *
 * @param {*} url
 * @returns
 */
function loadImg(url) {
  return new Promise((res, rej) => {
    // 不能使用页面中的img,页面中的img会压缩图片，得不到图片真实大小!
    const img = new Image()
    img.src = url
    if (img.complete) {
      res(img)
    } else {
      img.onload = () => res(img)
    }
  })
}

/**
 *
 * @param {*} header
 * @returns
 */
function getHeader(header) {
  const R = {
    'content-type': `multipart/form-data; boundary=${getBoundary()}`,
  }

  Object.keys(header).forEach(k => {
    R[k.toLowerCase()] = header[k]
  })

  return R
}

function getBoundary() {
  // This generates a 50 character boundary similar to those used by Firefox.
  // They are optimized for boyer-moore parsing.
  let R = '----'
  for (let i = 0; i < 24; i++) {
    R += Math.floor(Math.random() * 10).toString(16)
  }

  return R
}

/**
 * 获得文件类型
 * @param {*} mimeType
 * @returns {string}
 */
function getFileType(mimeType) {
  let R

  try {
    if (!mimeType || typeof mimeType !== 'string') return

    if (mimeType.startsWith('image/')) R = 'img'
    if (mimeType.startsWith('audio/')) R = 'audio'
    if (mimeType.startsWith('video/')) R = 'video'

    const docTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'text/plain',
      'text/csv',
    ]
    if (docTypes.includes(mimeType)) R = 'doc'
  } catch (e) {
    log.err(e, 'getFileType')
  }

  return R
}

/**
 * 获取上传文件缩略图标
 * @param {string} ext
 * @param {string} [url]
 * @returns {string}
 */
function getThumb(ext, url) {
  let R
  try {
    ext = `.${ext}`
    if (ext.endsWith('.docx')) ext = '.doc'
    else if (ext.endsWith('.xlsx')) ext = '.xls'

    ext = ext.replace(/^\.+/, '.')

    if (/\.(pdf|xls|doc|csv|txt|zip|rar|ppt|avi|mov|mp3)/i.test(ext)) R = `https://cos.wia.pub/wiajs/img/uploader/${ext.substring(1)}.png`
    else R = url ?? 'https://cos.wia.pub/wiajs/img/uploader/raw.png'
  } catch (e) {
    log.err(e, 'getThumb')
  }

  return R
}

export {Uploader as default, getFileType, getThumb}
