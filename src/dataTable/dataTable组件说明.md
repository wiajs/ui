# DataTable

## 20250721 

附件上传相关和样式相关的更新：

- 附件 数据卡片必须包含：
1、按秦总要求，增加了 cat 分类定义，目前是必须定义，不定义可能无法工作，没有cat，可以定义为 cat: ['所有']，为了知道上传之后是什么cat。
2、增加了 catCol 分类列宽

- ui：
EditTable
  附件上传
  上传时通过 onAttach 方法，可输入 数据
  附件保存到腾讯云返回url
  附件保存到 attach 表，返回 id
  附件 独立到 attach.js
  修正附件图标显示
  附件改为先定义 cat 和 col，超出滚动
  附件增加 上传按钮
  事件 改为 异步模式，方便客户端输入数据上传
  增加 config 方法，设置 上传数据
  增 save 方法，保存成功后调用，更新 data 数据
  cancel、save、view 方法，取消编辑状态
  getVal 支持 checkbox、radio、Autocomplete，附件待完成
  修正 json 编辑标记不消失问题
  增加样式变量，控制大小
 --edit-table-font-size: 14px;
  --edit-table-attach-gap: 2px;
  --edit-table-attach-img: 60px; // 附件图标高度

dataTable/index.js
  支持数据中的排版布局
  
uploader/index.js
  支持label 图标下的标签，满足 EditTable attach 要求
  无论是否指定img参数，都显示上传过程，上传后，如指定 img，删除进程图标，显示 img
  wiaui_uploader 改为 wia_uploader
  wiaui_gallery 改为 wia_gallery
  事件为异步
  data-id 改为 data-fileid，避免冲突
  file.file  改为 file.url，更直观
  上传成功，显示 img 图标，删除进程图标
  增加 config 函数，配置 data、header

## 20250630

1. format: false 数字不格式化 也就是不加千字符
 {name: '编号', type: 'number', width: 4, format: false, sort: true, sum: '合计'},
2. 两个字段相加，$.dataTb.number 函数将非数字转换为0，避免异常
   {name: '计算', width: 6, value: '${($.dataTb.number(r[5]) + $.dataTb.number(r[6])).toFixed(2)}'}, // 无数据
3. $.openFileUrl  附件网址，转换为可直接打开的网址：
   {
    name: '附件',
    width: 6,
    value: '<a href=" " target="_blank">文档</a >',
  },
4. value 直接设置 html 字符: {name: '操 作', width: 6, value: '<a data-tag="edit">编辑</a >'},
5. div和unit：{name: '发电量(MWh)', type: 'number', div: 10000, unit: '%', width: 6, sort: true, sum: true},
6. 支持div, zero, qian, unit, mul, decimal这些参数 要设置。

## 20250626 内嵌表格样式设置提醒

- 内嵌表格最好不要fix数组里面带table，因为会导致大小屏幕不一致，不好看。小屏幕可能挤得只剩下一条数据的高度。
- 分页和height二选一。内嵌表要设一个高度。固定高度是上下拖动。高度在height设。
- 分页的话 page代表一页多少条数据，pagelink代表底下多少个数字显示

## 20250625 更新功能

- 支持计算：  {name: '计算', width: 6, value: '${(r[5] + r[6]).toFixed(2)}'}, // 无数据
- 支持附件：  {
    name: '附件',
    width: 6,
    value: `<a href=" " target="_blank">文档</a >`,
  }
  二维数组中值为url



## 需求描述

创建组件实例，传入表头和数据，自动生成数据展示页面，同时支持排序、分页等功能。

## 安装


```shell
npm i @wiajs/ui
pnpm add @wiajs/ui
```

## 使用

### 参数说明

通过表头(head)对象数组设置数据表功能。

#### 第一个对象为整个数据表设置：

- checkbox: Array，是否带 checkbox 勾选框，对应数据列，空数组或 index。
  'index'：为数据数组索引。
  对应的数据用于选择后按 对应值（一般为 id） 操作行数据。
- id: Array，数组第几列为 id 字段，从 0 开始，作为行唯一标记，防止重复添加。
  id 与 checkbox 有类似功能，没有 checkbox 时，id 也能起到数据对应作用。
  对应数据列，行记录数据唯一值，避免重复添加，没有数据行唯一值，则不设置，否则重复数据无法加载，导致数据缺失！
- hide: Array，隐藏数据列，数组（数据索引），不显示的列，从 0 开始。
  数据列多于表头定义，多余的列需隐藏，对于表来说相当于不存在。
  超出 head 后续数组设置的列，可不列入，自动不显示。
- link: Array，从 1 开始，后续定义的显示列中，第几列为可点击跳转的链接。
  按a标签渲染列，checkbox 不纳入列数计算。
  点击触发数据表实例事件： `on('link', (no, val) => )` ，参数中带被点击列数和列值。
- sort: 字符串，空，不填，表示不排序，名称表示缺省按哪列名称排序。
- page: 不填，或填 0，不分页，填数字，比如 10，表示分页，每页 10 行数据。
  分组时，需不设置，否则无法分组。
- pageLink: 分页条展示页码标签，比如 10，表示分页页码 10 页，其他隐藏，通过按钮滑动分页标签。
- sort: 默认排序列，如：[3]，表示默认按第三列排序，[-3]，表示默认按第三列倒序
- fix: ['table', 'left1', 'left2', 'right1']
  table: 动态固定表高度到满屏，通过数据表滚动条（不是页滚动条）上下滚动表格。
  left1、right1：固定列，左边或右边第几列，左右滚动时一直显示。
  第一行表头自动固定
  设置汇总行时，汇总行自动固定。
- height: 200, 设置表格高度，不设置自动充满父层。
- width: 300, 设置表格宽度，不设置自动充满父层。
- sum: true/false 或不设置，是否显示底部汇总行，空显示为 -，不参与统计。
- layout: 列宽度，不设置，为auto模式，由浏览器自动排版
  'fixed'：通过colgroup设置每列宽度，每列宽度根据后续列中定义，不定义按name长度设置。
  计算方式：列宽为 name 字符宽度 x 16 + 16, 可设置width、min-width 或 max-width，单位：字符 16px，数字8px
  min-width, 如有剩余空间，分配给该字段，max-width 限制最长
- fontSize: 16, 用于fixed计算列宽，fixed 时需要，<colgroup> 控制列宽
- padding: 16, 左右各8px，用于fixed计算列宽
- icon: 16, 排序图标宽度，单位px，用于fixed计算列宽

#### 后续数组对象为每列表头设置

- name: 表头显示名称
- width: 固定列宽，如 6，表示 6个中文字符宽度
  - 设置 width不参与剩余宽度分配。
  - width 与 minWidth、maxWidth 不可同时设置
- minWidth: 可变动最小列宽，如：10，确保是个字符宽，同时参与剩余宽度分配。
- maxWidth: 最大列宽，剩余空间分配后最大列宽，剩余宽度分给其他未设置width列。
- sort: true/false，是否支持排序
  - 持排序鼠标移到该列，会出现排序图标（上或下箭头）
  - false 可省略
- link: 'page/detail?no=${r[0]}'，列数据填充到模板字符串后的跳转链接。
- type: 数据类型，'number' 或 'string'
  - 'string'可省略，左对齐，可使用 sum:'value',保留到分组汇总行。
  - 数字，右对齐，null、空数字自动转换为'-'，不参与统计。数字自动添加千位分隔符。
  - 数字可参与统计
- sum：分组统计或底部统计行
  - true：汇总
  - 'avg'：平均
  - 'value'：原数据值
  - '${count}条'：${count} 替换为实际条数。
  - 字符串：直接显示该字符串
- cat: 表头列合并，如：['省市', 2]，表示从该列开始的两列设置表头合并分组。

### 表头设置示例：电量明细

```js
  const _head = [
    {
      // checkbox: 'index', // 对应数据数组索引值或数据列（如：[0]），方便处理勾选数据
      // id: [0], // 对应数据列，行记录数据唯一值，避免重复添加，没有不设置！
      hide: [0], // 隐藏数据列，数据列多于表头定义，多余的列需隐藏，对于表来说相当于不存在
      link: [1], // 对应表头定义列
      // page: 10, // 需分组，不设置分页
      pageLink: 10,
      // sort: [1],
      fix: ['table', 'left1', 'left2'], // 动态固定表高度到满屏，可上下滚动，固定行列，滚动时一直显示
      // height: 200, // 固定高度
      // width: 300, // 固定宽度
      sum: true, // 显示底部汇总行，空、null，显示为 -，不参与统计
      // groupCol: 1, // 分组名称合并列数，名称越长，需要的列数越多，合并的列不显示，因此汇总列需后置
      // group: [3, 4], // 分组列，对应定义列
      layout: 'fixed', // 不设置则为 auto，fixed 设置宽度
      fontSize: 16, // 用于fixed计算列宽，fixed 时需要，<colgroup> 控制列宽
      padding: 16, // 左右各8px，用于fixed计算列宽
      icon: 16, // 排序图标宽度，单位px，用于fixed计算列宽
    },
    {name: '名称', minWidth: 10, maxWidth: 14, sort: true, link: 'page/detail?no=${r[0]}'},
    {name: '类型', minWidth: 4, sort: true, sum: 'value'},
    {name: '项目经理', sort: true, group: true, sum: 'value'},
    {name: '省', sort: true, sum: 'value'}, // 标头分类：cat: ['省市', 2]
    {name: '市', width: 4, sort: true, group: true, sum: 'value'},
    {name: '年', width: 4, sort: true},
    {name: '月', sort: true},
    {name: '逆变器', type: 'number', width: 6, sort: true, sum: true},
    {name: '上网', type: 'number', width: 6, sort: true, sum: true},
    {name: '自用', type: 'number', width: 6, sort: true, sum: true},
    {name: '结算', type: 'number', width: 6, sort: true, sum: true},
    {name: '损耗', type: 'number', width: 6, sort: true, sum: true},
    {name: '自用率', type: 'number', width: 6, sort: true, sum: 'avg'},
    {name: '完成率', type: 'number', width: 6, sort: true, sum: 'avg'},
    {name: 'PR', type: 'number', width: 6, sort: true, sum: true},
    {name: '计划小时', type: 'number', width: 6, sort: true, sum: true},
    {name: '逆变器小时', type: 'number', width: 6, sort: true, sum: true},
    {name: '结算小时', type: 'number', width: 6, sort: true, sum: true},
  ],

```

### 事件

- link：点击链接列触发，参数为链接显示的数据值。
- select：选择行后触发，参数为选择行 Dom 对象，仅当前分页，全选时，触发一次。
  可通过行 data-id 获取行数据。
- check：点击 checkbox 时触发，参数为已选择 Set 集，包含所有分页，全选时，每行均触发。
  可通过 checkbox 的 data-val 获取数据。  


### 示例

```js
const _head = [
  {checkbox: [0], id: [0], hide: [0], link: [1], page: 3, pageLink: 10, sort: [4]},
  {name: '贷款编号'},
  {name: '贷款金额', type: 'number', sort: true},
  {name: '订单数量', type: 'number' },
  {name: '贷款时间', type: 'datetime', sort: true},
  {name: '还款时间', type: 'datetime', sort: true},
  {name: '贷款状态'},
  {name: '核对状态'},
];

// 测试数据，第一列不显示，用于id和checkbox
const _data = [
  [1, '1234566', 3115.0, 4, '2021/6/12 16:30:25', '2021/7/12 13:28:25', '已提款', '已核对'],
  [2, '1234567', 2005.0, 4, '2021/6/5 16:30:25', '2021/7/5 13:28:25', '已提款', '已核对'],
  [3, '1234568', 4115.0, 3, '2021/6/1 16:30:25', '2021/7/1 13:28:25', '已提款', '已核对'],
  [4, '1234569', 2115.0, 4, '2021/6/2 16:30:25', '2021/7/2 13:28:25', '已提款', '已核对'],
  [5, '1234570', 8453.0, 6, '2021/5/12 16:30:25', '2021/6/12 13:28:25', '已提款', '已核对'],
  [6, '1234572', 2000.0, 2, '2021/5/5 16:30:25', '2021/9/5 13:28:25', '已提款', '已核对'],
  [7, '1234573', 4001.0, 3, '2021/4/1 16:30:25', '2021/5/1 13:28:25', '已提款', '已核对'],
  [8, '1234571', 1988.0, 4, '2021/7/2 16:30:25', '2021/8/2 13:28:25', '已提款', '已核对'],
];
```

### js

```js
// 引入组件
import DataTable from '@wiajs/ui/dataTable'

export default class Demo extends Page {
  // 在已就绪的视图上加载数据表绑定事件
  ready(pg, param, bk) {
    this::init();
  }
}

function init() {
  // 创建组件实例
  const tb = new DataTable(this, {
    el: _.name('tbContent'), // 容器
    name: 'tbLoan'
		head: _head,
    data: _data, // 可选
  });
}


/**
 * 表格数据加载
 * @param {*[]} data
 */
function showTb(data) {
  // 不分组，全新加载数据
  _tb.setView(data)
  // 注意：index必须为数组
  // 不分组，添加数据
  // _tb.addView(data)
  // 一级分组，按第四列分组
  // _tb.setGroup(data, [4])
  // 两级分组，第四、五列分组
  // _tb.setGroup(data, [4, 5])
  // 三级分组
  // _tb.setGroup(data, [4, 5, 3])
}

```

### html

```html
<div class="card card-outline">
  <div class="data-table data-table-init">
    <div class="card-header">
      <div class="data-table-header">
        <div name="tbInfo" class="data-table-title">搜索结果</div>
      </div>
      <!-- Selected table header -->
      <div class="data-table-header-selected">
        <!-- Selected table title -->
        <div class="data-table-title-selected">
          <span class="data-table-selected-count"></span> items selected
        </div>
        <!-- Selected table actions -->
        <div class="data-table-actions">
          <button name="btnRepay" class="button button-fill button-small">还款</button>
          <button class="button button-fill bg-color-green button-small">核对确认</button>
        </div>
      </div>
    </div>
    <!-- 数据表容器 -->
    <div name="tbcontent" class="card-content"></div>
  </div>
</div>
```

### css

如果组件针对 pc、安卓、苹果手机不同的样式，则需引入系统设置变量，根据设置生产响应 css

```less
// 引入系统设置变量
@import '../../config/f7.vars.less';
// 引入 dataTable 样式，内置变量，需放在全局范围，需加 dist
@import '@wiajs/ui/dist/dataTable/index.less';
#wiapage-id {
}
```

## 组件工作原理

### 组件做了什么

1. 根据 head 数据，自动生成数据表头

```html
  <tr>
    <th class="checkbox-cell">
      <label class="checkbox"><input type="checkbox" /><i class="icon-checkbox"></i></label>
    </th>
    <th class="label-cell">贷款编号</th>
    <th class="numeric-cell sortable-cell">贷款金额</th>
    <th class="numeric-cell">订单数量</th>
    <th class="label-cell sortable-cell">贷款时间</th>
    <th class="label-cell sortable-cell">还款时间</th>
    <th class="label-cell">贷款状态</th>
    <th class="label-cell">核对状态</th>
  </tr>
</thead>
```

#### 根据 head 数据，生成的表体模板

```html
<tbody name="tbBody">
  <tr name="tbLoan-tp" style="display: none;">
    <td class="checkbox-cell">
      <label class="checkbox"><input type="checkbox" /><i class="icon-checkbox"></i></label>
    </td>
    <td class="label-cell"><a href="javascript:;">${r[1]}</a></td>
    <td class="numeric-cell">${r[2]}</td>
    <td class="numeric-cell">${r[3]}</td>
    <td class="label-cell">${r[4]}</td>
    <td class="label-cell">${r[5]}</td>
    <td class="label-cell">${r[6]}</td>
    <td class="label-cell">${r[7]}</td>
  </tr>
</tbody>
```

数组是特殊的对象，带有 0、1、2 等数字属性，可按对象处理，`r[1]` 就是数字属性 1 的值。

### 生成数据表

```js
// 数据与模板结合，生成数据视图
tb::setView(data);
```

### 状态/事件监听

无

```javascript
// 链式调用更优雅
tb.on('xxx', files => {});
```
