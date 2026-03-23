# Change Log

## 2026-03-23

### Card (卡片组件)

- **视觉重构**:
  - **iOS**: 复刻原生大圆角 (24px) 与极致平滑内阴影。
  - **MD**: 采用 Material 3 Surface 阴影系统。
  - **PC**: 实现大师级 Artisan 风格，引入呼吸感应边框、悬停位移与高斯模糊背景。
- **架构适配**: 采用 Tailwind 4 `@reference` 模式，实现零冗余输出。
- **功能兼容**: 完美支持 Framework 7 的 Expandable Cards (可展开卡片) 结构与动画。
- **Demo**: `demo/card.html` 已就绪。

### List (列表组件)

- **视觉重构**:
  - **iOS**: 补齐 Chevron 图标与发丝级细线分割。
  - **PC**: 引入左侧呼吸灯感应效果与精致悬停态。
- **兼容性**: 保留 `.item-content`, `.item-inner` 等 F7 核心结构，确保旧 JS 逻辑无缝运行。
- **Demo**: `demo/list.html` 已就绪。

### Button (按钮组件)

- **iOS/MD**: 精准复刻原生交互与动效。
- **PC**: 参照 DaisyUI 与 Ant Design 重新设计，支持多种 Artisan 风格（Fill, Tonal, Outline 等）。
- **Demo**: `demo/button.html` 已就绪。

### Base (基础样式) - 架构进化完成

- **单源能力池**: 最终确立 “单一 base.css 基座” 模式。利用 Tailwind 4 的 `@utility` 指令将核心原子工具（如 `hairline-*`, `no-scrollbar`）注册为全局类。
- **物理特性**: 注入 DPR (Device Pixel Ratio) 动态感知变量，实现真机发丝级细线视觉。
- **原生增强**: 针对移动端优化 `overscroll-behavior` 和 `touch-action`，超越 Framework 7 原生体验。

## 2022-01-05

- messagebar
- messages
  聊天消息

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
