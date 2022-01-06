# Change Log

## 2022-01-05

dataTable

二维数组，支持指定 id 字段，用于选择后操作

- setView 支持 id
- paging 支持 id
- bind 支持 id

## 2021-11-15

dataTable

- sort 为缺省排序列名称，数据加载时，按此列升序排序
- 修正无数据分页未清除 bug

uploader

- 修正 img/compress 引用路径
- 增加了说明
- 支持不同的图片 url 模式，方便图片展示

```js
  {
    dir: 'https://img.wia.pub/star/etrip/xhlm',
    file: [
    'c8238fe5ffd169cb83e92eed7a1c2a82.jpg',
    '391c5b4152a51cfba8a3dcad44bce70f.jpg',]
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
```

- \_callHook 改为 callEvent

## 2021-11-14

- \+ dataTable
  数据表，用于展示数据，当前版本适用于 PC
- \+dataView
  数据视图，用于详情，当前版本适用于 PC

## 2020-07-10

- searchbar

core

- lib/bmap.js
  百度地图
- page
  从 Event 继承，支持事件触发和发射
  生命周期触发页面事件，方便有些组件在页面隐藏时卸载。
  页面 Dom 对象用 view 变量保存，原来为 page，容易与 Page 类混淆
  ready 时，自动隐藏页面模版：view.qus('[name$=-tp]').hide();
  show 时，自动调用 reset 方法：if (!back && this.reset) this.reset();

## 2020-06-06

actions\index.js

支持 page 页面创建好菜单、背景蒙版方式，点击菜单后，自动关闭
\+ moveToRoot
自定义菜单，需设置为 false

## 2020-06-03

- listNav
  \+ \_.emit('local::click listNavClick', e);
  导航触发 indexSelect 事件
- uploader
  优先获取 input 对象的 data 属性

## 2020-05-30

- \+ actions
  从 底部弹出菜单
- \+ swipeout
  Dom 支持 swipe 事件，这里只有 index.less 样式起作用

## 2020-05-24

### uploader

修正 Gallery 全屏预览故障，Gallery 层在 .page-current 之前创建，在页面切换时，导致 Gallery 层创建到上一个页面。

index.js

- 修正 page
  改为从当前 el 向上找第一个 .page 层，确保在当前层创建。
  `this.page = opt.el.parentNode('.page');`
- 延迟 Gallery 创建时间
  从组建初始化时创建，改为显示时没有则自动创建
- 默认隐藏

## 2020-05-21

#### cropper

- \- forEach
  改为 \$.forEach
- \* handler.js
  this.emit event params change
- \* index.js
  ready event params change
  fix unbuild bug
- \* method.js
  fix bug
- \* preview.js
  fix bug
  preview fix width
- \* render.js
  crop event param change
- \* util.js
  \- forEach

#### uploader

\* index.js

- \+ opt.aspectRatio
  宽高比
- \+ opt.crop
  采集器网址
  data('id') 来识别 文件层
- \* preview
  不符合宽高比， 图片标记告警，点击 crop 自动 go 到裁剪页面
- \+ getFile
  通过 id 获取 file
- \+ replace
  裁剪后，替换文件
- \* compress
  接收 crop 裁剪返回的 blob 数据，进行压缩
- \* upload
  crop 状态不上传，裁剪后，自动压缩上传
- \+ toBlob
  promise 方式，canvas 返回 blob 对象
- \+ loadImg
  promise 方式返回图片加载

## 2020-05-19

- \* uploader
  图片上传组件，支持多个和单个图片模式
- \+ cropper
  图片裁剪组件
- \+ list-nav
  类似美团外卖左边菜单的分类列表

## 2020-05-16

- \* uploader/index.js
  支持头像这种单图像文件选择、上传

## 2020-05-14

- \+ uploader
  图片上传组件
  需单独发布到 npm，检查一下 package.json 是否正确
  readme 是错的，先发布，方便大家使用，下次修正吧
