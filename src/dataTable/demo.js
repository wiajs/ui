import {Page} from '@wiajs/core'
import DataTable from '@wiajs/ui/dataTable'
import ExcelExport from '@wiajs/lib/excelExport'

const _name = 'pay/index'
const _title = '结算列表'

// 全局数据
const _from = {}
let _
let _tb

// 表头
const _head = [
  {checkbox: 'index', id: [0], hide: [4], link: [1], page: 10, pageLink: 10, sort: '入账时间'},
  {name: '银行流水', type: 'string', sort: false},
  {name: '入账金额', type: 'number', sort: true},
  {name: '入账时间', type: 'datetime', sort: true},
  {name: '入账名称', type: 'string', sort: false},
  {name: '状态', type: 'string', sort: true},
  {name: '摘要', type: 'string', sort: false},
]

let _data = []

export default class Index extends Page {
  constructor(opt) {
    opt = opt || {}
    super(opt.app || $.app, opt.name || _name, opt.title || _title)
    console.log(`${_name} constructor:`, {opt})
  }

  load(param) {
    super.load(param)
    console.log(`${_name} load:`, {param})
  }

  // 在已就绪的视图上绑定事件
  ready(v, param) {
    super.ready(v, param)
    console.log(`${_name} ready:`, {v, param})
    _ = v

    init.bind(this)()
    bind(this)
  }

  show(v, param) {
    super.show(v, param)
    console.log(`${_name} show:`, {v, param})
    $.assign(_from, param)
    show()
  }

  back(v, param) {
    super.back(v, param)
    console.log(`${_name} back:`, {v, param})
  }

  hide(v) {
    console.log(`${_name} hide:`, {v})
  }
}

async function init() {
  try {
    _tb = new DataTable(this, {
      el: _.dataTable,
      name: 'tbPay', // table 名称
      head: _head,
      // data: _data,
    })
  } catch (e) {
    console.log('init exp!', {e})
  }
}

function bind(p) {
  try {
    _.btnExcel.click(ev => {
      const head = ['银行流水', '入账金额', '入账时间', '入账名称', '入账账号', '状态', '摘要']
      const txt = _.lsUnit.dom.options[_.lsUnit.dom.selectedIndex].text
      const excel = new ExcelExport(head, _data, {
        title: `${txt}${_.txStartDate.val()}至${$.date('MM-dd', _.txEndDate.val())} 结算表`,
        fileName: `${txt}${_.txStartDate.val()}至${$.date('MM-dd', _.txEndDate.val())}结算v${$.date(
          'yyMMdd'
        )}`,
      })
      excel.save()
    })

    _.btnSelAll.click(ev => {
      _tb.selAll()
    })

    _.btnCancelSel.click(ev => {
      _tb.cancelSel()
    })

    // checkbox事件
    _tb.on('check', sel => {
      console.log('check', {sel})
      let amount = 0
      const cnt = sel.size

      sel.forEach(i => {
        const v = _tb.data[i]
        amount += toFen(v[1])
      })
      amount = toYuan(amount)
      _.class('data-table-selected-count').text(cnt)
      _.class('data-table-selected-info').text(`条记录，金额：${amount}元`)
    })

    // 行选择事件
    _tb.on('select', rs => {
      console.log('select', {rs})
    })
  } catch (ex) {
    console.log('bind exp!', {ex})
  }
}

/**
 * 结算查询
 */
async function queryPay(rs) {
  try {
    if (rs) {
      _data = rs
      _tb.setView(rs)
    } else {
      _tb.setView([])
    }
  } catch (ex) {
    console.error('queryPay exp:', ex.message)
  }
}

/**
 */
async function dist() {
  try {
    const {sel} = _tb
    if (sel && sel.size) {
      const arr = Array.from(sel)
      const today = arr.some(i => {
        const v = _tb.data[i]
        return new Date(v[2]) >= new Date($.date('yyyy-MM-dd'))
      })
      if (today) {
        await promisify($.app.dialog.alert, 0)('目前暂不支持当日结算款转账！', '转 帐')
        return
      }

      const ps = []
      let distAmount = 0
      let cnt = 0
      _tb.sel.forEach(i => {
        const r = _tb.data[i]
        let [, amount] = r
        amount = toFen(amount)
        if (amount) {
          cnt++
          distAmount += amount
          ps.push([r[0], amount, r[2]])
        }
      })
    }
  } catch (ex) {
    console.error('dist exp:', ex?.message)
  }
}

function showTb(data) {
  _tb.setView(data)
}

async function show(param) {
  // 测试数据;
  const rs = {
    data: _data,
  }
  // debugger;
  // const rs = await _api.find({
  //   cdt: {pid: 1}, // 查询条件，pid: 1 表示限定自己，如果要看别人的，需要权限
  //   limit: 50, // 一次查询返回多少条数据
  //   skip: 0, // 后续查询，跳过条数
  //   sort: '-addTime', // 最新的在前面
  // });
  // const rs = await _api.get({id: 1});

  if (rs.data) {
    showTb(rs.data)
  }
}
