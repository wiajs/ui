English | [Chinese](./README.CN.md)

# Wia UI

UI mponents for [wia](https://www.wia.pub) applications.

See [wia components](https://www.wia.pub/doc/component.html) documentation for detailed description.

Some components copy from F7 and removed tight integration with the Wia App,
You need to new and manual process code。

## install

You will need Node.js installed on your system.

First, install

```bash
$ npm i -D @wiajs/ui
```

## To use

Take uploader as an example, to make a register page

in register.js file:

```js

import Uploader from '@wiajs/ui/uploader';

function init(pg)
  _uploader = new Uploader({
    upload: true, // 自动上传
    url: _url, // 上传网址
    dir: 'star/etrip/demo', // 图片存储路径，格式: 所有者/应用名称/分类
    el: pg.clas('uploader'), // 组件容器
    input: pg.name('avatar'), // 上传成功后的url填入输入框，便于提交
    choose: pg.name('choose'), // 点击触发选择文件

    multiple: false, // 可否同时选择多个文件
    limit: 1, // 文件数限制 -1 0 不限，1 则限制单个文件，如 头像
    accept: 'image/jpg,image/jpeg,image/png,image/gif', // 选择文件类型
    compress: true, // 自动压缩
    quality: 0.5, // 压缩比

    // xhr配置
    data: {}, // 添加到请求头的内容
  });

```

in your register.less file:

```less
@import '@wiajs/ui/dist/uploader/index.less';
```

in your register.html file:

```html
  <div class="page-content">
    <form name="fmData">
      <div class="list inline-labels">
        <ul>
          <li class="avatar">
            <a href="" class="item-link item-content">
              <div class="item-title item-label">头像<span>*</span></div>
              <div name="choose" class="item-inner">
                <div class="item-after uploader">
                  <input name="avatar" type="hidden" />
                </div>
              </div>
            </a>
          </li>
        </ul>
      <div>
    </form>
  </div>
```
