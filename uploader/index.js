/**
 * 文件选择、压缩、预览、上传
 * Referenced:
 *  https://github.com/impeiran/Blog/tree/master/uploader
 *  https://weui.io/#uploader
 * 
 *  使用方法：
  _uploader = new Uploader({
    upload: true, // 自动上传
    url: _url, // 上传网址
    dir: 'star/etrip/xhlm', // 图片存储路径，格式: 所有者/应用名称/分类
    el: pg.class('uploader'), // 组件容器，点击
    input: pg.name('avatar'), // 输入、输出接口，显示填入或上传成功后的url填入
    choose: pg.name('choose'), // 点击触发选择文件，可选，多文件时，可不填

    multiple: false, // 可否同时选择多个文件
    limit: 1, // 文件数限制 0 不限，1 则限制单个文件，如 头像
    accept: 'image/jpg,image/jpeg,image/png,image/gif', // 选择文件类型
    compress: true, // 自动压缩
    quality: 0.5, // 压缩比

    // xhr配置
    data: {}, // 添加到请求头的内容
  });

 * 事件
  _uploader
    .on('success', rs => {
      // 上传成功
    })
    .on('error', rs => {
      // 上传出错
    });

 * 改变input中的值，会触发change事件，自动加载 preview，preview根据状态，
   向容器添加图片显示html代码。
input 中设置 图片网址，可自动加载，用于数据加载时，加载图片
输入参数格式：
        {
          dir: 'https://img.wia.pub/star/etrip/xhlm',
          file: [
            'c8238fe5ffd169cb83e92eed7a1c2a82.jpg',
            '391c5b4152a51cfba8a3dcad44bce70f.jpg',
          ],
        }
        // 或者
        {
          file: [
            'https://img.wia.pub/star/etrip/xhlm/c8238fe5ffd169cb83e92eed7a1c2a82.jpg',
            'https://img.wia.pub/star/etrip/xhlm/391c5b4152a51cfba8a3dcad44bce70f.jpg',
          ],
        }
        // 或者
          'https://img.wia.pub/star/etrip/xhlm/c8238fe5ffd169cb83e92eed7a1c2a82.jpg',
          'https://img.wia.pub/star/etrip/xhlm/391c5b4152a51cfba8a3dcad44bce70f.jpg'
        // 或者
        'https://img.wia.pub/star/etrip/xhlm/c8238fe5ffd169cb83e92eed7a1c2a82.jpg',

 * 目前模板是代码写死的，后期可增加修改模板接口。
 * 相关样式在 uploader中做了定义，可根据需要修改覆盖
 * less中，组件样式引入
   @import '@wiajs/component/uploader/index.less';

 * js中，组件引入
   import Uploader from '@wiajs/component/uploader';

 */

import Compress from '@wiajs/lib/img/compress';

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

  compress: true, // 启用压缩
  quality: 0.5, // 压缩比
  preview: true, // 是否预览
  aspectRatio: 0, // 设置宽高比，0 关闭
  // aspectRatio: 1, // 宽高比
  // crop: 'img/crop', // 裁剪

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
  constructor(opts = {}) {
    this.id = 1;

    this.opt = {...def, ...opts};
    // if (this.opt.dir) this.opt.dir = this.opt.dir.trim;
    this.init(this.opt);
  }

  /**
   * 初始化
   * @param {Object} opt
   */
  init(opt) {
    this.files = [];

    this.input = this.initInput(opt);
    this.page = opt.el.parentNode('.page');

    this.bind(opt);
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

    let gal = this.page.class('gallery');
    if (!gal || !gal.length) {
      const tmpl = `
  <div class="gallery" style="display: none;">
    <span class="_img"></span>
    <div class="flex-center _opr">
      <a href="javascript:;" name="delete">
        <i class="icon iconfont">&#xe8b6;</i>
      </a>
    </div>
  </div>`;

      gal = $(tmpl);
      gal.insertBefore(this.page.class('page-content'));
      // 图片预览
      gal.click(ev => {
        ev.stopPropagation(); // 阻止冒泡，避免上层 choose再次触发
        ev.preventDefault();
        gal.hide();
        // $gallery.fadeOut(100);
      });

      gal.name('delete').click(ev => {
        const id = gal.class('_img').data('id');
        this.remove(id);
      });

      gal = this.page.class('gallery');
      this.gallery = gal;
    }
    return gal;
  }

  /**
   * 事件绑定
   * @param {*} opt 选项
   */
  bind(opt) {
    // const self = this;
    // ontouchstart/addEventListener 有时无法触发文件选择
    // opt.input.dom.onclick = ev => {
    //   this.chooseFile();
    // };
    // 外部更改input时，显示图片
    opt.input.change(ev => {
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
        this.preview();
      }
      } catch (ex) {
        console.error(`input value exp:${ex.message}`);
      }
    });

    // 点击容器，没有点图片则选择图片，点图片则预览，
    if (opt.el) {
      opt.el.click(ev => {
        // console.log('el click', {ev});
        ev.stopPropagation(); // 阻止冒泡，避免上层 choose再次触发
        ev.preventDefault(); // 可能导致层缺省行为无效
        const file = $(ev.target).closest('._file');
        if (file.length > 0) {
          const f = this.getFile(file.data('id'));
          // 进入裁剪页面
          if (f && f.status === 'crop' && this.opt.crop)
            $.go(this.opt.crop, {
              src: 'crop',
              id: f.id,
              url: f.url, // 图像数据
              aspectRatio: this.opt.aspectRatio,
            });
          else this.showGallery(file);
        } else if (!opt.choose) {
          // console.log('el click', {ev});
          this.chooseFile();
        }
      });
    }

    // 如额外提供choose，点击则选择文件
    if (opt.choose) {
      opt.choose.click(ev => {
        // console.log('choose click', {ev});
        ev.stopPropagation(); // 阻止事件冒泡
        this.chooseFile();
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
        gal.class('_img').attr('style', file.attr('style')).data('id', file.data('id'));
        gal.show();
      }
    }
    // $gallery.fadeIn(100);
  }

  // 响应事件[preview, success, error, choose, exceed, change, progress]
  on(evt, cb) {
    if (evt && typeof cb === 'function') {
      this['on' + evt] = cb;
    }
    return this;
  }

  // 调用外部响应事件
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
   * @param {*} files
   * @returns
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

        const rg = /(\.(?:jpeg|jpg|png|gif))$/i.exec(file.name);

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
    if (this.opt.preview) this.preview();

    return true;
  }

  getFile(id) {
    return this.files.find(f => f.id == id);
  }

  /**
   * 裁剪后，替换文件
   * @param {*} url
   * @param {*} canvas
   */
  async replace(id, canvas) {
    const file = this.files.find(f => f.id == id);
    if (file && canvas) {
      file.status = 'croped';
      file.canvas = canvas;
      file.blob = await toBlob(canvas);
      file.ext = '.jpg';
      file.rawFile = null;
      file.url = canvas.toDataURL('image/jpeg');
      file.size = file.blob.size;
      this.preview();
    }
  }

  /**
   * 添加预览图片到显示容器
   * @param {file} file
   */
  async preview() {
    // const fs = this.files.filter(f => f.status === 'choose');
    if (this.files && this.files.length > 0) {
      this.files.forEach(async f => {
        let src;
        let tp;
        if (f.status === 'choose') {
          f.status = 'preview';
          const url = window.URL || window.webkitURL || window.mozURL;
          src = url && f.rawFile && url.createObjectURL(f.rawFile);
          tp =
            '<div name="img#id#" data-id="#id#" class="flex-center _file _status" style="background-image: url(#url#);">' +
            '<div class="_content">50%</div></div>';

          // 指定宽高比
          if (this.opt.aspectRatio) {
            const img = await loadImg(src);
            if (
              Math.round((img.naturalWidth * 100) / img.naturalHeight) / 100 !==
              this.opt.aspectRatio
            ) {
              f.status = 'crop';
              f.img = img;
              f.url = src;
              tp =
                '<div name="img#id#" data-id="#id#" class="flex-center _file _status" style="background-image: url(#url#);">' +
                '<div class="flext-center _content"><i class="icon iconfont">&#xe61c;</i</div></div>';
            }
          }
        } else if (f.status === 'croped') {
          // 裁剪后的文件，准备自动上传
          this.opt.el.name(`img${f.id}`).remove();
          f.status = 'preview';
          src = f.url;
          tp =
            '<div name="img#id#" data-id="#id#" class="flex-center _file _status" style="background-image: url(#url#);">' +
            '<div class="_content">50%</div></div>';
        } else if (f.status === 'upload') {
          // 待上传
          const n = this.opt.el.name(`img${f.id}`);
          if (n.length === 0) src = `${f.file}`;
          tp =
            '<div name="img#id#" data-id="#id#" class="flex-center _file" style="background-image: url(#url#);"></div>';
        }

        if (src) {
          $(tp.replace(/#id#/gi, f.id).replace('#url#', src)).insertBefore(this.opt.input);

          this.callEvent('preview', f, this.files);
          this.opt.upload && this.upload();
        }
      });
    }
  }

  /**
   * 压缩
   * @param {*} file
   * @param {*} cb
   * @returns
   */
  compress(file, cb) {
    if (!file || file.compress || file.status === 'upload' || file.status === 'crop') return;

    const self = this;
    const press = new Compress(file.blob || file.rawFile, {
      quality: this.opt.quality,
      success(r) {
        // The third parameter is required for server
        // formData.append('file', r, r.name);
        console.log('compress', {
          name: r.name,
          rate: Math.round((r.size * 100) / file.size, 2),
        });
        file.rawFile = r;
        file.size = r.size;
        file.compress = true;
        // console.log('compress', {r});
        if (cb) cb.call(self, file);
      },
      error(err) {
        console.log(err.message);
      },
    });
  }

  removeFile(file) {
    const id = file.id || file;
    this.remove(id);
  }

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
    console.log('updateInput', {fs});

    if (fs.length > 0) {
      const rs = fs.map(f => f.file);
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
    this.opt.el.classes('_file').remove();
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

  // 压缩文件
  prePost(file) {
    if (this.opt.compress) this.compress(file, f => this.post(f));
    else this.post(file);
  }

  /**
   * 图片上传，将图片转成二进制Blob对象，装入formdata上传
   * 文件上传浏览器自动设置 content-type: multipart/form-data; 分片上传
   * @param {*} file
   */
  async post(file) {
    if (!file.rawFile || file.status === 'upload') return;
    console.log('post', {file});

    let percent = 0;
    let timer = null;
    const self = this;
    const ls = self.opt.input.parent();

    // 数据后50%用模拟进度
    function mockProgress() {
      if (!self.opt.preview || timer) return;
      const t3 = this;

      timer = setInterval(() => {
        percent += 5;

        // $li.find(".progress span").css('width', percent + "%");
        const f = ls.name(`img${file.id}`);
        const content = f.class('_content');
        content.html(`${percent}%`);

        // self.opt.input
        //   .parent()
        //   .name(file.name)
        //   .class('_content')
        //   .html(`${percent}%`);
        // console.log(`... ${percent}%`);

        if (percent >= 99) {
          clearInterval(timer);
          f.removeClass('_status');
          content.remove();
        }
      }, 50);
    }

    const {data, withCredentials} = this.opt;

    const fd = new FormData();
    // 传入路径、文件数据和文件名称
    const fn = `${file.id}${file.ext}`; // id.文件扩展名，不可重复
    fd.append(this.opt.dir, file.rawFile, fn);

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
            //      name: '3.jpg',
            //      dir: 'nuoya/fin/req',
            //      len: 55834,
            //      file: 'a42f5e9265e42064d169c76700209d4f.jpg',
            //      host: 'https://fin.wia.pub'
            //    }
            //  }

            const r = rs.data[fn];
              // 服务器返回存储路径、文件名称
            if (r.file) {
                const id = r.name.replace(/\.\w+/i, '');
                // 不支持多文件、多次不同路径上传
              file.file = `${r.host}/${r.dir}/${r.file}`;
                if (this.opt.preview)
                  this.opt.el
                    .name(`img${id}`)
                    .css('background-image', `url(${r.host}/${r.dir}/${r.file})`);
              else if (this.opt.img) this.opt.img.attr('src', file.file);
              }

            // 填入 input，方便客户读取
            this.updateInput();

            // 上传成功事件
            this.callEvent('success', rs.data, file, this.files);
          }
        } else {
          file.status = 'error';
          this.callEvent('error', parseError(xhr), file, this.files);
        }
    };

    xhr.onerror = e => {
      file.status = 'error';
      this.callEvent('error', parseError(xhr), file, this.files);
    };

    // 数据发送进度，前50%展示该进度,后50%使用模拟进度!
    xhr.upload.onprogress = e => {
      if (!self.opt.preview || timer) return;
      const {total, loaded} = e;
      percent = total > 0 ? (100 * loaded) / total / 2 : 0;
      console.log(`... ${percent}%`);

      const t2 = this;

      if (percent >= 50) mockProgress();
      else {
        let n = this.opt.input.parent();
        n = n.name(file.name);
        n = n.class('_content');
        n.html(`${percent}%`);
      }

      e.percent = percent;
      this.callEvent('progress', e, file, this.files);
    };

    // const headers = getHeaders(this.opt.headers);
    Object.keys(this.opt.headers).forEach(key => {
      xhr.setRequestHeader(key, this.opt.headers[key]);
    });

    console.log('post', {xhr, url: this.opt.url});
    xhr.send(fd);
  }

  destroy() {
    this.input.removeEventHandler('change', this.changeHandler);
    $(this.input).remove();
    this.gallery.remove();
  }
}

function toBlob(canvas) {
  return new Promise((res, rej) => {
    try {
      canvas.toBlob(blob => res(blob), 'image/jpeg'); // default 0.92
    } catch (ex) {
      rej(ex.message);
    }
  });
}

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
