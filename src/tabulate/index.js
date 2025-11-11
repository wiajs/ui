// 海口永力新能源技术有限公司 版权所有
/** @jsxImportSource @wiajs/core */

import {log as Log} from '@wiajs/util'
import Ud from '../uploader' // eslint-disable-line

const log = Log({m: 'tabulate'}) // 创建日志实例

const g = {
  /** @type {*} - 动态加载并缓存 */
  tabulator: null,
    /** @type {*} */
  lightbox: null,
}

/**
 * @typedef {import('../editTable/index').default} EditTable
 */
/**
 * @typedef {import('jquery')} $
 * @typedef {JQuery} Dom
 */

// const {$} = window
export default class Tabulate {
  /**
   * 构造函数
   * @param {Object} options - 组件配置选项
   * @param {string} options.containerName -表格容器name属性
   * @param {string} options.addButtonName -  添加按钮name属性
   * @param {Object} options.baseTableInfo - 基础表格信息
   * @param {*} options.targetBox - 表格DOM
   * @param {Function} options.getSelAll - 获取公司数据的方法
   * @param {Function} options.saveEmbTb - 保存表格数据的方法
   * @param {*} options.viewid - cardId
   * @param {*} options.prjid - 项目id
   * @param {*} options.upload - 上传参数
   *
   */
  constructor(options) {
    // 配置参数
    this.containerName = options.containerName || 't-table'
    this.addButtonName = options.addButtonName || 'add-button'
    this.baseTableInfo = options.baseTableInfo || {}
    this.getSelAll = options.getSelAll || (() => Promise.resolve([]))
    this.targetBox = options.targetBox
    this.viewid = options.viewid
    this.prjid = options.prjid
    this.upload = options.upload
    this.saveEmbTb = options.saveEmbTb || (() => Promise.resolve([]))
    // 实例属性
    this.tEditTable = null
    this.newData = {}
    this.companyData = []
    this.deletedData = []
    this.fileObj = {}
    this.formatMap = {}
    // 初始化
    this.init()
  }

  /**
   * 初始化组件
   */
  async init() {
    try {
    await this.prepareCompanyData()
    this.createTableStructure()
    await this.loadTabulatorAndRender()
    this.bindEvents()
    } catch (error) {
      log.err(error, 'init')
    }
  }

  /**
   * 获取并准备数据
   */
  async prepareCompanyData() {
    try {
      const result = await this.getSelAll({
        ref: 'value-base/company:id',
        fields: 'id name',
      })

      this.companyData = result?.map(com => ({
        id: com.id,
        label: com.name,
        value: com.name,
      }))
    } catch (error) {
      log.err(error, 'prepareCompanyData')
      this.companyData = []
    }
  }

  /**
   * 创建表格DOM结构
   */
  createTableStructure() {
    try {
    this.targetBox.forEach(table => {
      table.style.display = 'none'
        console.log(table.parentNode.children,'table.parentNode')
         // 获取当前 .data-table 的父节点（兄弟元素的共同容器）
         const parent = table.parentNode
         // 在父节点中查找 name="t-table" 的 div
         const tTableDiv = parent.querySelector('div[name="t-table"]')
         const tTableBtn = parent.querySelector('button[name="add-button"]')
        if (tTableDiv && tTableBtn) {
          tTableDiv.style.display = 'block'
          tTableBtn.style.display = 'block'
      } else {
        const newDiv = document.createElement('div')
        newDiv.setAttribute('name', this.containerName)
        table.insertAdjacentElement('afterend', newDiv)
        const newButton = document.createElement('button')
        newButton.textContent = '新增' // 设置按钮文本
        // newButton.id = 'add-button'; // 设置按钮ID（可选）
        newButton.setAttribute('name', this.addButtonName)
        newButton.classList.add('btn') // 添加样式类（可选）
        newButton.style.background = '#007bff'
        newButton.style.color = '#fff'
        newButton.style.marginBottom = '10px'
        // 插入到 oldDiv 前方
        if (newDiv && newDiv.parentNode) {
          newDiv.parentNode.insertBefore(newButton, newDiv)
        } else {
          console.error('oldDiv 不存在或没有父元素')
        }
      }
    })
    } catch (error) {
      log.err(error, 'createTableStructure')
    }
  }

/**
 * 销毁实例
 * @param {*} instance
 * @returns
 */
 destroyTabulateInstance(instance) {
  try {
      if (!instance) return
  // 清除实例关联的DOM（如容器内的表格结构）
      const containers = document.querySelectorAll(`div[name="${instance.containerName}"]`)
  containers?.forEach(container => {
        container.innerHTML = '' // 清空容器
      })
  // 移除事件监听（如果实例有绑定事件，如按钮点击）
      const addButtons = document.querySelectorAll(`button[name="${instance.addButtonName}"]`)
  addButtons?.forEach(button => {
    button.removeEventListener('click', () => this.addRow())
      })
  // 清除实例引用（释放内存）
      instance = null
  } catch (error) {
    log.err(error, 'destroyTabulateInstance')
  }
}

  /**
   * 加载Tabulator并渲染表格
   * 有问题
   */
  async loadTabulatorAndRender() {
    try {
      // 准备表格数据和列配置
      const tableData = this.prepareTableData()
      const columns = this.prepareColumns()
      let container
      this.targetBox.forEach(table => {
        const parent = table.parentNode
       // 在父节点中查找 name="t-table" 的 div
        const tTableDiv = parent.querySelector('div[name="t-table"]')
        container = tTableDiv
        // const container = document.querySelector(`[name="${this.containerName}"]`)
       })

      // 初始化表格
      // const container = document.querySelector(`[name="${this.containerName}"]`)
      if (!g.tabulator) {
        // @ts-ignore
        // import tabulatorTables from 'https://cdn.jsdelivr.net/npm/tabulator-tables@6.3.1/+esm'
        //! g.tabulator = await import('https://cos.brains.fund/wia/tabulator.mjs')
        await import('https://cos.brains.fund/wia/tabulator.min.js')
        g.tabulator = true
      }

      //! this.tEditTable = new g.tabulator.Tabulator(container, {
      this.tEditTable = new Tabulator(container, {
        data: tableData,
        layout: columns.length>7?'fitDataStretch':'fitColumns',
        columns: columns,
        rowFormatter: row => this.formatRow(row),
      })
      this.tEditTable.on('cellEdited', cell => this.handleCellEdit(cell))
    } catch (error) {
      log.err(error, 'loadTabulatorAndRender')
    }
  }

  /**
   * @param {any[]} head
   * @param {any[]} data
   */
  formatData(head, data) {
    const formatMap = {}
    const dateMap = []
    head.forEach(item => {
      if (item.div !== undefined && item.idx !== undefined) {
        // @ts-expect-error
        formatMap[item.idx] = item.div
      }
      if (item.type === 'date') {
        dateMap.push(item.idx)
      }
    })
    console.log(dateMap, 'dateMap')
    this.formatMap = formatMap
    // 格式化数据
    return data.map(row => {
      return row.map((value, index) => {
        if (formatMap[index] && typeof value === 'number') {
          return value / formatMap[index]
        }
        if (dateMap.includes(index)) {
          const dateStr = value // 获取原始值（2069-04-20T16:00:00.000Z）
          if (!dateStr) return ''
          const utcDate = new Date(dateStr)
          const chinaTimeTimestamp = utcDate.getTime() + 8 * 60 * 60 * 1000 // 8小时的毫秒数
          const chinaDate = new Date(chinaTimeTimestamp)
          const year = chinaDate.getUTCFullYear()
          const month = String(chinaDate.getUTCMonth() + 1).padStart(2, '0') // 月份从0开始
          const day = String(chinaDate.getUTCDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }
        return value
      })
    })
  }

  /**
   * 准备表格数据
   */
  prepareTableData() {
    try {
    const baseData = this.baseTableInfo?.data || []
      const result = this.formatData(this.baseTableInfo.head, baseData)
      return result[0] === null
      ? []
        : result.map((item, index) => ({
          id: index,
          ...item,
        }))
    } catch (error) {
      log.err(error, 'prepareTableData')
    }
  }

  //Create Date Editor
  /**
   * @param {{ getValue: () => any; }} cell
   * @param {(arg0: () => void) => void} onRendered
   * @param {(arg0: any) => void} success
   * @param {() => void} cancel
   */
  dateEditor(cell, onRendered, success, cancel) {
    //cell - the cell component for the editable cell
    //onRendered - function to call when the editor has been rendered
    //success - function to call to pass thesuccessfully updated value to Tabulator
    //cancel - function to call to abort the edit and return to a normal cell

    //create and style input
    var cellValue = cell.getValue(),
      input = document.createElement('input')

    input.setAttribute('type', 'date')

    input.style.padding = '4px'
    input.style.width = '100%'
    input.style.boxSizing = 'border-box'

    input.value = cellValue

    onRendered(() => {
      input.focus()
      input.style.height = '100%'
    })

    function onChange() {
      if (input.value != cellValue) {
        success(input.value)
      } else {
        cancel()
      }
    }

    //submit new value on blur or change
    input.addEventListener('blur', onChange)

    //submit new value on enter
    input.addEventListener('keydown', e => {
      if (e.keyCode == 13) {
        onChange()
      }

      if (e.keyCode == 27) {
        cancel()
      }
    })

    return input
  }

  // 辅助函数：根据ID获取对应的中文名称
  /**
   * @param {any[]} options
   * @param {any} id
   */
  getOptionNameById(options, id) {
    console.log(options, 'options')
    console.log(id, 'id')
    const option = options.find((/** @type {{ value: any; }} */ item) => item.value == id)
    return option ? option.label : ''
  }

  /**
   * @param {{ [s: string]: any; } | ArrayLike<any>} data
   */
  convertToOptions(data) {
    // 处理第一种格式：{0:'待定',1:'前期开发',...}
    if (typeof data === 'object' && !Array.isArray(data)) {
      return Object.entries(data).map(([key, value]) => ({
        value: Number(key),
        label: value,
      }))
    }
    // 处理第二种格式：['是','否']
    else if (Array.isArray(data)) {
      return data.map(item => ({
        value: item,
        label: item,
      }))
    }
    return []
  }

  /**
   * 准备列配置
   */
  prepareColumns() {
    try {
    // @ts-ignore
    const head = this.baseTableInfo?.head || []
    const columns =  head.slice(1).map((item, index) => {
      const fieldIndex = head[0]?.hide?.length > 0 ? index + 1 : index
      // 编辑器类型判断：新增upload类型支持
        let editor = false
      if (item.editor === 'image') {
          // @ts-ignore
        editor = this.imageUploadEditor.bind(this)
      } else if (item.editor === 'upload') {
          // @ts-ignore
        editor = (...args) => this.fileUploadEditor(fieldIndex,false, ...args)
        // editor = this.fileUploadEditor.bind(this,index); // 绑定文件上传编辑器
        } else if (item.editor === 'date') {
          // @ts-expect-error
          editor = this.dateEditor
      } else if (item.editor) {
          editor = item.editor
      }
      return {
        title: item.name,
        field: fieldIndex.toString(),
        editor: editor,
        ...(item.editor === 'upload' && {
            formatter: (...args) => this.fileUploadEditor(fieldIndex, true, ...args),
        }),
        ...(item.type === 'date' && {
            formatter: cell => {
              const dateStr = cell.getValue() // 获取原始值（2069-04-20T16:00:00.000Z）
              if (!dateStr) return ''

              const date = new Date(dateStr)
              if (isNaN(date.getTime())) {
                // 检查日期是否有效
                return '无效日期'
                }

                // 格式化为YYYY-MM-DD（使用UTC时间）
              const year = date.getUTCFullYear()
              const month = String(date.getUTCMonth() + 1).padStart(2, '0') // 月份从0开始
              const day = String(date.getUTCDate()).padStart(2, '0')

              return `${year}-${month}-${day}`
            },
        }),
          editorParams: item.editor === 'list' ? this.getListEditorParams(item) : {},
          // 格式化显示：根据ID显示中文名称
          ...(item.editor === 'list' &&
            item.option && {
              formatter: cell => {
                return this.getOptionNameById(this.getListEditorParams(item).values, cell.getValue())
              },
            }),
      }
    })
     // 新增：添加操作列（删除按钮）
    columns.push({
        title: '操作',
        field: 'action',
      fixedWidth: true,
      width: 80,
      formatter: (/** @type {{ getRow: () => Object; }} */ cell) => {
          const btn = document.createElement('button')
          btn.textContent = '删除'
          btn.style.background = '#dc3545'
          btn.style.color = '#fff'
          btn.style.border = 'none'
          btn.style.padding = '3px 8px'
          btn.style.borderRadius = '3px'
          btn.style.cursor = 'pointer'

        // 绑定删除事件
          btn.addEventListener('click', e => {
            e.stopPropagation() // 阻止事件冒泡
            this.deleteRow(cell.getRow())
          })

          return btn
      },
        hozAlign: 'center',
        cellClick: false, // 禁用单元格点击事件，避免与按钮冲突
      })
      return columns
    } catch (error) {
      log.err(error, 'prepareColumns')
    }
  }
  /**
   * 获取上传编辑器参数
   * @param {Object} column - 列配置信息
   */
  getUploadEditorParams(column) {
    try {
    return {
      url: column.uploadUrl || 'https://lianlian.pub/img/upload', // 上传接口地址
      dir: column.uploadDir || 'table/uploads', // 上传目录
      accept: column.accept || '*', // 接受的文件类型
      limit: column.limit || 1, // 限制文件数量
      multiple: column.multiple || false, // 是否支持多文件
      // 其他上传参数...
      }
    } catch (error) {
      log.err(error, 'getUploadEditorParams')
    }
  }

  /**
 * 删除行处理
 * @param {Object} row - Tabulator行对象
 */
deleteRow(row) {
  try {
      if (!confirm('确定要删除此行数据吗？')) {
        return
  }

      const rowData = row.getData()
      const rowId = rowData.id
  const _r = Object.entries(rowData)
  .filter(([key]) => key !== 'id')
  .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
  .map(item => item[1])
  // 处理删除数据记录
  if (rowId >= 0) {
    // 原有数据（正数ID）- 需要记录到删除列表
        this.deletedData.push({index: rowId, data: _r})
  } else {
    // 新增未保存数据（负数ID）- 直接从newData中移除
        delete this.newData[rowId]
  }

  // 从表格中移除行
      this.tEditTable.deleteRow(rowId)
  } catch (error) {
    log.err(error, 'deleteRow')
  }
}
  /**
   * 获取列表编辑器参数
   */
  getListEditorParams(item) {
    try {
      if (item.option) {
        const convertData = this.convertToOptions(item.option)
        console.log(convertData, 'convertData')
        return {
          // 转换选项为Tabulator需要的格式 {value: id, label: 中文名称}
          values: convertData,
        }
      } else {
    return {
      values: this.companyData,
      autocomplete: true,
      freetext: true,
      allowEmpty: true,
          itemFormatter: (label, value, item, element) => {
            return `
        <div style="padding: 5px;">
          <strong>${label}</strong>
        </div>
              `
          },
        }
    }
    } catch (error) {
      log.err(error, 'getListEditorParams')
    }
  }

  /**
   * 切换编辑/预览模式
   * @param {boolean} isEditing - 是否为编辑模式
   */
  togglePreview() {
    try {
    this.targetBox.forEach((/** @type {{ style: { display: string; }; }} */ table) => {
      table.style.display = 'block'
        const parent = table.parentNode
        const tTableDiv = parent.querySelector('div[name="t-table"]')
        const addButton = parent.querySelector('button[name="add-button"]')
        // @ts-expect-error
        tTableDiv.style.display = 'none'
        // @ts-expect-error
      addButton.style.display = 'none'
    })
    } catch (error) {
      log.err(error, 'togglePreview')
    }
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    try {
    const addButton = document.querySelector(`[name="${this.addButtonName}"]`)

    if (addButton) {
      addButton.addEventListener('click', () => this.addRow())
    }
    } catch (error) {
      log.err(error, 'bindEvents')
    }
    // const addButton = document.getElementById(this.addButtonName);
  }

  /**
   * 添加新行
   */
  addRow() {
    try {
    if (!this.tEditTable) return

    const data = this.tEditTable.getData()
    const len = data.length
    this.tEditTable.addRow({
      id: -(len + 1),
    })
    } catch (error) {
      log.err(error, 'addRow')
    }
  }

  /**
   * 处理单元格编辑
   * @param {Object} cell - 单元格对象
   */
  handleCellEdit(cell) {
    try {
    const eidtData = cell.getRow().getData()
    const id = eidtData.id
    const row = this.tEditTable.getRow(id)

    if (this.baseTableInfo.head?.[0].editOpt) {
      this.handleEditWithOptions(eidtData, id)
    } else {
      this.handleFreeEdit(eidtData, id)
    }

    row?.reformat()
    } catch (error) {
      log.err(error, 'handleCellEdit')
    }
  }

  /**
   * 处理带选项的编辑
   * @param {Object} data - 行数据
   * @param {number} id - 行ID
   */
  handleEditWithOptions(data, id) {
    try {
    const searchIdx = this.baseTableInfo.head[0].editOpt.search[0]
    const name = data[searchIdx + 1]
    const result = this.companyData.find(item => item.label === name)

    this.newData[id] = {
      ...(id < 0 && {0: result?.id}),
      ...data,
      id,
      [searchIdx + 1]: result ? result.label : data[searchIdx + 1],
    }
    } catch (error) {
      log.err(error, 'handleEditWithOptions')
    }
  }

  /**
   * 处理自由编辑
   * @param {Object} data - 行数据
   * @param {number} id - 行ID
   */
  handleFreeEdit(data, id) {
    try {
    const hasOwnEnumerable0 = Object.prototype.propertyIsEnumerable.call(data, '0')
    this.newData[id] = {
      ...data,
      ...(hasOwnEnumerable0 ? {} : {0: null}),
      id: id,
    }
    } catch (error) {
      log.err(error, 'handleFreeEdit')
    }
  }

  /**
   * 格式化行样式
   * @param {Object} row - 行对象
   */
  formatRow(row) {
    try {
    const data = row.getData()
    row.getElement().style.backgroundColor = data.editing ? '#fffde7' : ''
    } catch (error) {
      log.err(error, 'formatRow')
    }
  }

  /**
   * 保存表格数据
   * @returns {Object} 保存的数据
   */
  async saveTable() {
    try {
    this.newData  = this.processData(this.newData)
    this.deletedData  = this.processData(this.deletedData)

      const add = []
      const update = []
      const del = []
      const keys = Object.keys(this.formatMap)
    Object.keys(this.newData).forEach(key => {
        const rowData = this.newData[key]
        for (const o in rowData) {
          if (keys.includes(o)){
            rowData[o] =  rowData[o] * this.formatMap[o]
          }
        }
      if (key < 0) {
        const _r = Object.entries(this.newData[key])
          .filter(([key]) => key !== 'id') // 过滤掉 id 键
          .sort((a, b) => parseInt(a[0]) - parseInt(b[0])) // 按数字键排序
          .map(item => item[1]) // 只保留值
        add.push(_r)
      } else {
        const _r = Object.entries(this.newData[key])
          .filter(([key]) => key !== 'id') // 过滤掉 id 键
          .sort((a, b) => parseInt(a[0]) - parseInt(b[0])) // 按数字键排序
          .map(item => item[1]) // 只保留值
        update.push({
          index: key,
          data: _r,
        })
      }
    })

    const params = {
      viewid: this.viewid,
      id: this.prjid,
      add,
      update,
        del: this.deletedData, // 新增删除数据参数
    }
    console.log(params, 'params')
    await this.saveEmbTb(params)
    } catch (error) {
      log.err(error, 'saveTable')
    }
  }

  /**
 * 文件上传编辑器 - 渲染Uploader组件
 * @param {Object} cell - 单元格对象

 * @param {Object} index - 编辑器参数
 *
 * @returns {HTMLElement} 编辑器元素
 */
fileUploadEditor(index,read,cell) {
  try {
      const cellValue = cell.getValue() || []
      const row = cell.getRow()
      const rowId = row.getData().id
      // @ts-expect-error
  this.fileObj[`${rowId}-${index}`] = this.fileObj[`${rowId}-${index}`]  ??  cellValue
  console.log(cellValue,'value')
      const i = -1
    // if (Array.isArray(cellValue) ){
    //   for (const v of cellValue) {
    //     i++
    //     v._idx = i // 数据加索引，方便浏览
    //   }
    // }

      const container = document.createElement('td')
      container.className = 'upload-editor-container'
  const $container= $(container)
  const att = $(<div class={`etAttach`} />)
  att.appendTo($container)
  att.append(<div class="attach-wrap" />)
    // 封装层，超出左右滑动
  const wrap = att.find('.attach-wrap')
  for (const v of this.fileObj[`${rowId}-${index}`]) {
    const {_idx, name, url, type, ext} = v
        const field = ''
        const abb = ''
    this.addItem(wrap, field, type, ext, name, abb, url, _idx,read)
  }
  if (!read){
    wrap.append(
    <div class="attach-item wia_uploader">
      <input name={`field-attach-add`} type="hidden" />
      <div class="_choose">
        <div name="btnAdd" class="_input" />
      </div>
    </div>
  )
  // 初始化Uploader组件
        const {dir, url} = this.upload
        let {token} = this.upload
        token = token ?? 'token'

  const uploader = new Ud({
      dir, // 图片存储路径
      url, // 图片上传网址
      el: wrap.class('wia_uploader'), // 组件容器
      input:wrap.name(`field-attach-add`), // 上传成功后的url填入输入框，便于提交
      choose: wrap.class('_choose'), // 点击触发选择文件
    upload: true, // 自动上传
      preview: false,
      delete: true, // 带删除图标
      accept: '*', // 选择文件类型
      abb:'lisi',
      multiple: true, // 可否同时选择多个文件
      left: 250, // 预览偏移，左边有导航栏
      header: {'x-wia-token': $.store.get(token)}, // 请求头
        })
    uploader.on('success', (rs, file, files) => {
      console.log('uploader succ', {rs, file, files})
      const eidtData = cell.getRow().getData()
      const id = eidtData.id
      const row = this.tEditTable.getRow(id)
      const hasOwnEnumerable0 = Object.prototype.propertyIsEnumerable.call(eidtData, '0')
          this.fileObj[`${rowId}-${index}`].push({
        id: file.id,
          cat:'',
          abb: file.name,
          type: file.type,
          ext: file.ext,
            url: file.url,
          })
      const defaultArr = this.fileObj[`${rowId}-${index}`].map(file => file.id)
      this.newData[id] = {
        ...eidtData,
        ...(hasOwnEnumerable0 ? {} : {0: null}),
            [index]: defaultArr,
      }
      this.newData  = this.processData( this.newData)
    })
  }
      $container.click(event => this.attachClick(event, index, cell)) // 点击浏览大图
    container.attachData = cellValue
    $container.data('idx', rowId) // td 保存 EditTable 的数据索引
      return container
  } catch (error) {
    log.err(error, 'fileUploadEditor')
  }
}

/**
 * 处理对象，将包含id属性的对象数组转换为id数组
 * @param {any} data - 需要处理的数据（对象、数组或基本类型）
 * @returns  {any} data 处理后的新数据
 */
 processData(data) {
  try {
  // 1. 如果是对象（非null且非数组），递归处理每个属性
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        const processed = {}
      for (const key in data) {
          if (Object.hasOwn(data, key)) {
            // @ts-expect-error
            processed[key] = this.processData(data[key]) // 递归处理子属性
          }
      }
        return processed
  }

  // 2. 如果是数组，检查每个元素是否是含id的对象
  if (Array.isArray(data)) {
      return data.map(item => {
          // 若元素是对象且包含id属性，则提取id
          if (typeof item === 'object' && item !== null && 'id' in item) {
            return item.id
    }
          // 否则递归处理元素（处理嵌套数组/对象）
          return this.processData(item)
        })
  }

  // 3. 基本类型（null、number、string等）直接返回
      return data
  } catch (error) {
    log.err(error, 'processData')
  }
}

/**
 * 点击tr、td 浏览大图或删除附件
 * @param {*} ev
   */
async attachClick(ev,index,cell) {
  try {
    const _ = this
    const eidtData = cell.getRow().getData()
    const id = eidtData.id
    const row = this.tEditTable.getRow(id)
    // 如果点击的是 input 则不处理
    if (ev.target.type === 'file') return
    const td = $(ev).upper('td')
    const idx = td.data('idx') // EditTable data 索引
    let value = td?.dom?.attachData
    // this.fileObj[`${idx}-${index}`] = this.fileObj[`${idx}-${index}`]  ??  value
    const tr = $(ev).upper('tr')
    if (!value) value = tr?.dom?.attachData
    value = value ?? []
    const att = $(ev).upper('.attach-item')
    const wrap = $(ev).upper('._wrap')
    let i = att.data('idx') // 附件数据索引，新增附件没有
    console.log(i,'i')
    console.log(idx,'idx')
    const field = att.data('field')
    const btnDel = $(ev).upper('.attach-delete')
    // 删除
    if (btnDel.dom) {
      if (att.dom) {
        // 新增附件删除
        // if (field.endsWith('-attach-add')) {
        if (wrap.dom) {
          const src = wrap.find('._file').data('src')
          // uploader 维护 input
          if (src) td.dom.uploader?.remove({url: src})
        } else {
          const hasOwnEnumerable0 = Object.prototype.propertyIsEnumerable.call(eidtData, '0')
          _.fileObj[`${idx}-${index}`]?.splice(i, 1)
          const defaultArr = this.fileObj[`${idx}-${index}`].map(file => file.id)
          _.newData[id] = {
            ...eidtData,
            ...(hasOwnEnumerable0 ? {} : {0: null}),
              [index]: defaultArr,
          }
          const el = att.upper('.etAttach')
          if (!el.dom.attachDel) el.dom.attachDel = []
          // 保存被删除元素的信息：DOM克隆、父节点、前一个兄弟节点（用于还原位置）
          console.log(idx,field,value,att)
          el.dom.attachDel.push({
            idx,
            field,
            value,
            att,
            parent: att.dom.parentNode,
            prev: att.dom.previousSibling,
          })
          att.remove() // 移除DOM元素
        }
      }
      } else if (att.dom && tr.dom) {
      // 新增附件没有idx，使用 src
      let src = ''
      if (wrap.dom) src = wrap.find('._file').data('src')

      const add = td.find('[name$="-attach-add"]')
      const addVal = add.dom?.uploadData ?? []

      const data = [...value, ...addVal]

      // 浏览图片附件
      let v
      if (src) {
        i = -1
        v = addVal.find(v => v.url === src)
      } else v = data.find(v => v._idx === i)

      const {type, ext} = v || {}
      console.log(type,'type')
      console.log(ext,'ext')
      let {url} = v || {}
      if (type === 'doc') {
        console.log(url,'doc')
          if (['doc', 'docx', 'xls', 'xlsx', 'ppt'].includes(ext))
            url = `https://view.officeapps.live.com/op/view.aspx?src=${url}&wdOrigin=BROWSELINK`

        window.open(url, '_blank')
      } else if (type === 'img' || type === 'video') {
        if (!g.lightbox) {
            // @ts-expect-error
          // if (!g.anime) g.anime = await import('https://cdn.jsdelivr.net/npm/animejs@4/+esm')
            // @ts-expect-error
          // const m = await import('https://cdn.jsdelivr.net/npm/glightbox@3/+esm')
          const m = await import('https://cos.wia.pub/wiajs/glightbox.mjs')
          g.lightbox = m.default
          setTimeout(() => _.showImg(data, i, src), 1000)
        } else _.showImg(data, i, src)
      }
    }
  } catch (e) {
    log.err(e, 'attachClick')
  }
}

/**
 * 使用 lightbox 图片浏览
 * @param {*[]} data - 附件数据
 * @param {number} idx
 * @param {string} src
 */
 showImg(data, idx, src) {
  try {
  if (g.lightbox) {
    // window.dispatchEvent(new CustomEvent('animeReady'))
    const lbox = g.lightbox({selector: null})
    let id = 0
    let i = -1
    for (const v of data) {
      if (v.type === 'img' || v.type === 'video') {
        i++
        if (v.url === src || v._idx === idx) id = i
        lbox.insertSlide({href: v.url})
      }
    }
    // lbox.open()
    lbox.openAt(id)
  }
  } catch (error) {
    log.err(e, 'showImg')
  }
}
/**
 * 添加子项
 * @param {*} wrap
 * @param {string} field
 * @param {string} type
 * @param {string} ext - 后缀
 * @param {string} name - 名称
 * @param {string} abb - 缩写标签
 * @param {string} [url]
 * @param {number} [idx] - 附件数组索引，便于点击连续浏览
 * @param {boolean} [read] -仅读
 */
 addItem(wrap, field, type, ext, name, abb, url, idx, read) {
  let R
  try {
    let el
    if (type === 'img') {
      el = (
        <div class="attach-item" data-idx={idx} data-field={field}>
          <img src={url} alt={abb} title={name} loading="lazy" />
          {abb && <p>{abb}</p>}
            {!read && (
              <div class="attach-delete">
            <i class="icon wiaicon">&#xe9fb;</i>
              </div>
            )}
        </div>
      )
    } else if (type === 'video') {
      ext = ext ?? 'mp4'
      el = (
        <div class="attach-item" data-idx={idx} data-field={field}>
          <video controls preload="none">
            <source src={url} type={`${type}/${ext}`} />
          </video>
          {abb && <p>{abb}</p>}
            {!read && (
              <div class="attach-delete">
            <i class="icon wiaicon">&#xe9fb;</i>
              </div>
            )}
        </div>
      )
    } else if (type === 'doc') {
      const src = this.getThumb(ext)
      el = (
        <div class="attach-item" data-idx={idx} data-field={field}>
          <img src={src} alt={abb} title={name} loading="lazy" />
          {abb && <p>{abb}</p>}
            {!read && (
              <div class="attach-delete">
            <i class="icon wiaicon">&#xe9fb;</i>
              </div>
            )}
        </div>
      )
    }

    if (wrap && el) {
      el = $(el)
      R = el
      const ud = wrap.find('.wia_uploader')
      if (ud.dom) el.insertBefore(ud)
      else el.appendTo(wrap)
    }
  } catch (e) {
    log.err(e, 'addItem')
  }

  return R
}
/**
 * 获取上传文件缩略图标
 * @param {string} ext
 * @param {string} [url]
 * @returns {string}
 */
 getThumb(ext, url) {
  let R
  try {
    ext = `.${ext}`
    if (ext.endsWith('.docx') || ext.endsWith('.docm')) ext = '.doc'
    else if (ext.endsWith('.pptx')) ext = '.ppt'
    else if (ext.endsWith('.xlsx') || ext.endsWith('.xlsm') || ext.endsWith('.xlsb')) ext = '.xls'

    ext = ext.replace(/^\.+/, '.')

    if (/\.(pdf|xls|doc|csv|txt|zip|rar|ppt|avi|mov|mp3)/i.test(ext)) R = `https://cos.wia.pub/wiajs/img/uploader/${ext.substring(1)}.png`
    else R = url ?? 'https://cos.wia.pub/wiajs/img/uploader/raw.png'
  } catch (e) {
    log.err(e, 'getThumb')
  }

  return R
}

  /**
   * 自定义图片上传编辑器
   * @param {Object} cell - 单元格
   * @param {Function} onRendered - 渲染回调
   * @param {Function} success - 成功回调
   * @param {Function} cancel - 取消回调
   * @param {Object} editorParams - 编辑器参数
   * @returns {HTMLElement} 编辑器元素
   */
  imageUploadEditor(cell, onRendered, success, cancel, editorParams) {
    const cellValue = cell.getValue() || []
    const container = document.createElement('div')
    container.className = 'image-upload-editor'

    // 创建上传区域
    const uploadContent = document.createElement('div')
    uploadContent.className = 'upload-content'

    const icon = document.createElement('i')
    icon.className = 'fas fa-cloud-upload-alt'

    const text = document.createElement('span')
    text.textContent = cellValue.length > 0 ? `已上传 ${cellValue.length} 张图片 (点击添加)` : '点击或拖拽上传图片'

    uploadContent.appendChild(icon)
    uploadContent.appendChild(text)

    // 进度条
    const progressBar = document.createElement('div')
    progressBar.className = 'progress-bar'
    const progress = document.createElement('div')
    progress.className = 'progress'
    progressBar.appendChild(progress)

    // 状态文本
    const statusText = document.createElement('div')
    statusText.className = 'status-text'

    // 文件输入
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'image/*'

    // 组装元素
    container.appendChild(uploadContent)
    container.appendChild(progressBar)
    container.appendChild(statusText)
    container.appendChild(input)

    // 点击触发文件选择
    container.addEventListener('click', ev => {
      if (ev.target !== input) {
        input.click()
      }
    })

    // 处理文件选择
    input.addEventListener('change', ev => {
      this.handleFileUpload(ev, cellValue, progress, statusText, success)
    })

    // 拖拽功能
    this.setupDragAndDrop(container, uploadContent, input)

    return container
  }

  /**
   * 处理文件上传
   * @param {*} ev
   * @param {*} cellValue
   * @param {*} progress
   * @param {*} statusText
   * @param {*} success
   * @returns
   */
  handleFileUpload(ev, cellValue, progress, statusText, success) {
    const files = Array.from(ev.target.files)
    if (files.length === 0) return

    // 更新状态
    statusText.textContent = `上传中: 0/${files.length}`
    progress.style.width = '0%'

    const newImages = [...cellValue]
    let uploadedCount = 0

    files.forEach((file, index) => {
      setTimeout(() => {
        const reader = new FileReader()
        reader.onload = e => {
          const imageData = {
            id: Date.now() + index,
            name: file.name,
            size: file.size,
            type: file.type,
            url: e.target.result,
            status: 'uploaded',
          }

          newImages.push(imageData)
          uploadedCount++

          // 更新进度
          const percent = Math.round((uploadedCount / files.length) * 100)
          progress.style.width = `${percent}%`
          statusText.textContent = `上传中: ${uploadedCount}/${files.length}`

          // 全部完成
          if (uploadedCount === files.length) {
            setTimeout(() => {
              success(newImages)
              statusText.textContent = `上传完成! ${files.length}张图片`
            }, 300)
          }
        }
        reader.readAsDataURL(file)
      }, index * 300)
    })
  }

  /**
   * 设置拖拽功能
   */
  setupDragAndDrop(container, uploadContent, input) {
    container.addEventListener('dragover', e => {
      e.preventDefault()
      uploadContent.style.borderColor = '#2ecc71'
      uploadContent.style.backgroundColor = '#e8f5e9'
    })

    container.addEventListener('dragleave', () => {
      uploadContent.style.borderColor = '#3498db'
      uploadContent.style.backgroundColor = ''
    })

    container.addEventListener('drop', ev => {
      ev.preventDefault()
      uploadContent.style.borderColor = '#3498db'
      uploadContent.style.backgroundColor = ''

      if (ev.dataTransfer.files.length > 0) {
        input.files = e.dataTransfer.files
        const event = new Event('change', {bubbles: true})
        input.dispatchEvent(event)
      }
    })
  }

  /**
   * 图片格式化函数
   * @param {Object} cell - 单元格
   * @returns {HTMLElement} 格式化后的元素
   */
  imageFormatter(cell) {
    const images = cell.getValue() || []
    const container = document.createElement('div')
    container.className = 'image-cell'

    images.forEach(img => {
      if (img.url) {
        const imgElement = document.createElement('img')
        imgElement.src = img.url
        imgElement.className = 'thumbnail'
        imgElement.title = img.name || '图片预览'
        container.appendChild(imgElement)
      }
    })

    if (images.length === 0) {
      container.textContent = '无图片'
      container.style.color = '#95a5a6'
      container.style.fontStyle = 'italic'
    }

    return container
  }
}
