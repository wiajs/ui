# DataTable

## 需求描述

创建组件实例，传入表头和数据，自动生成数据展示页面，同时支持排序、分页等功能。

## 使用

### 参数说明

通过表头数据传入选项参数。

- checkbox: true/false，是否带 checkbox 勾选框。
- id: Number，数据列中第几列为列 id，一般用于选择后按 id 操作行数据。
  数组格式，第几列为 id 字段，从 0 开始，作为唯一标记，作为模板标识。
- hide: Array，隐藏数据列，数组格式，不显示的列，从 0 开始。
  超出 head 中显示的列，可不列入，自动不显示。
- link: Array，显示列中，第几列为可点击跳转的链接
  数组格式，从 1 开始，点击触发 onlink 事件，参数中带被点击的数据。
- sort: 字符串，空，不填，表示不排序，名称表示缺省按哪列名称排序。
- page: 不填，或填 0，不分页，填数字，比如 10，表示分页，每页 10 行数据。默认不分页。
- pageLink: 分页条页码数，比如 10，表示分页页码 10 页。

### 测试数据

```js
const _head = [
  {checkbox: true, id: 0, hide: [0], link: [1], page: 3, pageLink: 10, sort: '贷款时间'},
  {name: '贷款编号', type: 'string', sort: false},
  {name: '贷款金额', type: 'number', sort: true},
  {name: '订单数量', type: 'number', sort: false},
  {name: '贷款时间', type: 'datetime', sort: true},
  {name: '还款时间', type: 'datetime', sort: true},
  {name: '贷款状态', type: 'string', sort: false},
  {name: '核对状态', type: 'string', sort: false},
];

// 测试数据
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
import DataTable from '../../component/dataTable';

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
    data: _data,
  });
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

```less
#wiapage-id {
  // 引入 dataTable 样式
  @import '../../component/dataTable/index.less';
```

如果组件针对 pc、安卓、苹果手机不同的样式，则需引入系统设置变量，根据设置生产响应 css

```less
// 引入系统设置变量
@import '../config/f7.vars.less';
#wiapage-id {
  // 引入 swipe 样式
  @import '../../component/dataTable/index.less';
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
