/**
 * 按列数，使用input输入框，展示数据，一般不用于数据修改。
 * PC端屏幕宽，需要多列展示。
 * 页面：<div name="detail" class="detail inline-labels"></div>
 * 代码：
 * const dv = new DataView(this, {
 *   el: _.name('detail'),
 *   col: 4,
 *   data: _data,
 * });
 * 按4列生成数据详情展示。
 * 数据示例：
 * const _data = {
 *  融资编号: '202106010001',
 *  融资单位: 'XXX',
 *  差旅单位: 'XXXXXX',
 *  融资金额: 3115.0,
 *  融资时间: '2021/6/12 16:30:25',
 *  融资起始: '2021/6/12',
 *  融资终止: '2022/6/12',
 *  融资状态: '已提款',
 *  还款时间: '2021/7/12 13:28:25',
 *  还款金额: 3000.0,
 *  还款状态: '部分还款',
 * };
 */

/** @jsx jsx */
import {Event, jsx} from '@wiajs/core';

const def = {
  col: 4,
};

export default class DataView extends Event {
  /**
   *
   * @param {*} page 页面实例
   * @param {*} opt 选项，激活名称
   */
  constructor(page, opt) {
    super(opt, [page]);
    this.page = page;
    this.opt = {...def, ...opt};
    this.render(this.opt.col, opt.data);
  }

  /**
   * 按列数生成 input html
   * @param {*} cnt 列数
   * @returns
   */
  col(cnt) {
    const R = [];
    for (let i = 0; i < cnt; i++) {
      R.push(
        <div class="col item-content item-input">
          <div class="item-inner">
            <div class="item-title item-label">{`$\{r.k${i + 1}}：`}</div>
            <div class="item-input-wrap">
              <input type="text" value={`$\{r.v${i + 1}}`} />
            </div>
          </div>
        </div>
      );
    }
    return R;
  }

  /**
   *
   * @param {*} col 列数
   * @param {*} data 数据
   * @returns
   */
  render(col, data) {
    try {
      if (!col || !data) {
        console.log('param is null.');
        return;
      }
      const {el} = this.opt;
      el.addClass('dataView');

      // jsx 通过函数调用，实现html生成。
      const v = $(
        <div name="dataView-tp" tp={`kv-${col}`} class="row">
          {this.col(col)}
        </div>
      );
      // 加入到容器
      el.child(v);
      // 数据与模板结合，生成数据视图
      el.setView(data, 'dataView');
      el.find('input[value=""]').upper('.item-input-wrap').hide();
    } catch (ex) {
      console.log('render', {ex: ex.message});
    }
  }
}
