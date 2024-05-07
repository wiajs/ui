/** @jsx jsx */
import {jsx} from '@wiajs/core';
import Compress from '@wiajs/lib/compress';
// @ts-ignore
import styles from './index.less';

/** @typedef {object} FileType
 * @prop {number} id
 * @prop {Blob} rawFile
 * @prop {string} name
 * @prop {string} ext
 * @prop {number} size
 * @prop {string} status
 * @prop {HTMLCanvasElement} canvas
 * @prop {boolean} compress
 * @prop {string} url
 */

const def = {
  url: 'https://lianlian.pub/img/upload', // 图片上传服务接口
  // dir: 'slcj/contract', // 图片存储路径，格式: 所有者/应用名称/分类，结尾不要带/
  el: $('.uploader'), // 容器
  multiple: true, // 同时选择多个文件
  limit: 0, // 0 不限制数量
  upload: true, // 自动上传
  // accept: '*', // 不限类型
  accept: 'image/jpg,image/jpeg,image/png,image/gif', // 选择文件类型
  // dir: 'lianlian/esign/test', // 图片存储路径，格式: 所有者/应用名称/分类

  preview: true, // 点击图片是否预览，图片可提供大图预览，其他文件可在preview事件中提供预览功能
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

  headers: {},
  data: {},
  withCredentials: false,
};

/**
 * 解析服务器返回失败消息
 * @param {*} xhr
 * @returns
 */
const parseError = xhr => {
  let msg = '';
  const {responseText, responseType, status, statusText} = xhr;
  if (responseText && responseType === 'text') {
    try {
      msg = JSON.parse(responseText);
    } catch (error) {
      msg = responseText;
    }
  } else {
    msg = `${status} ${statusText}`;
  }

  const err = new Error(msg);
  err.status = status;
  return err;
};

/**
 * 解析服务器返回成功消息
 * @param {*} rs
 * @returns
 */
const parseSuccess = rs => {
  if (rs) {
    try {
      return JSON.parse(rs);
    } catch (ex) {
      console.log('parseSuccess', {exp: ex.message});
    }
  }

  return rs;
};

export default class Uploader {
  /** @type {FileType[]} */
  files;

  /** @type {*} */
  opt;

  constructor(opts = {}) {
    this.id = 1;

    const opt = {...def, ...opts};
    if (!opt.accept.startsWith('image/')) {
      opt.compress = false; // 关闭压缩
      opt.quality = 1; // 压缩比
      opt.preview = false; // 非图形，不提供内部预览
      opt.aspectRatio = 0; // 设置宽高比，0 关闭
    }

    // if (this.opt.dir) this.opt.dir = this.opt.dir.trim;
    this.init(opt);
  }

  /**
   * 初始化，可被调用
   * @param {{el:*}} opt
   */
  init(opt) {
    const _ = this;

    _.opt = opt;
    _.el = _.opt.el;

    /** @type {*[]} */
    _.files = [];

    _.input = this.initInput(opt);
    _.page = opt.el.parentNode('.page');

    _.el.removeClass('uploader').addClass(`${styles.uploader} uploader`); // 内置样式已改名
    _.el.class('_input').removeClass('_input').addClass(`${styles._input} _input`); // 内置样式已改名

    this.bind();
  }

  /**
   * 创建并返回 file input 组件，用于选择文件
   * @param {*} opt
   */
  initInput(opt) {
    // 选择文件后返回
    this.changeHandler = e => {
      let {files} = e.target;

      console.log('initInput', {files});

      const type = Object.prototype.toString.call(files);
      if (type === '[object FileList]') {
        files = [].slice.call(files);
      } else if (type === '[object Object]' || type === '[object File]') {
        files = [files];
      }

      // 外部可干预，返回false或者文件数组
      const ret = this.callEvent('choose', files);
      if (ret !== false) {
        this.loadFiles(ret || files);
      }
    };

    /** @type{*} */
    const el = document.createElement('input');

    Object.entries({
      type: 'file',
      accept: opt.accept,
      multiple: opt.multiple,
      hidden: true,
    }).forEach(([key, value]) => {
      el[key] = value;
    });

    el.addEventListener('change', this.changeHandler);
    opt.el.append(el);

    return el;
  }

  // 大图浏览
  getGallery() {
    if (!this.opt.preview) return null;

    let gal = this.page.class(`${styles.gallery}`);
    if (!gal || !gal.length) {
      const tmpl = (
        <div class={styles.gallery} style="display: none;">
          <span class={styles._img} />
          <div class={`flex-center ${styles._opr}`}>
            <a href="javascript:;" name="delete">
              <i class="icon iconfont">&#xe8b6;</i>
            </a>
          </div>
        </div>
      );

      gal = $(tmpl);
      gal.insertBefore(this.page.class('page-content'));
      // 图片预览
      gal.click(
        /** @param {*}ev */ ev => {
          ev.stopPropagation(); // 阻止冒泡，避免上层 choose再次触发
          ev.preventDefault();
          gal.hide();
          // $gallery.fadeOut(100);
        }
      );

      gal.name('delete').click(
        /** @param {*}ev */ ev => {
          const id = gal.class(`${styles._img}`).data('id');
          this.remove(id);
        }
      );

      gal = this.page.class(`${styles.gallery}`);
      this.gallery = gal;
    }
    return gal;
  }

  /**
   * 事件绑定
   */
  bind() {
    const _ = this;
    const {opt} = _;

    // const self = this;
    // ontouchstart/addEventListener 有时无法触发文件选择
    // opt.input.dom.onclick = ev => {
    //   this.chooseFile();
    // };
    // 外部更改input时，显示图片
    opt.input.change(
      /** @param {*}ev */ ev => {
        // 优先获取 data
        try {
          let p = opt.input.dom.data;
          const val = opt.input.val();
          // 字符串转对象
          if ($.isEmpty(p) && val) {
            // json
            if (/^\{[\s\S]+\}/.test(val)) p = JSON.parse(opt.input.val());
            else {
              p = {dir: ''};
              p.file = val.split(',');
            }
          }

          if (p && p.file) {
            this.clear();
            this.files = p.file.map(v => {
              // const {dir} = p;
              // const host = dir.replace(`/${opt.dir}`, '');
              const f = {
                id: this.id++, // 内部计数
                // dir 可选
                file: p.dir ? `${p.dir}/${v}` : v,
                status: 'upload',
              };
              return f;
            });
            this.load();
          }
        } catch (ex) {
          console.error(`input value exp:${ex.message}`);
        }
      }
    );

    // 点击容器，没有点图片则选择图片，点图片则预览，
    if (opt.el) {
      opt.el.click(
        /** @param {*}ev */ ev => {
          const file = $(ev.target).closest(`.${styles._file}`);
          // console.log('el click', {file, ev, _file: styles._file});

          // 点击图片，预览或裁剪
          if (file.length > 0) {
            // el 上设置，手机可以触发选择文件，pc失效
            ev.stopPropagation(); // 阻止冒泡，避免上层 choose再次触发
            ev.preventDefault(); // 阻止缺省行为，可能导致层缺省行为无效
            const f = this.getFile(file.data('id'));
            // 进入裁剪页面
            if (f && f.status === 'crop' && opt.crop)
              $.go(opt.crop, {
                src: 'crop',
                id: f.id,
                url: f.url, // 图像数据
                aspectRatio: opt.aspectRatio,
              });
            else {
              if (opt.preview) this.showGallery(file);

              this.callEvent('preview', f);
            }
          } else if (!opt.choose) _.chooseFile();
        }
      );
    }

    // 如指定文件选择器choose，点击则选择文件
    if (opt.choose) {
      opt.choose.click(ev => {
        ev.stopPropagation(); // 阻止事件冒泡
        _.chooseFile();
      });
    }
  }

  /**
   * 图片显示
   * @param {*} file
   */
  showGallery(file) {
    if (file.length > 0) {
      const gal = this.getGallery();

      if (gal.length) {
        gal.class(`${styles._img}`).attr('style', file.attr('style')).data('id', file.data('id'));
        gal.show();
      }
    }
    // $gallery.fadeIn(100);
  }

  // 响应事件[choose, load, success, error, exceed, change, progress]
  on(evt, cb) {
    if (evt && typeof cb === 'function') {
      this['on' + evt] = cb;
    }
    return this;
  }

  /**
   * 调用外部响应事件
   * @param {*} evt
   * @param  {...any} args
   * @returns
   */
  callEvent(evt, ...args) {
    if (evt && this['on' + evt]) {
      return this['on' + evt].apply(this, args);
    }
  }

  /**
   * 利用隐藏的文件输入组件实现文件选择
   */
  chooseFile() {
    console.log('chooseFile');

    this.input.value = '';
    this.input.click(); // 弹出文件选择
  }

  /**
   * 外部传入文件数组
   * @param {File|FileType[]} files
   * @returns {boolean}
   */
  loadFiles(files) {
    if (!files) return false;

    if (this.opt.limit > 0 && files.length && files.length + this.files.length > this.opt.limit) {
      if (this.opt.limit === 1) this.clear();
      // 单文件替换
      else {
        this.callEvent('exceed', files);
        return false;
      }
    }

    this.files = this.files.concat(
      files.map(file => {
        if (file.id && file.rawFile) return file;

        // 任意后缀
        const rg = /(\.(?:\w+))$/i.exec(file.name);

        return {
          id: this.id++,
          rawFile: file,
          name: file.name,
          ext: rg && rg[1],
          size: file.size,
          status: 'choose',
        };
      })
    );

    this.callEvent('change', this.files);
    this.load();

    return true;
  }

  getFile(id) {
    return this.files.find(f => f.id == id);
  }

  /**
   * 裁剪后，更新文件
   * @param {number|string} id
   * @param {Blob} blob
   */
  async update(id, blob) {
    const file = this.files.find(f => f.id == id);
    if (file && blob) {
      file.status = 'croped';
      // @ts-ignore
      blob.name = file.name.replace(/\.\w+$/i, '.jpg');
      file.ext = '.jpg';
      file.size = blob.size;
      file.rawFile = blob;
      file.url = URL.createObjectURL(blob);
      this.load();
    }
  }

  /**
   * 从文件系统加载文件到上传容器，非图形文件用文件后缀图标表示，图片用缩略图表示
   */
  async load() {
    const _ = this;
    const {opt} = _;

    // const fs = this.files.filter(f => f.status === 'choose');
    if (this.files && this.files.length > 0) {
      this.files.forEach(async f => {
        let src;
        let tp;
        if (f.status === 'choose') {
          f.status = 'load';

          let {ext} = f;
          if (ext === '.docx') ext = '.doc';
          else if (ext === 'xlsx') ext = '.xls';

          if (/\.(jpeg|jpg|png|gif)/i.test(ext)) {
            const URL = window.URL || window.webkitURL || window.mozURL;
            src = URL && f.rawFile && URL.createObjectURL(f.rawFile);
          } else if (/\.(pdf|xls|doc|csv|txt|zip|rar|ppt|avi|mov|mp3)/i.test(ext))
            src = `https://cos.wia.pub/wiajs/img/uploader/${ext.substring(1)}.png`;
          else src = 'https://cos.wia.pub/wiajs/img/uploader/raw.png';

          if (!opt.img) {
            tp = (
              <div
                name={`img${f.id}`}
                data-id={f.id}
                class={`flex-center ${styles._file} ${styles._status}`}
                style={`background-image: url(${src}); background-size: contain`}>
                <div class={styles._content}>50%</div>
              </div>
            );

            // 指定宽高比
            if (opt.aspectRatio) {
              const img = await loadImg(src);
              if (
                Math.round((img.naturalWidth * 100) / img.naturalHeight) / 100 !==
                this.opt.aspectRatio
              ) {
                f.status = 'crop';
                f.img = img;
                f.url = src;
                tp = (
                  <div
                    name={`img${f.id}`}
                    data-id={f.id}
                    class={`flex-center ${styles._file} ${styles._status}`}
                    style={`background-image: url(${src}); background-size: contain`}>
                    <div class={`flex-center ${styles._content}`}>
                      <i class="icon iconfont">&#xe61c;</i>
                    </div>
                  </div>
                );
              }
            }
          }
        } else if (f.status === 'croped') {
          // 裁剪后的文件，重新加载，准备自动上传
          opt.el.name(`img${f.id}`).remove();
          f.status = 'load';
          src = f.url;

          if (!opt.img)
            tp = (
              <div
                name={`img${f.id}`}
                data-id={f.id}
                class={`flex-center ${styles._file} ${styles._status}`}
                style={`background-image: url(${src}); background-size: contain`}>
                <div class={styles._content}>50%</div>
              </div>
            );
        } else if (f.status === 'upload') {
          // 待上传
          const n = opt.el.name(`img${f.id}`);
          if (n.length === 0) src = `${f.file}`;
          if (!opt.img)
            tp = (
              <div
                name={`img${f.id}`}
                data-id={f.id}
                class={`flex-center ${styles._file}`}
                style={`background-image: url(${src}); background-size: contain`}
              />
            );
        }

        if (src) {
          if (opt.img) opt.img.attr('src', src);
          else if (tp) $(tp).insertBefore(opt.input);

          _.callEvent('load', f, _.files);
          console.log({f, files: _.files}, 'load');

          opt.upload && _.upload();
        }
      });
    }
  }

  /**
   * 压缩
   * @param {FileType} file
   * @returns {Promise<FileType>}
   */
  async compress(file) {
    let R;

    const _ = this;
    const {opt} = _;
    const {quality, maxSize, width, height, resize} = opt;

    if (!file || file.compress || file.status === 'upload' || file.status === 'crop') return;

    const com = new Compress(file.rawFile, {quality, maxSize, width, height, resize});
    const blob = await com.press();
    if (blob) {
      // The third parameter is required for server
      // formData.append('file', r, r.name);
      console.log('compress', {
        name: blob.name,
        rate: `${Math.round((blob.size * 100) / file.size)}%`,
      });

      file.rawFile = blob;
      file.size = blob.size;
      file.name = blob.name; // png -> jpg
      file.ext = /(\.(?:\w+))$/i.exec(file.name)?.[1];
      file.compress = true;
      // console.log('compress', {r});
      R = file;
      // if (cb) cb.call(_, file);
    }

    return R;
  }

  /**
   *
   * @param {*} file
   */
  removeFile(file) {
    const id = file.id || file;
    this.remove(id);
  }

  /**
   *
   * @param {*} id
   */
  remove(id) {
    const index = this.files.findIndex(f => f.id == id);
    if (index > -1) {
      this.files.splice(index, 1);
      this.callEvent('change', this.files);
    }

    this.opt.el.name(`img${id}`).remove();
    this.updateInput();
  }

  /**
   * 上传成功的文件以json方式写入 input，不触发 change
   * 多个文件，每个文件单独触发！
   */
  updateInput() {
    // 已上传成功文件
    const fs = this.files.filter(f => f.status === 'upload');
    console.log({fs}, 'updateInput');

    if (fs.length > 0) {
      let rs = fs.map(f => f.file);
      // 一个文件，数组转为文件
      if (rs.length === 1) [rs] = rs;
      this.opt.data = rs;
      this.opt.input.val(JSON.stringify(rs));
    } else this.opt.input.val('');
  }

  /**
   * 清除内部文件
   */
  clear() {
    this.id = 1;
    this.files = [];
    this.opt.el.classes(`${styles._file}`).remove();
    this.callEvent('change', this.files);
  }

  /**
   * 非裁剪、上传状态文件，进入上传流程
   * @param {*} file
   * @returns
   */
  upload(file) {
    if (!this.files.length && !file) return;

    if (file) {
      const target = this.files.find(item => item.id === file.id || item.id === file);
      target && target.status !== 'upload' && target.status !== 'crop' && this.prePost(target);
    } else {
      const fs = this.files.filter(f => f.status !== 'upload' && f.status !== 'crop');
      fs.forEach(f => {
        this.prePost(f);
      });
    }
  }

  /**
   * 压缩文件
   * @param {*} file
   */
  async prePost(file) {
    const _ = this;
    if (_.opt.compress) {
      const f = await _.compress(file);
      _.post(f);
    } else this.post(file);
  }

  /**
   * 图片上传，将图片转成二进制Blob对象，装入formdata上传
   * 文件上传浏览器自动设置 content-type: multipart/form-data; 分片上传
   * @param {*} file
   */
  async post(file) {
    const _ = this;
    const {opt} = _;

    if (!file.rawFile || file.status === 'upload') return;

    console.log({file}, 'post');

    let percent = 0;
    /** @type {NodeJS.Timer} */
    let timer = null;
    const ls = opt.input.parent();

    // 数据后50%用模拟进度
    function mockProgress() {
      if (opt.img || timer) return;

      timer = setInterval(() => {
        percent += 5;

        // $li.find(".progress span").css('width', percent + "%");
        const f = ls.name(`img${file.id}`);
        const content = f.class(`${styles._content}`);
        content.html(`${percent}%`);

        // self.opt.input
        //   .parent()
        //   .name(file.name)
        //   .class(`${styles._content}`)
        //   .html(`${percent}%`);
        // console.log(`... ${percent}%`);

        if (percent >= 99) {
          clearInterval(timer);
          f.removeClass(`${styles._status}`);
          content.remove();
        }
      }, 50);
    }

    const {data, withCredentials} = this.opt;

    const fd = new FormData();
    // 传入路径、文件数据和文件名称
    const fn = `${file.id}${file.ext}`; // id.文件扩展名，不可重复
    fd.append(opt.dir, file.rawFile, fn);

    Object.keys(data).forEach(key => {
      fd.append(key, data[key]);
    });

    const xhr = new XMLHttpRequest();
    xhr.withCredentials = !!withCredentials;

    xhr.open('POST', this.opt.url);
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4)
        if (xhr.status === 200) {
          const rs = parseSuccess(xhr.responseText);
          // 上传成功，返回文件名对象
          if (rs.code === 200 && rs.data[fn]) {
            file.status = 'upload'; // 上传成功状态
            //  {
            //    '3.jpg': {
            //      dir: 'img/req/',
            //      file: 'a42f5e9265e42064d169c76700209d4f.jpg',
            //      host: 'https://fin.wia.pub',
            //      len: 55834,
            //      name: '3.jpg',
            //    }
            //  }

            // {
            //   '1.pdf': {
            //     dir: 'img/mine/',
            //     file: 'fb541d484bf414b80fa67de34b374a96.pdf',
            //     host: 'https://fin.wia.pub',
            //     len: 128625,
            //     name: '1.pdf',
            //   },
            // };

            const r = rs.data[fn];
            // 服务器返回存储路径、文件名称
            if (r.file) {
              const id = r.name.replace(/\.\w+/i, '');
              // 去掉末尾 / 字符
              r.dir = r.dir.replace(/\/$/, '');

              // 不支持多文件、多次不同路径上传
              file.file = `${r.host}/${r.dir}/${r.file}`;

              // 上传成功，更新图片缩略图
              if (opt.img) opt.img.attr('src', file.file);
              else if (/\.(?:jpeg|jpg|png|gif)$/i.test(r.name))
                opt.el.name(`img${id}`).css('background-image', `url(${file.file})`);
            }

            // 填入 input，方便客户读取
            _.updateInput();

            // 上传成功事件
            _.callEvent('success', rs.data, file, this.files);
          }
        } else {
          file.status = 'error';
          _.callEvent('error', parseError(xhr), file, this.files);
        }
    };

    xhr.onerror = e => {
      file.status = 'error';
      _.callEvent('error', parseError(xhr), file, _.files);
    };

    // 数据发送进度，前50%展示该进度,后50%使用模拟进度!
    xhr.upload.onprogress = e => {
      if (opt.img || timer) return;

      const {total, loaded} = e;
      percent = total > 0 ? (100 * loaded) / total / 2 : 0;
      console.log(`... ${percent}%`);

      if (percent >= 50) mockProgress();
      else {
        let n = opt.input.parent();
        n = n.name(file.name);
        n = n.class(`${styles._content}`);
        n.html(`${percent}%`);
      }

      e.percent = percent;
      _.callEvent('progress', e, file, _.files);
    };

    // const headers = getHeaders(this.opt.headers);
    Object.keys(this.opt.headers).forEach(key => {
      xhr.setRequestHeader(key, opt.headers[key]);
    });

    console.log({xhr, url: opt.url}, 'post');
    xhr.send(fd);
  }

  destroy() {
    this.input.removeEventHandler('change', this.changeHandler);
    $(this.input).remove();
    this.gallery.remove();
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
    const img = new Image();
    img.src = url;
    if (img.complete) {
      res(img);
    } else {
      img.onload = () => res(img);
    }
  });
}

/**
 *
 * @param {*} headers
 * @returns
 */
function getHeaders(headers) {
  const R = {
    'content-type': `multipart/form-data; boundary=${getBoundary()}`,
  };

  Object.keys(headers).forEach(k => {
    R[k.toLowerCase()] = headers[k];
  });

  return R;
}

function getBoundary() {
  // This generates a 50 character boundary similar to those used by Firefox.
  // They are optimized for boyer-moore parsing.
  let R = '----';
  for (let i = 0; i < 24; i++) {
    R += Math.floor(Math.random() * 10).toString(16);
  }

  return R;
}
