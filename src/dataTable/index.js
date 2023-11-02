/**
 * 数据表组件
 */

/**
const _head = [
  {checkbox: true, id: [0], hide: [0], link: [1], page: 3, sort: '贷款时间'},
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
 */

/** @jsx jsx */
import {compareObj} from '@wiajs/core/util/tool';
import {Event, jsx} from '@wiajs/core';

const def = {
  name: 'tbData',
};

export default class DataTable extends Event {
  head = []; // 表头
  data = []; // 数据
  el = null; // 容器
  tb = null; // 表格

  /**
   * 表构造
   * @param {*} page 页面实例
   * @param {*} opt 选项，激活名称
   */
  constructor(page, opt) {
    super(opt, [page]);
    this.page = page;
    this.opt = {...def, ...opt};

    // 表数据
    if (this.opt.data && this.opt.data.length > 0) {
      if (this.opt.head[0].page || this.opt.head[0].sort) {
        // 克隆数组数据，用于排序、分页，不改变原数据
        this.data = [...this.opt.data];
        if (this.opt.head[0].page && !this.opt.head[0].pageLink) this.opt.head[0].pageLink = 10;
      } else this.data = opt.data;
    }

    this.head = this.opt.head;
    this.el = this.opt.el;

    // 生成表html
    this.render();
  }

  /**
   * 按数据生成tbHead
   * @param {*} head 表头数据
   * @returns
   */
  th(head) {
    const R = [];
    if (head[0].checkbox)
      R.push(
        <th class="checkbox-cell">
          <label class="checkbox">
            <input type="checkbox" />
            <i class="icon-checkbox" />
          </label>
        </th>
      );

    for (let i = 1; i < head.length; i++) {
      const d = head[i];
      const cls = [d.type === 'number' ? 'numeric-cell' : 'label-cell'];
      if (d.sort) cls.push('sortable-cell');
      R.push(<th class={cls.join(' ')}>{d.name}</th>);
    }
    return R;
  }

  /**
   * 按数据生成tr td
   * 支持link、hide参数
   * @param {*} head 表头数据
   * @returns
   */
  td(head) {
    const R = [];
    const {hide, link} = head[0];

    let col = -1; // 隐藏字段需跳过
    for (let i = 1, len = head.length; i < len; i++) {
      col++; // 从 0 开始
      // 跳过隐藏列，隐藏列不显示
      if (hide?.includes(col)) col++;

      const d = head[i];
      // TODO 跳转链接，需触发页面事件，方便页面类执行跳转
      if (link?.includes(i))
        R.push(
          <td class="label-cell" data-val={`$\{r[${col}]}`}>
            <a href="">{`$\{r[${col}]}`}</a>
          </td>
        );
      else {
        const cls = d.type === 'number' ? 'numeric-cell' : 'label-cell';
        R.push(<td class={cls}>{`$\{r[${col}]}`}</td>);
      }
    }
    return R;
  }

  /**
   * 生成table表，包括 thead、tbody、分页
   * @returns
   */
  render() {
    try {
      const {head, data} = this;

      if (!head) {
        console.log('param is null.');
        return;
      }

      const {el, name} = this.opt;

      let v = <table name={name}></table>;
      // 加入到容器
      el.append(v);
      const tb = el.name(name);
      // 保存tb
      this.tb = tb;

      // <table name="tbLoan">
      // jsx 通过函数调用，实现html生成。
      v = (
        <thead name="tbHead">
          <tr>{this.th(head)}</tr>
        </thead>
      );
      // 加入到表格
      tb.append(v);

      // 表主体
      v = (
        <tbody name="tbBody">
          <tr name={`${name}-tp`} style={{display: 'none'}}>
            {head[0].checkbox && (
              <td class="checkbox-cell">
                <label class="checkbox">
                  <input type="checkbox" />
                  <i class="icon-checkbox" />
                </label>
              </td>
            )}
            {this.td(head)}
          </tr>
        </tbody>
      );

      // 加入到表格
      tb.append(v);

      if (head[0].page) {
        v = (
          <div class="data-table-footer">
            <div class="dataTables_paginate paging_simple_numbers" />
          </div>
        );
        // 加入到容器，而非表格
        el.append(v);
      }

      // 绑定事件，如点击head排序
      this.bind();
      // 数据显示
      this.setView();
    } catch (ex) {
      console.log('render', {ex: ex.message});
    }
  }

  /**
   * 数据与模板结合，生成数据视图
   * @param {*} data 外部传入数据，重置表数据
   */
  setView(data) {
    try {
    const {head} = this;
      const {page: hpage, sort: hsort} = head[0];
      let {id: hid} = head[0];
      if (hid && hid < 0) hid = undefined;

    if (data) {
        if (hpage || hsort) {
        // 克隆数组数据，用于排序、分页，不改变原数据
        this.data = [...data];
      } else this.data = data || [];
    }

    // 缺省排序
      if (hsort) {
        const c = getCol(head, hsort);
      if (c) {
        sort(this.data, c.col, c.type);
      }
    }

    // 数据与模板结合，生成数据视图
      if (this.pageBar()) this.paging();
      else this.tb.setView(data, hid); 
    } catch (ex) {
      console.error('setView exp:', ex.message);
    }
  }

  /**
   * 生成分页ul列表
   * @param {*} start 当前分页条起始页码，默认为1
   * @returns 是否分页
   */
  pageBar(start = 1) {
    let R = false;

    const {head, data} = this;
    const {el} = this.opt;

    if (!head) {
      console.log('param is null.');
      return;
    }

    // 分页
    const prow = head[0].page;
    const plink = head[0].pageLink;
    const paging = prow && prow > 0 && data.length > prow;
    if (paging) {
      const len = Math.ceil(data.length / prow);
      let cnt = len - (start - 1);
      if (cnt > plink) cnt = plink;

      const v = (
        <ul class="pagination">
          <li class={`paginate_button page-item previous ${start <= 1 && 'disabled'}`}>
            <a href="" data-page={`<${start}`} tabindex="0" class="page-link">
              往前
            </a>
          </li>
          {this.pageLink(start, cnt)}
          <li class={`paginate_button page-item next ${len <= plink + start - 1 && 'disabled'}`}>
            <a href="" data-page={`>${plink + start - 1}`} tabindex="0" class="page-link">
              往后
            </a>
          </li>
        </ul>
      );
      // 加入到容器
      el.class('dataTables_paginate').empty().append(v);
      R = paging;
    } else el.class('dataTables_paginate').empty();

    return R;
  }

  /**
   * 创建分页数字标签
   * @param {*} cnt 页数
   * @returns 分页html节点数组
   */
  pageLink(start, cnt) {
    const R = [];
    for (let i = start; i < start + cnt; i++) {
      R.push(
        <li class={`paginate_button page-item ${i === start && 'active'}`}>
          <a href="" data-page={i} tabindex="0" class="page-link">
            {i}
          </a>
        </li>
      );
    }

    return R;
  }

  /**
   * 分页跳转
   * @param {*} i 分页序数，从1开始，默认第一页
   */
  paging(i = 1) {
    const {data, tb, el, head} = this;
    let {id: hid} = head[0];
    if (hid && hid < 0) hid = undefined;

    el.class('.page-item.active').removeClass('active');
    el.findNode(`a[data-page="${i}"]`).parent().addClass('active');
    const plen = head[0].page;
    const start = (i - 1) * plen;
    tb.setView(data.slice(start, start + plen), hid);
  }

  bind() {
    const {tb, el, head} = this;
    let {id: hid} = head[0];
    if (hid && hid < 0) hid = undefined;

    // 表格排序
    el.name('tbHead').click(ev => {
      const th = $(ev.target).upper('.sortable-cell');
      if (th.length > 0) {
        const c = getCol(head, th.html());
        if (c) {
          sort(this.data, c.col, c.type, th.hasClass('sortable-desc'));
          if (this.pageBar()) this.paging(1);
          else this.tb.setView(this.data, hid);
        }
      }
    });

    // 分页 pagination
    el.class('dataTables_paginate').click(ev => {
      const lk = $(ev.target).upper('.page-link');
      const prow = head[0].page;
      const plink = head[0].pageLink;
      if (lk.length > 0 && prow > 0) {
        let i = lk.data('page');
        if (Number.isInteger(i)) this.paging(i);
        else if (i.startsWith('>')) {
          i = Number.parseInt(i.substr(1), 10);
          this.pageBar(i + 1);
        } else if (i.startsWith('<')) {
          i = Number.parseInt(i.substr(1), 10);
          this.pageBar(i - plink);
        }
      }
    });
  }
}

/**
 * 获得列序号
 * @param {*} head 表头数据
 * @param {*} name 名称
 * @returns 表数据序号
 */
function getCol(head, name) {
  let R = null;

  const {hide} = head[0];
  let col = -1; // 隐藏字段需跳过
  for (let i = 1, len = head.length; i < len; i++) {
    col++; // 从 0 开始
    // 跳过隐藏列，隐藏列不显示
    if (hide?.includes(i)) col++;

    if (head[i].name === name) {
      R = {col, type: head[i].type};
      break;
    }
  }

  return R;
}

function sort(data, k, type, desc) {
  return data.sort(compareObj(k, desc, type));
}
