import {Utils, Event} from '@wiajs/core'

const def = {
  selector: '.data-table',
  domProp: 'wiaTable',
  name: 'wiaTable', // 默认表名，用于排除模板行
}

/**
 * 从F7 DataTable迁移，与app和自动化创建脱离，标准手动方式创建
 * DataTable 扩展了Table，实现动态表格生成
 * 为已具备html的数据表格提供样式变化功能
 * 动态生成表格，需在生成后创建该组件
 */
export default class Table extends Event {
  name = '' // table name

  constructor(page, opt = {}) {
    super(opt, [page])
    const m = this
    this.page = page
    this.opt = {...def, ...opt}
    this.name = this.opt.name

    // 容器
    const $el = opt.el || page.view.find(this.opt.selector)
    if ($el.length === 0) return undefined

    m.$el = $el
    m.el = $el[0]

    // 已创建，直接返回
    if (m.el[this.opt.domProp]) {
      const instance = m.el[this.opt.domProp]
      m.destroy()
      return instance
    }

    m.el[this.opt.domProp] = m
    const header = $el.find('.data-table-header')
    Utils.extend(m, {
      collapsible: $el.hasClass('data-table-collapsible'),
      // Headers
      $headerEl: header,
      $headerSelectedEl: $el.find('.data-table-header-selected'),
    })

    // Events
    function handleChange(e) {
      // 代码更改checkbox属性，不会触发change，代码触发change，这里需排除，避免循环
      if (e.detail && e.detail.sentByWiaF7Table) {
        // Scripted event, don't do anything
        return
      }

      // this 为被选中的input
      const $inputEl = $(this)
      // 是否被选中
      const {checked} = $inputEl[0]
      // 列数
      const columnIndex = $inputEl.parents('td,th').index()

      // 表头 checkbox选择影响当页所有行，排除模板行
      if ($inputEl.parents('thead').length > 0) {
        // 行首，选择行
        if (columnIndex === 0)
          $el
            .find(`tbody tr:not([name="${m.name}-tp"])`)
            [checked ? 'addClass' : 'removeClass']('data-table-row-selected')

        // 全选或取消全选，更新每行checkbox，并触发 change事件
        $el
          .find(`tbody tr:not([name="${m.name}-tp"]) td:nth-child(${columnIndex + 1}) input`)
          .prop('checked', checked)
          .trigger('change', {sentByWiaF7Table: true})

        $inputEl.prop('indeterminate', false)
      } else {
        // 表体checkbox
        if (columnIndex === 0)
          $inputEl.parents('tr')[checked ? 'addClass' : 'removeClass']('data-table-row-selected')
        m.headerCheck(columnIndex)
      }

      // 延迟到change事件后触发，避免统计选择行数据差错
      m.headerSel()
    }

    function handleSortableClick() {
      const $cellEl = $(this)
      const isActive = $cellEl.hasClass('sortable-cell-active')
      const currentSort = $cellEl.hasClass('sortable-desc') ? 'desc' : 'asc'
      let newSort
      if (isActive) {
        newSort = currentSort === 'desc' ? 'asc' : 'desc'
        $cellEl.removeClass('sortable-desc sortable-asc').addClass(`sortable-${newSort}`)
      } else {
        $el.find('thead .sortable-cell-active').removeClass('sortable-cell-active')
        $cellEl.addClass('sortable-cell-active')
        newSort = currentSort
      }
      $cellEl.trigger('datatable:sort', newSort)
      m.emit('local::sort dataTableSort', $cellEl, newSort === 'desc')
    }

    m.attachEvents = function () {
      m.$el.on('change', '.checkbox-cell input[type="checkbox"]', handleChange)
      m.$el.find('thead .sortable-cell').on('click', handleSortableClick)
    }

    m.detachEvents = function () {
      m.$el.off('change', '.checkbox-cell input[type="checkbox"]', handleChange)
      m.$el.find('thead .sortable-cell').off('click', handleSortableClick)
    }

    // Init
    m.init()
  }

  setCollapsibleLabels() {
    const m = this
    if (!m.collapsible) return
    m.$el.find('tbody td:not(.checkbox-cell)').each((index, el) => {
      const $el = $(el)
      const elIndex = $el.index()
      const collpsibleTitle = $el.attr('data-collapsible-title')
      if (!collpsibleTitle && collpsibleTitle !== '') {
        $el.attr('data-collapsible-title', m.$el.find('thead th').eq(elIndex).text())
      }
    })
  }

  /**
   * 表头选择区域显示切换，统计选择行，触发选择改变事件，方便跨页统计
   */
  headerSel() {
    const m = this
    // 选中行
    // const rs = m.$el.find('tbody .checkbox-cell input:checked');
    const rs = m.$el.find('.data-table-row-selected')
    const len = rs.length
    // 改变表头操作面板
    if (m.$headerEl.length > 0 && m.$headerSelectedEl.length > 0) {
      if (len && !m.$el.hasClass('data-table-has-checked')) m.$el.addClass('data-table-has-checked')
      else if (!len && m.$el.hasClass('data-table-has-checked'))
        m.$el.removeClass('data-table-has-checked')

      // 选中数量，跨行选择数量与当前也选择数量不一致
      m.$headerSelectedEl.find('.data-table-selected-count').text(len)
    }

    // 触发当前表选择事件，参数为选择行
    // 延迟到change事件后触发，避免跨页统计选择行数据差错
    setTimeout(() => {
      m.emit('local::select', rs)
    }, 10)
  }

  /**
   * 根据行选择，选中或取消表头checkbox
   */
  headerCheck(col = 0) {
    const {$el} = this
    // 表头checkbox
    const ckb = $el.findNode(`thead .checkbox-cell:nth-child(${col + 1}) input[type="checkbox"]`)

    if (ckb.length) {
      const checkedRows = $el.find(
        `tbody .checkbox-cell:nth-child(${col + 1}) input[type="checkbox"]:checked`
      ).length

      // 排除模板行
      const totalRows = $el.find(`tbody tr:not([name="${this.name}-tp"])`).length
      if (checkedRows === 0) ckb.prop('checked', false)
      else if (checkedRows === totalRows) {
        const ck = ckb.dom.checked
        // 全选
        if (!ck) {
          ckb.prop('checked', true)
          ckb.trigger('change', {sentByWiaF7Table: true})
        }
      }

      ckb.prop('indeterminate', checkedRows > 0 && checkedRows < totalRows) // 部分选中
    }
  }

  init() {
    const m = this
    m.attachEvents()
    m.setCollapsibleLabels()
    m.headerSel()
  }

  destroy() {
    let m = this

    m.$el.trigger('datatable:beforedestroy')
    m.emit('local::beforeDestroy dataTableBeforeDestroy', m)

    m.detachEvents()

    if (m.$el[0]) {
      m.$el[0].f7DataTable = null
      delete m.$el[0].f7DataTable
    }
    Utils.deleteProps(m)
    m = null
  }
}
