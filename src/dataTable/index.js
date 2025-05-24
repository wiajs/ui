/** @jsxImportSource @wiajs/core */
/**
 * 数据表组件
 */
import {compareObj} from '@wiajs/core/util/tool'
import {Utils, Event} from '@wiajs/core'
import Table from '../table'
// import * as view from './view'
import {log as Log} from '@wiajs/util'

const log = Log({m: 'dataTable'}) // 创建日志实例

// 缺省值
const def = {
  selector: '.data-table',
  name: 'tbData', // 表名称
  domProp: 'wiaDataTable',
}

const _cfg = {
  page: 10,
  pageLink: 10,
  /** @type {string[]} */
  fix: [], //  ['head', 'foot', 'left3', 'right'], // 固定行列
  sum: false, // 显示底部汇总行
  layout: 'auto', // 默认 auto，不设置 宽度，fixed 设置宽度，
  fontSize: 16, // 用于计算列宽，fixed 时需要，<colgroup> 控制列宽
  padding: 16, // 左右各8px，用于fixed计算列宽
  icon: 16, // 排序图标，用于fixed计算列宽
  // 列最小宽度为 name 字符宽度 x 16 + 16, 可设置width、min-width 或 max-width，单位：字符 16px，数字8px
  // min-width, 如有剩余空间，分配给该字段，max-width 限制最长
}

/**
 * f7 DataTable 扩展，根据数据源动态创建表格
 */
export default class DataTable extends Event {
  _sel = new Set() // 选择
  /** @type {*} */
  _tb = null // f7Table 实例
  /** @type {*} */
  head = [] // 表头
  /** @type {*} */
  data = [] // 数据
  /** @type {*} */
  el = null // 整体容器，包括header
  /** @type {*} */
  tb = null // html 表格
  _lastW = 0 // resize
  _lastH = 0 // resize

  /**
   * 表构造
   * @param {*} page 页面实例
   * @param {*} opts 选项，激活名称
   */
  constructor(page, opts) {
    const opt = {...def, ...opts}
    super(opt, [page])
    const cfg = {..._cfg, ...(opt.head[0] || {})}
    const _ = this
    _.page = page
    _.view = page.view
    _.opt = opt
    _.cfg = cfg
    _.head = opt.head
    _.lastW = window.innerWidth
    _.lastH = window.innerHeight

    // 容器
    const $el = opt.el || page.view.findNode(opt.selector)
    if ($el.length === 0) return undefined

    _.el = $el

    // 已创建，直接返回
    if (_.el.dom[opt.domProp]) {
      const instance = _.el.dom[opt.domProp]
      _.destroy()
      return instance
    }

    _.el.dom[opt.domProp] = this

    // 表数据
    if (opt.data && opt.data.length > 0) {
      if (cfg.page || cfg.sort) {
        // 克隆数组数据，用于排序、分页，不改变原数据
        _.data = [...opt.data]
        if (cfg.page && !cfg.pageLink) cfg.pageLink = 10
      } else _.data = opt.data
    }

    const {checkbox: ck} = cfg
    // 空数组作为 index
    if (Array.isArray(ck) && ck.length === 0) cfg.checkbox = 'index'

    // index 需对数组添加index属性
    if (_.data && cfg.checkbox === 'index') _.data.forEach((v, x) => (v.index = x))

    _.checkEvent = _.oncheck.bind(_)

    // 生成表html
    _.render()
  }

  get sel() {
    return this._sel
  }

  /**
   * 清除选择（包括跨页），切换表头区及表头checkbox状态
   */
  clearSel() {
    if (this._sel?.size) this._sel.clear()
    // 切换表头为非选择模式
    this.el.removeClass('data-table-has-checked')

    // 更新header的checkbox
    const col = 0
    const ckb = this.el.findNode(`thead .checkbox-cell:nth-child(${col + 1}) input[type="checkbox"]`)
    ckb.prop('indeterminate', false) // 部分选中
  }

  /**
   * 选择表所有行，包括跨页
   * 表头checkbox只能选择当前页面所有行
   */
  selAll() {
    this.clearSel()
    this.data.forEach((v, x) => this._sel.add(x))
    // 每行checkbox
    this.reCheck()
    // 表头选择区
    this._tb.headerSel()
    // 发射行选择check事件，触发一次，逐行触发效率低
    this.emit('local::check', this._sel)
  }

  /**
   * 选择表所有行，包括跨页
   * 表头checkbox只能选择当前页面所有行
   */
  cancelSel() {
    this.clearSel()
    // 每行checkbox
    this.reCheck()
    // 表头选择区
    this._tb.headerSel()
    // 发射行选择check事件，触发一次，逐行触发效率低
    this.emit('local::check', this._sel)
  }

  /**
   * 按数据生成tbHead
        // <tr>
        //   <th colspan="2" rowspan="1">合并的前两列</th>
        //   <th rowspan="2">第三列</th>
        //   <th rowspan="2">第四列</th>
        //   <th rowspan="2">第五列</th>
        // </tr>
        // <tr>
        //   <th>第一列</th>
        //   <th>第二列</th>
        // </tr>
   * @param {*} head 表头数据
   * @returns
   */
  th(head) {
    let R
    try {
      // 表头分组
      const cat = head.some(v => v.cat)
      if (cat) {
        const hs1 = [] // 第一行
        const hs2 = []

        if (head[0].checkbox)
          // 第二行

          hs1.push(
            <th rowspan="2" class="checkbox-cell">
              <label class="checkbox">
                <input type="checkbox" />
                <i class="icon-checkbox" />
              </label>
            </th>
          )

        let lastCat = ['', 0]
        for (let i = 1; i < head.length; i++) {
          const d = head[i]
          const cls = [d.type === 'number' ? 'numeric-cell' : 'label-cell']
          if (d.sort) cls.push('sortable-cell')
          if (d.cat || lastCat[1]) {
            if (d.cat) {
              lastCat = d.cat
              hs1.push(
                <th colspan={d.cat[1]} rowspan="1">
                  {d.cat[0]}
                </th>
              )
            }
            hs2.push(<th class={cls.join(' ')}>{d.name}</th>)

            // @ts-ignore
            lastCat[1]--
          } else {
            hs1.push(
              <th rowspan="2" class={cls.join(' ')}>
                {d.name}
              </th>
            )
          }
        }
        R = (
          <thead name="tbHead">
            <tr>{hs1}</tr>
            <tr>{hs2}</tr>
          </thead>
        )
      } else {
        const hs = []
        if (head[0].checkbox)
          hs.push(
            <th class="checkbox-cell">
              <label class="checkbox">
                <input type="checkbox" />
                <i class="icon-checkbox" />
              </label>
            </th>
          )

        for (let i = 1; i < head.length; i++) {
          const d = head[i]
          const cls = [d.type === 'number' ? 'numeric-cell' : 'label-cell']
          if (d.sort) cls.push('sortable-cell')
          hs.push(<th class={cls.join(' ')}>{d.name}</th>)
        }

        R = (
          <thead name="tbHead">
            <tr>{hs}</tr>
          </thead>
        )
      }
    } catch (e) {
      log.err(e, 'th')
    }

    return R
  }

  /**
   * 按标头配置生成tr td数据模板
   * 支持link、hide参数
   * @param {*} head 表头数据
   * @returns
   */
  td(head) {
    const R = []
    const {hide, link} = head[0]

    let col = -1 // 隐藏字段需跳过
    for (let i = 1, len = head.length; i < len; i++) {
      col++ // 从 0 开始
      // 跳过隐藏列，隐藏列不显示
      while (hide?.includes(col)) col++

      const h = head[i]
      // TODO 跳转链接，需触发页面事件，方便页面类执行跳转
      if (h.value)
        R.push(
          <td class="label-cell" data-link={i}>
            {h.value}
          </td>
        )
      else if (link?.includes(i)) {
        h.idx = col // 对应数据列
        R.push(
          <td class="label-cell" data-link={i}>
            <a>{`$\{r[${col}]}`}</a>
          </td>
        )
      } else {
        h.idx = col // 对应数据列
        const cls = h.type === 'number' ? 'numeric-cell' : 'label-cell'
        if (h.type === 'number')
          R.push(
            <td class={cls}>{`$\{r[${col}] === '' || r[${col}] === null || r[${col}] === 'null' ? '-' : r[${col}].toLocaleString('en-US')}`}</td>
          )
        else R.push(<td class={cls}>{`$\{r[${col}] === 'null' ? '' : r[${col}]}`}</td>)
      }
    }
    return R
  }

  /**
   * 按数据生成tr col 控制列宽
   * 支持hide参数
   * @param {*} head 表头数据
   * @returns
   */
  col(head) {
    const R = []
    const cfg = {..._cfg, ...(head[0] || {})}
    const {hide, fontSize, padding, icon} = cfg

    let col = -1 // 隐藏字段需跳过
    for (let i = cfg.checkbox ? 0 : 1, len = head.length; i < len; i++) {
      col++ // 数据索引从 0 开始
      // 跳过隐藏列，隐藏列不显示
      while (hide?.includes(col)) col++

      const d = head[i]
      /** @type {string[]} */
      const style = []
      let {name, type, width, minWidth, maxWidth, sort} = d

      const add = sort ? icon + padding : padding
      // width 与 minWidth 二选一
      if (width) width = width * fontSize + add
      else if (minWidth) minWidth = minWidth * fontSize + add
      else if (!width) {
        // checkbox
        if (i === 0) width = 40
        // else if (type === 'date') width = (fontSize / 2) * 10 + add
        else width = fontSize * name.length + add
      }

      if (maxWidth) maxWidth = maxWidth * fontSize + add

      if (width) style.push(`width: ${width}px`)
      else if (minWidth) style.push(`min-width: ${minWidth}px`)

      if (maxWidth) style.push(`max-width: ${maxWidth}px`)

      R.push(<col style={style.join(';')} />)
    }
    return R
  }

  /**
   * 按数据生成tfoot的汇总行
   * 支持hide参数
   * @param {*[]} [r] - 汇总数组，接口返回传入，不传则前端计算
   * @returns
   */
  setSum(r) {
    const _ = this
    try {
      const {tb, cfg, head, data} = _
      if (!cfg.sum) return

      if (!head) {
        console.log('param is null.')
        return
      }

      const count = data.length
      const cls = 'numeric-cell'

      // 汇总计算
      if (!r?.length) r = _.getSum(data)

      const rs = []

      if (cfg.checkbox || cfg.group) rs.push(<td colspan="2" class="label-cell">{`合计：${count}条`}</td>)
      else rs.push(<td class="label-cell">{`合计：${count}条`}</td>)

      for (let i = 2, len = head.length; i < len; i++) {
        const h = head[i]
        const {type, sum, idx} = h
        if (sum) {
          if (sum === 'value') rs.push(<td />)
          else if (sum === true || sum === 'avg') rs.push(<td class={cls}>{r[idx]}</td>)
          else if (sum.includes('${count}')) {
            const val = sum.replace('${count}', count)
            rs.push(<td class="label-cell">{val}</td>)
          } else if (sum === 'count') rs.push(<td class={cls}>{count}</td>)
          else if (typeof sum === 'string') rs.push(<td class="label-cell">{sum}</td>)
        } else rs.push(<td />)
      }

      const foot = tb.find('tfoot')
      if (rs.length) foot.html(<tr>{rs}</tr>)
      else foot.empty()
    } catch (e) {}
  }

  /**
   * 对带sum属性的字段汇总或平均
   * 空值跳过，不参与汇总或平均
   * @param {*[]} data - 二维数组
   */
  getSum(data) {
    const _ = this

    if (!data?.length) return

    const R = Array(data[0].length).fill(0)
    const cnt = Array(data[0].length).fill(0)
    try {
      const {head} = _
      // 遍历数据行，汇总数据
      for (const d of data) {
        for (const h of head) {
          try {
            const {idx} = h // 表头对应的数据列
            // 空字符不参与统计
            if (idx >= 0 && (h.sum === true || h.sum === 'avg') && d[idx] !== '' && d[idx] !== null && d[idx] !== 'null') {
              cnt[idx]++
              R[idx] += Number(d[idx])
            } else if (idx >= 0 && h.sum === 'value' && !R[idx]) R[idx] = d[idx]
          } catch (e) {
            log.err(e, 'getSum:sum')
          }
        }
      }

      for (const h of head) {
        const {idx} = h
        if (idx >= 0 && h.sum === true) R[idx] = formatNum(R[idx])
        else if (idx >= 0 && h.sum === 'avg' && cnt[idx]) R[idx] = formatNum(R[idx] / cnt[idx])
      }
    } catch (e) {}

    return R
  }

  /**
   * 添加分组行
   * @param {*} r - 分组值
   * @param {number} col - 分组列，对应 head 数组
   * @param {string} no - 编号
   * @param {*} opts - 选项，如 prop 属性
   * @returns
   */
  addGroup(r, col, no, opts) {
    const _ = this

    try {
      const {tb, cfg, head} = _
      const opt = {prop: [], ...opts}
      const {level, prop} = opt

      if (!head[col]) return

      const {name} = head[col]
      const {name: value, sum: d, count} = r

      const cls = 'numeric-cell'

      const {checkbox: ck} = cfg

      const rs = []
      // 展开、折叠图标
      // <i class="icon f7icon text-[16] font-[600] transition-transform duration-300">chevron_down</i>
      if (level === 1)
      rs.push(
          <td class="group-icon" data-group={value}>
          <a class="text-blue-400">
              <i class="icon f7icon text-[16] font-[600]">chevron_down</i>
          </a>
        </td>
      )
      else if (level === 2)
        rs.push(
          <td class="group-icon" data-group2={value}>
            <a class="text-blue-400 transition-transform duration-300">
              <i class="icon wiaicon text-[16] font-[300]" style="font-size:16px">
                &#xe680;
              </i>
            </a>
          </td>
        )
      // <i class="icon f7icon text-[16] font-[600] transition-transform duration-300">chevron_down</i>
      // {`${no}、${value.replace(/\d+-/, '')}：${count}条`}
      // {`${no}、${value.replace(/\d+-/, '')}：${count}条`}

      // 分组名称
      // const cls = 'label-cell'
      // const col = head.length - 1

      // if (cfg.checkbox) {
      //   rs.push(
      //     <td colspan={cfg.groupCol} class="label-cell">
      //       <label class="checkbox">
      //         <input type="checkbox" data-group={`${value}`} />
      //         <i class="icon-checkbox" />
      //       </label>
      //       {`合计：${count}条`}
      //     </td>
      //   )
      // } else {
      //   rs.push(
      //     <td colspan={cfg.groupCol} class="label-cell">
      //       {`合计：${count}条`}
      //     </td>
      //   )
      // }

      // const start = (cfg.checkbox ? 1 : 2) + cfg.groupCol
      const start = 1 //  + (cfg.groupCol ?? 0)
      for (let i = start, len = head.length; i < len; i++) {
        const h = head[i]
        const {type, sum, idx} = h

        // 分组列
        if (i === col) rs.push(<td class="label-cell group-cell">{`${value.replace(/\d+-/, '')}(${count})`}</td>)
        else if (sum) {
          if (sum === true || sum === 'avg') rs.push(<td class={cls}>{d[idx]}</td>)
          else if (sum.includes('${count}')) {
            const val = sum.replace('${count}', count)
            rs.push(<td class="label-cell">{val}</td>)
          } else if (sum === 'count') rs.push(<td class={cls}>{count}</td>)
          else if (sum === 'value') rs.push(<td class="label-cell">{d[idx]}</td>)
          else if (typeof sum === 'string') rs.push(<td class="label-cell">{sum}</td>)
        } else rs.push(<td />)
      }

      const p = $(
        <tr name={`${name}-data`} class="data-table-group">
          {rs}
        </tr>
      )

      // 设置属性
      if (prop?.length) {
        for (const v of prop) {
          const ps = v.split('=')
          if (ps.length > 1) p.attr(ps[0], ps[1])
        }
      }

      const tp = tb.find('[name$=-tp]')
      p.insertBefore(tp)
    } catch (e) {}
  }

  /**
   * 分组显示
   * @param {*} [data]
   * @param {number} [c1] - head 列数
   * @param {number} [c2] - head 列数
   * @param {number} [c3] - head 列数
   * @returns
   */
  setGroup(data, c1, c2, c3) {
    let R
    const _ = this

      if (!data?.length) return

    try {
      const {tb, head, cfg, opt} = _
      cfg.group = true
      // view.clearView.bind(tb)() // 清除view
      _.clear() // 清除view 和数据
      _.group = undefined

      // 增加一列，用于折叠图标
      if (!cfg.checkbox) {
        let el = tb.find('th.group-icon')
        if (!el.dom) {
          el = tb.findNode('th')
          el.before(<th class="group-icon"></th>)
          el = tb.findNode('colgroup')
          el.dom.insertAdjacentHTML('afterbegin', '<col style="width: 40px">')
          el = tb.findNode(`tr[name=${opt.name}-tp]`)
          el.dom.insertAdjacentHTML('afterbegin', '<td class="intend-cell"/>')
        }
      }

      // 表列对应的数据列
      let id1
      let id2
      let id3
      if (c1) id1 = head[c1].idx
      if (c2) id2 = head[c2].idx
      if (c3) id3 = head[c3].idx

      // tb.clearView()
      const rs1 = _.groupByCol(data, id1, id2, id3, true)

      if (rs1) {
        _.group = rs1
        let no1 = 0
        for (const k1 of Object.keys(rs1)) {
          const r1 = rs1[k1]

            // 一级分组
          if (Array.isArray(r1.data)) {
            no1++
            // 分组汇总行
            _.addGroup(r1, c1, `${no1}`, {level: 1, prop: [`data-group=${r1.name}`]})
            // 数据行
            _.addView(r1.data, {prop: [`group=${r1.name}`]})

            _.group = rs1
          } else {
            // 二级分组
            no1++
            _.addGroup(r1, c1, `${no1}`, {level: 1, prop: [`data-group=${r1.name}`]})
            const rs2 = r1.data
            // 二级分组编号
            let no2 = 0
            for (const k2 of Object.keys(rs2)) {
              const r2 = rs2[k2]
              if (Array.isArray(r2.data)) {
                no2++
                _.addGroup(r2, c2, `${no1}.${no2}`, {level: 2, prop: [`group=${r1.name}`, `data-group2=${r2.name}`]})
                _.addView(r2.data, {prop: [`group=${r1.name}`, `group2=${r2.name}`]})
              }
            }
          }
        }
      }

      if (cfg.sum) _.setSum()

      log({R}, 'setGroup')
    } catch (e) {
      log.err(e, 'setGroup')
    }
    return R
  }

  /**
   * 清除view 和数据
   */
  clear() {
    const _ = this
    try {
      const {tb, opt} = _
      const {name} = opt
      _.data = []
      const body = tb.find('tbody')
      const tp = body.find(`tr[name=${name}-tp]`)
      body.html('')
      body.append(tp)
      const foot = tb.find('tfoot')
      foot.html('')
    } catch (e) {
      log.err(e, 'clear')
    }
  }

  /**
   * 对二维数组进行三级分组
   * @param {number} id1 - 一级分组的列索引
   * @param {number} [id2] - 二级分组的列索引
   * @param {number} [id3] - 三级分组的列索引
   * @param {boolean} [sort]
   * @returns {*[]}
        分组后的对象数组，结构为：
   *   [{
   *     name: "一级分组名",
   *     count: 一级分组总行数,
   *     data: [{
   *       name: "二级分组名",
   *       count: 二级分组行数,
   *       data: [{
   *         name: "三级分组名",
   *         count: 三级分组行数,
   *         data: [...] // 三级分组的数据
   *       }]
   *     }]
   *   }]   */
  groupByCol(data, id1, id2, id3, sort = false) {
    let R
    const _ = this
    try {
      const {cfg} = _
      const rs1 = data.reduce((acc, r) => {
        const v = `${id1}-${r[id1]}` // 分组列名称
        const gp = acc[v] // 分组

        if (gp) {
          gp.data.push(r)
          gp.count++
        } else {
          acc[v] = {
            name: v,
            id: id1,
            data: [r],
            count: 1,
          }
        }

        return acc
      }, {})

      // 汇总计算
      if (cfg.sum) {
        for (const k of Object.keys(rs1)) {
          const r = rs1[k]
          r.sum = _.getSum(r.data)
        }
      }

      // 二级分组
      if (id2) {
        // 2. 二级分组（遍历一级分组，对每个一级分组的 data 进行二级分组）
        for (const k1 of Object.keys(rs1)) {
          const rs2 = rs1[k1].data.reduce((acc, r) => {
            const v = `${id2}-${r[id2]}` // 分组列名称
            const gp = acc[v]

            if (gp) {
              gp.data.push(r)
              gp.count++
            } else {
              acc[v] = {
                name: v,
                id: id2,
                data: [r],
                count: 1,
              }
            }
            return acc
          }, {})

          // 汇总计算
          if (cfg.sum) {
            for (const k of Object.keys(rs2)) {
              const r = rs2[k]
              r.sum = _.getSum(r.data)
            }
          }

          // 3. 三级分组（遍历二级分组，对每个二级分组的 data 进行三级分组）
          if (id3) {
            for (const k2 of Object.keys(rs2)) {
              const rs3 = rs2[k2].data.reduce((acc, r) => {
                const v = `${id3}-${r[id3]}` // 分组列名称
                const gp = acc[v]

                if (gp) {
                  gp.data.push(r)
                  gp.count++
                } else {
                  acc[v] = {
                    name: v,
                    id: id3,
                    data: [r],
                    count: 1,
                  }
                }

                return acc
              }, {})

              // 汇总计算
              if (cfg.sum) {
                for (const k of Object.keys(rs3)) {
                  const r = rs3[k]
                  r.sum = _.getSum(r.data)
                }
              }

              // 替换二级分组的 data 为三级分组
              rs2[k2].data = rs3
            }
          }

          // 替换一级分组的 data 为二级分组
          rs1[k1].data = rs2
        }
      }

      // 对分组进行排序
      // if (sort) rs1.sort((a, b) => (a.name > b.name ? 1 : -1))

      R = rs1

      // 对每个分组的数据进行排序
      // if (sortData) {
      //   rs.forEach(group => {
      //     group.data.sort((a, b) => (a[0] > b[0] ? 1 : -1)) // 按第一列排序
      //   })
      // }
    } catch (e) {
      log.err(e, 'groupByCol')
    }
    return R
  }

  /**
   * 生成table表，包括 thead、tbody、分页
   * @returns
   */
  render() {
    const _ = this
    const {opt} = _
    try {
      const {head, el} = _
      if (!head) {
        console.log('param is null.')
        return
      }

      const cfg = {..._cfg, ...(head[0] || {})}

      // checkbox
      let {checkbox: ck, layout, sum, fix} = cfg

      if (fix.includes('table')) el.append(<div class="data-table-content overflow-auto" />)
      else el.append(<div class="data-table-content" />)

      let ckv = ''
      // checkbox
      if (ck) {
        if (Array.isArray(ck) && ck.length) {
          ck = ck[0]
          ckv = `$\{r[${ck}]}`
        } else if (ck === 'index') ckv = '${r.index}'
      }

      const {name} = opt

      const clas = ['fix-h', 'fix-b'] // 固定表头 表尾
      if (fix.includes('right1')) clas.push('fix-r1')
      if (fix.includes('right2')) clas.push('fix-r2')
      if (fix.includes('left1')) clas.push('fix-l1')
      if (fix.includes('left2')) clas.push('fix-l2')
      if (fix.includes('left3')) clas.push('fix-l3')
      if (fix.includes('left4')) clas.push('fix-l4')
      if (fix.includes('left5')) clas.push('fix-l5')

      const style = [`table-layout: ${layout}`]
      const tb = $(<table name={name} class={clas.join(' ')} style={style.join(';')} />)
      // 保存tb
      _.tb = tb

      // 加入到容器
      const tbWrap = el.findNode('.data-table-content')
      tbWrap.append(tb)

      // 列宽
      if (layout === 'fixed') tb.append(<colgroup>{_.col(head)}</colgroup>)

      // <table name="tbLoan">
      // jsx 通过函数调用，实现html生成。
      let v = this.th(head)

      // 加入到表格
      tb.append(v)

      // 表主体
      v = (
        <tbody name="tbBody">
          <tr name={`${name}-tp`} style={{display: 'none'}}>
            {ck && (
              <td class="checkbox-cell">
                <label class="checkbox">
                  <input type="checkbox" data-val={ckv} />
                  <i class="icon-checkbox" />
                </label>
              </td>
            )}
            {_.td(head)}
          </tr>
        </tbody>
      )

      // 加入到表格
      tb.append(v)

      if (sum) {
        v = <tfoot name="tbFoot" />
        tb.append(v)
      }

      if (cfg.page && !fix.includes('table')) {
        v = (
          <div class="data-table-footer">
            <div class="dataTables_paginate paging_simple_numbers" />
          </div>
        )
        // 加入到容器，而非表格
        tbWrap.after(v)
      }

      _.header = el.findNode('.data-table-header')
      _.$headerSel = el.findNode('.data-table-header-selected')

      // F7表格生成
      _._tb = new Table(_.page, {el, name})

      // 绑定事件，如点击head排序
      _.bind(fix?.length)
      // 数据显示
      if (_.data?.length) _.setView(_.data)
    } catch (ex) {
      console.log('render', {ex: ex.message})
    }
  }

  /**
   * checkbox change事件
   * 注意，this为类实例，侦听对象作为参数sender传递，因为触发函数是bind后的函数！
   * 向外触发 check事件，参数为 sel 数组，方便侦听者处理跨页行选择，如统计等
   * @param {*} ev 事件
   * @param {*} sender 事件侦听对象
   * @returns
   */
  oncheck(ev, sender) {
    // const n = $(ev.target);
    if (!sender) return
    const n = $(sender)
    const m = this
    const {el} = this

    // 排除非数据
    // if (n.upper(`tr[name="${self.opt.name}-data"]`).length) {
    const val = n.data('val')
    if (val != null) {
      if (n.dom.checked) m._sel.add(val)
      else m._sel.delete(val)
      // console.log('oncheck', {sel: self._sel});
      m.emit('local::check', m._sel)
    }
    // }
  }

  /**
   * 绑定表格事件
   * @param {boolean} fix - 固定表、列
   */
  bind(fix) {
    const _ = this
    try {
      const {el, head, cfg} = _

      let {id: idx} = cfg
      idx = Array.isArray(idx) && idx?.length ? idx[0] : undefined

      // link 字段
      el.findNode('tbody').click('td[data-link]', (ev, sender) => {
        const n = $(sender)
        if (n.length) {
          const no = n.data('link')
          const val = n.findNode('a').html().trim()
          if (no && val) _.emit('local::link', no, val)
        }
      })

      // checkbox 变化
      el.findNode('tbody').on('change', '.checkbox-cell input[type="checkbox"]', this.checkEvent)

      // 选择行，按跨页选择重新处理表头选择区样式
      this._tb.on('select', rs => {
        // 选中行
        const len = _._sel.size
        // 改变表头操作面板
        if (_.header.length > 0 && _.$headerSel.length > 0) {
          if (len && !el.hasClass('data-table-has-checked')) el.addClass('data-table-has-checked')
          else if (!len && el.hasClass('data-table-has-checked')) el.removeClass('data-table-has-checked')

          // 选中数量，跨行选择数量与当前也选择数量不一致
          _.$headerSel.find('.data-table-selected-count').text(len)
        }

        this.emit('local::select', rs)
      })

      // 表格排序
      _._tb.on('sort', (cell, desc) => {
        if (cell.length > 0) {
          const c = getCol(head, cell.html())
          if (c) {
            _.clearSel()

            _.sort(_.data, c.col, c.type, desc)
            if (_.pageBar()) _.paging(1)
            else _.tb.setView(_.data, {idx})
          }
        }
      })

      // 分页 pagination
      el.class('dataTables_paginate').click(ev => {
        const lk = $(ev.target).upper('.page-link')
        const prow = head[0].page
        const plink = head[0].pageLink
        if (lk.length > 0 && prow > 0) {
          let i = lk.data('page')
          if (Number.isInteger(i)) this.paging(i)
          else if (i.startsWith('>')) {
            i = Number.parseInt(i.substr(1), 10)
            this.pageBar(i + 1)
            this.paging(i + 1)
          } else if (i.startsWith('<')) {
            i = Number.parseInt(i.substr(1), 10)
            this.pageBar(i - plink)
            this.paging(i - plink)
          }
        }
      })

      if (fix) {
        _.bindFix()
        // setTimeout(() => _.bindFix(), 1000)
      }

      el.click(ev => {
        // 分组 展开、折叠
        const td = $(ev).upper('td.group-icon')
        if (td.dom) {
          const group = td.data('group')
          if (group) {
            const es = el.find(`[group="${group}"]`)
            const icon = td.find('i.f7icon')
            if (td.data('tag') === 1) {
              td.data('tag', 0)
              // el.removeClass('rotate-90').addClass('rotate-0')
              if (icon.dom) icon.dom.textContent = 'chevron_down' // .removeClass('rotate-90').addClass('rotate-0')

              $.nextTick(() => es.show())
            } else {
              td.data('tag', 1)
              // el.removeClass('rotate-0').addClass('rotate-45')
              if (icon.dom) icon.dom.textContent = 'chevron_right' // .removeClass('rotate-90').addClass('rotate-0')

              $.nextTick(() => es.hide())
            }
          }
          const group2 = td.data('group2')
          if (group2) {
            const es = el.find(`[group2="${group2}"]`)
            const icon = td.find('i.wiaicon')
            if (td.data('tag') === 1) {
              td.data('tag', 0)
              if (icon) icon.removeClass('rotate-270')

              $.nextTick(() => es.show())
            } else {
              td.data('tag', 1)
              if (icon) icon.addClass('rotate-270')
              $.nextTick(() => es.hide())
            }
          }
        }
      })
    } catch (e) {
      log.err(e, 'bind')
    }
  }

  /**
   * 固定表格动态设置表格高度
   */
  bindFix() {
    const _ = this

    try {
      const {el} = _
      // 监听 DOM 变化
      const observer = new MutationObserver(() => _.resize())
      observer.observe(el.dom, {childList: true, subtree: true})

      // 监听窗口缩放
      window.addEventListener(
        'resize',
        debounce(() => {
          // 获取新值
          const newWidth = window.innerWidth
          const newHeight = window.innerHeight

          // 计算变化值
          const widthDiff = newWidth - _.lastW
          const heightDiff = newHeight - _.lastH

          // console.log(
          //   `窗口尺寸变化：\n宽度 ${lastWidth} → ${newWidth} (差值: ${widthDiff}px)\n高度 ${lastHeight} → ${newHeight} (差值: ${heightDiff}px)`
          // )

          // 更新旧值
          _.lastW = newWidth
          _.lastH = newHeight

          _.resize(heightDiff)
        }, 500)
      ) // 200ms内仅触发一次
    } catch (e) {
      log.err(e, 'prebind')
    }
  }

  unbind() {
    this.el.off('change', '.checkbox-cell input[type="checkbox"]', this.checkEvent)
  }

  /**
   * 判断是否有滚动条
   * data-table-content overflow-auto
   * @param {number} [ch] - change h
   * @returns
   */
  resize(ch) {
    let R = 0
    const _ = this
    const {view, el, tb, cfg} = _
    const {fix, height, width} = cfg
    const tbWrap = el.findNode('.data-table-content')
    if (width) tbWrap.css('max-width', `${width}px`)
    if (height) tbWrap.css('max-height', `${height}px`)
    else {
      const pg = view.find('.page-content').dom
      const sh = pg.scrollHeight - pg.clientHeight

      log({ch, sh}, 'resize')

      let h = 0

      if (sh > 0) h = tbWrap.height() - sh
      if (h <= 0 && ch > 0) h = tbWrap.height() + ch
      // 设置表格高度
      if (h > 0) tbWrap.css('max-height', `${h}px`)
      R = h
    }

    // 获取表格相对于视口的位置
    const tbLeft = tb.rect().left
    tb.dom.style.setProperty('--dt-col1-width', '0px')
    tb.dom.style.setProperty('--dt-col2-width', '0px')
    tb.dom.style.setProperty('--dt-col3-width', '0px')
    tb.dom.style.setProperty('--dt-col4-width', '0px')

    const th2 = tb.findNode('th:nth-of-type(2)')
    const th3 = tb.findNode('th:nth-of-type(3)')
    const th4 = tb.findNode('th:nth-of-type(4)')
    const th5 = tb.findNode('th:nth-of-type(5)')
    const w1 = th2.rect().left - tbLeft
    const w2 = th3.rect().left - tbLeft - w1
    const w3 = th4.rect().left - tbLeft - w2 - w1
    const w4 = th5.rect().left - tbLeft - w3 - w2 - w1

    if (fix.includes('left1')) tb.dom.style.setProperty('--dt-col1-width', `${w1}px`)
    if (fix.includes('left2')) tb.dom.style.setProperty('--dt-col2-width', `${w2}px`)
    if (fix.includes('left3')) tb.dom.style.setProperty('--dt-col3-width', `${w3}px`)
    if (fix.includes('left4')) tb.dom.style.setProperty('--dt-col4-width', `${w4}px`)

    return R
  }

  /**
   * @typedef {object} SetViewOpts - setView 可选参数
   * @prop {number} [idx=-1] - 数组id列序号，用于标记数据，可选，默认第一列，
   * @prop {string} [name=''] - 数据展现视图元素名称，缺省为调用者元素名称，可指定其他名称，无名称不工作
   * @prop {boolean} [form=false] - form 表单视图
   * @prop {boolean} [add=false] - 重置还是新增，重置会清除数据项，默认为重置
   * @prop {boolean} [signal=false] - 响应式自带刷新View
   * @prop {string[]} [prop=[]] - 模板属性
   */

  /**
   * 数据与模板结合，生成数据视图
   * @param {*} data 外部传入数据，重置表数据
   * @param {SetViewOpts} [opts] - 选项
   */
  setView(data, opts) {
    const _ = this
    try {
      if (!data?.length) return

      const {head, cfg} = _
      const {page: hpage, sort: hsort} = head[0]
      let {id: idx} = cfg
      idx = Array.isArray(idx) && idx?.length ? idx[0] : undefined
      _.clearSel()

      // 浅拷贝数组数据（子数组与原数组一致），用于排序、分页，不改变原数据
      _.data = [...data]

      // index 需对数组添加index属性
      if (_.data && _.opt.head[0].checkbox === 'index') _.data.forEach((v, x) => (v.index = x))

      // 缺省排序
      if (hsort) {
        const c = getCol(head, hsort)
        if (c) _.sort(_.data, c.col, c.type)
      }

      // 数据与模板结合，生成数据视图
      if (!_.group && _.pageBar()) _.paging()
      else _.tb.setView(data, {idx, ...opts})
      // view.setView.bind(_.tb)(data, {idx, ...opts})

      if (cfg.sum) _.setSum()
    } catch (ex) {
      console.error('setView exp:', ex.message)
    }
  }

  /**
   * 添加数据到视图
   * @param {*[]} data 外部传入数据
   * @param {SetViewOpts}  opts - 选项
   */
  addView(data, opts) {
    const _ = this
    try {
      if (!data?.length) return

      const {cfg, head} = _
      const {page: hpage, sort: hsort} = head[0]
      let {id: idx} = cfg
      idx = Array.isArray(idx) && idx?.length ? idx[0] : undefined

      _.clearSel()

      if (data && cfg.checkbox === 'index')
        // index 需对数组添加index属性
        data.forEach((v, x) => (v.index = x))

      // 合并数组（浅拷贝，子数组还是原子数组），用于排序、分页，不改变原数据
      _.data = [...(_.data || []), ...data]

      if (hsort) {
        // 缺省排序
        const c = getCol(head, hsort)
        if (c) _.sort(data, c.col, c.type)
      }

      // 数据与模板结合，生成数据视图
      if (!_.group && _.pageBar()) _.paging(1, true)
      else _.tb.addView(data, {idx, ...opts})
      // view.addView.bind(_.tb)(data, {idx, ...opts})

      if (cfg.sum) _.setSum()
    } catch (ex) {
      console.error('addView exp:', ex.message)
    }
  }

  /**
   * 生成分页ul列表
   * @param {*} start 当前分页条起始页码，默认为1
   * @returns 是否分页
   */
  pageBar(start = 1) {
    let R = false

    const {head, data, el} = this

    if (!head) {
      console.log('param is null.')
      return
    }

    // 分页
    const prow = head[0].page
    const plink = head[0].pageLink
    const paging = prow && prow > 0 && data.length > prow
    if (paging) {
      const len = Math.ceil(data.length / prow)
      let cnt = len - (start - 1)
      if (cnt > plink) cnt = plink

      const v = (
        <ul class="pagination">
          <li class={`paginate_button page-item previous ${start <= 1 && 'disabled'}`}>
            <a data-page={`<${start}`} tabindex="0" class="page-link">
              往前
            </a>
          </li>
          {this.pageLink(start, cnt)}
          <li class={`paginate_button page-item next ${len <= plink + start - 1 && 'disabled'}`}>
            <a data-page={`>${plink + start - 1}`} tabindex="0" class="page-link">
              往后
            </a>
          </li>
        </ul>
      )
      // 加入到容器
      el.class('dataTables_paginate').empty().append(v)
      el.class('data-table-footer').show()
      R = paging
    } else {
      el.class('dataTables_paginate').empty()
      el.class('data-table-footer').hide()
    }

    return R
  }

  /**
   * 创建分页数字标签
   * @param {*} cnt 页数
   * @returns 分页html节点数组
   */
  pageLink(start, cnt) {
    const R = []
    for (let i = start; i < start + cnt; i++) {
      R.push(
        <li class={`paginate_button page-item ${i === start && 'active'}`}>
          <a href="" data-page={i} tabindex="0" class="page-link">
            {i}
          </a>
        </li>
      )
    }

    return R
  }

  /**
   * 分页跳转，自动还原选择行
   * @param {*} i 分页序数，从1开始，默认第一页
   * @param {boolean} add 新增
   */
  paging(i = 1, add = false) {
    const _ = this
    try {
      const {data, tb, el, head, cfg} = _
      let {id: idx} = cfg
      idx = Array.isArray(idx) && idx?.length ? idx[0] : undefined

      el.class('.page-item.active').removeClass('active')
      el.findNode(`a[data-page="${i}"]`).parent().addClass('active')
      const plen = head[0].page
      const start = (i - 1) * plen
      const rs = data.slice(start, start + plen)

      if (add) tb.addView(rs, {idx})
      else tb.setView(rs, {idx})
      _.reCheck(rs)
    } catch (e) {}
  }

  /**
   * 根据选择_sel数组恢复checkbox
   */
  reCheck(rs) {
    const {el, data} = this
    if (!rs) rs = data
    // 还原选择行
    if (this._sel.size) {
      rs.forEach(r => {
        const n = el.findNode(`input[type="checkbox"][data-val="${r.index}"]`)
        n.prop('checked', this._sel.has(r.index)) // 不触发change事件
      })
    } else {
      rs.forEach(r => {
        const n = el.findNode(`input[type="checkbox"][data-val="${r.index}"]`)
        n.prop('checked', false) // 不触发change事件
      })
    }

    // 更新header的checkbox，部分或全选
    this._tb.headerCheck()
  }

  /**
   * 排序
   * @param {*} data 二维数组
   * @param {*} k 数组序号，对象key
   * @param {*} type 字段类型
   * @param {*} desc 降序
   * @returns data直接被排序，返回还是data
   */
  sort(data, k, type, desc) {
    data.sort(compareObj(k, desc, type))
    // index 需对数组添加index属性
    if (data && this.opt.head[0].checkbox === 'index') data.forEach((v, x) => (v.index = x))
  }

  destroy() {
    let m = this
    m._tb.destroy()

    m.unbind()

    if (m.el) {
      m.el[m.opt.domProp] = null
      delete m.el[m.opt.domProp]
    }
    Utils.deleteProps(m)
    m = null
  }
}

/**
 * 获得列序号
 * @param {*} head 表头数据
 * @param {*} name 名称
 * @returns 表数据序号
 */
function getCol(head, name) {
  let R = null

  const {hide} = head[0]
  let col = -1 // 隐藏字段需跳过
  for (let i = 1, len = head.length; i < len; i++) {
    col++ // 从 0 开始
    // 跳过隐藏列，隐藏列不显示
    if (hide?.includes(col)) col++

    if (head[i].name === name) {
      R = {col, type: head[i].type}
      break
    }
  }

  return R
}

/**
 *
 * @param {*} fun
 * @param {number} [delay]
 * @returns
 */
function debounce(fun, delay = 300) {
  let timer

  return function (...args) {
    // 清除之前的计时器
    clearTimeout(timer)

    // 设置新的计时器，tm 毫秒后执行 fun
    timer = setTimeout(() => {
      fun.apply(this, args)
    }, delay)
  }
}

/**
 * 格式化数字：保留 cnt 位小数并添加千位分隔符
 * @param {number} val - 需要格式化的数字
 * @param {number} [cnt] - 小数位数
 * @returns {string} 格式化后的字符串
 */
function formatNum(val, cnt = 2) {
  let R
  if (typeof val !== 'number' || Number.isNaN(val)) {
    return val // 如果不是数字，返回默认值
  }

  R = val
    .toLocaleString('en-US', {
      minimumFractionDigits: cnt, // 最少保留 2 位小数
      maximumFractionDigits: cnt, // 最多保留 2 位小数
    })
    .replace(/\.0+$/, '')
    .replace(/(\.\d+)0+$/, '$1')
  return R
}
