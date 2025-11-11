/** @jsxImportSource @wiajs/core */
import {log as Log} from '@wiajs/util'

// 创建日志实例
const log = Log({
  m: 'jsonView',
})

/**
 * @typedef {import('jquery')} $
 * @typedef {JQuery} Dom
 */

export default class JsonView {
  /**
   * 构造函数
   * @param {Object} options 配置项
   * @param {HTMLElement|jQuery} options.parent 父容器元素
   * @param {Object} options.data 初始JSON数据
   * @param {Object} options.source 更新接口信息
   */
  constructor(options) {
    // 初始化配置
    this.parent = options.parent instanceof $ ? options.parent : $(options.parent)
    this.data = options.data || {}
    this.source = options.source
    // 初始化DOM元素引用
    this.$jsonEditor = null
    this.$jsonPreview = null
    this.$treeView = null
    this.$lineCount = null
    this.$charCount = null
    this.$lineNumbers = null
    this.$editorMessage = null

    // 初始化视图
    this.initDOM()
    this.initEvents()
    this.initData()
  }

  /**
   * 初始化DOM结构
   */
  initDOM() {
    try {
      // 创建主容器HTML
      const el = (
        <div class="json-view-box">
          <div style="width:50%">
            <div class="editor-container">
              <div class="line-numbers" id="lineNumbers"></div>
              <textarea style="width:100%" class="editor jsonEditor"></textarea>
            </div>
            <div class="status-bar">
              <span>
                行数: <span class="lineCount">0</span>
              </span>
              <span>
                字符数: <span class="charCount">0</span>
              </span>
            </div>
            <div class="editor-message"></div>
          </div>
          <div class="preview-panel">
            <div class="preview jsonPreview">
              <div class="tree-view treeView"></div>
            </div>
          </div>
        </div>
      )
      // 添加到父容器
      this.parent.append(el)
      // 获取DOM元素引用
      this.$jsonEditor = this.parent.find('.jsonEditor')
      this.$jsonPreview = this.parent.find('.jsonPreview')
      this.$treeView = this.parent.find('.treeView')
      this.$lineCount = this.parent.find('.lineCount')
      this.$charCount = this.parent.find('.charCount')
      this.$lineNumbers = this.parent.find('.line-numbers')
      this.$editorMessage = this.parent.find('.editor-message')
      // 验证关键DOM元素是否存在
      if (!this.$jsonEditor.length) {
        throw new Error('未找到JSON编辑器元素')
      }
    } catch (error) {
      log.err(error, 'initDOM')
    }
  }

  /**
   * 初始化事件绑定
   */
  initEvents() {
    try {
      this.$jsonEditor.on('input', () => this.updateEditorStatus())
      this.$jsonEditor.on('input', () => this.updateLineNumbers())
      this.$jsonEditor.on(
        'input',
        this.debounce(() => this.updatePreview(), 500)
      )

      // 滚动同步事件
      this.$jsonEditor.on('scroll', () => {
        this.$lineNumbers.scrollTop(this.$jsonEditor.scrollTop())
      })
    } catch (error) {
      log.err(error, 'initEvents')
    }
    // 绑定输入事件（使用箭头函数保持this指向）
  }

  /**
   * 初始化数据
   */
  initData() {
    try {
      // 设置初始JSON数据
      this.$jsonEditor.val(JSON.stringify(this.data, null, 2))

      // 初始化状态
      this.updateEditorStatus()
      this.updateLineNumbers()
      this.renderJsonTree(this.data)
      this.formatJson()
    } catch (error) {
      log.err(error, 'initData')
    }
  }

  /**
   * 更新行号
   */
  updateLineNumbers() {
    try {
      const lines = this.$jsonEditor.val().split('\n')
      const lineNumbersHTML = lines.map((_, i) => `<div class="line-number">${i + 1}</div>`).join('')
      this.$lineNumbers.html(lineNumbersHTML)
    } catch (error) {
      log.err(error, 'updateLineNumbers')
    }
  }

  /**
   * 更新编辑器状态（行数、字符数）
   */
  updateEditorStatus() {
    try {
      const text = this.$jsonEditor.val()
      const lines = text.split('\n').length
      const characters = text.length

      this.$lineCount.text(lines)
      this.$charCount.text(characters)
    } catch (error) {
      log.err(error, 'updateEditorStatus')
    }
  }

  /**
   * 格式化JSON
   */
  formatJson() {
    try {
      const jsonValue = JSON.parse(this.$jsonEditor.val())
      this.$jsonEditor.val(JSON.stringify(jsonValue, null, 2))
      this.updateEditorStatus()
      this.updateLineNumbers()
      this.showMessage('JSON已格式化', 'success')
    } catch (error) {
      log.err(error, 'formatJson')
      this.showMessage(`错误: ${error.message}`, 'error')
    }
  }

  /**
   * 显示消息提示
   * @param {string} text 消息文本
   * @param {string} type 消息类型（success/error）
   */
  showMessage(text, type) {
    try {
      if (this.$editorMessage) {
        this.$editorMessage.text(text)
        this.$editorMessage.attr('class', `editor-message ${type}`)
      }
    } catch (error) {
      log.err(error, 'showMessage')
    }
  }

  /**
   * 防抖函数
   * @param {Function} func 目标函数
   * @param {number} delay 延迟时间(ms)
   * @returns {Function} 防抖后的函数
   */
  debounce(func, delay) {
    try {
      let timeoutId
      return (...args) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => func.apply(this, args), delay)
      }
    } catch (error) {
      log.err(error, 'debounce')
      // 失败时返回原函数，避免功能中断
      return func
    }
  }

  /**
   * 更新预览面板
   */
  updatePreview() {
    try {
      const jsonValue = JSON.parse(this.$jsonEditor.val())
      this.renderJsonTree(jsonValue)
      // @ts-expect-error
      this.showMessage('')
    } catch (error) {
      log.err(error, 'updatePreview')
      this.showMessage(`错误: ${error.message}`, 'error')
    }
  }

  /**
   * 渲染JSON树形视图
   * @param {Object} jsonData 需要渲染的JSON数据
   */
  renderJsonTree(jsonData) {
    try {
      this.$treeView.html('')
      // @ts-expect-error
      const tree = this.createTreeElement(jsonData)
      this.$treeView.append(tree)
    } catch (error) {
      log.err(error, 'renderJsonTree')
    }
  }

  /**
   * 创建树形结构元素
   * @param {any} data 数据节点
   * @param {string|null} key 节点键名
   * @returns {HTMLElement} 生成的DOM元素
   */
  createTreeElement(data, key) {
    try {
      const item = document.createElement('div')
      item.className = 'tree-item'

      if (typeof data === 'object' && data !== null) {
        const collapsible = document.createElement('span')
        collapsible.className = 'collapsible'
        collapsible.textContent = key ? `${key}: ` : ''

        const isArray = Array.isArray(data)
        const type = isArray ? 'Array' : 'Object'
        const count = isArray ? data.length : Object.keys(data).length

        const preText = document.createElement('span')
        preText.textContent = `${type} ${isArray ? `[${count}]` : `{${count}}`}`

        collapsible.appendChild(preText)
        item.appendChild(collapsible)

        const children = document.createElement('div')
        children.className = 'children'

        // 遍历子节点
        for (const [childKey, value] of Object.entries(data)) {
          children.appendChild(this.createTreeElement(value, isArray ? null : childKey))
        }

        item.appendChild(children)

        // 绑定展开/折叠事件
        collapsible.addEventListener('click', function () {
          this.classList.toggle('expanded')
        })
      } else {
        const valueSpan = document.createElement('span')
        valueSpan.textContent = key ? `${key}: ` : ''

        const value = document.createElement('span')
        // 根据数据类型添加不同样式
        if (typeof data === 'string') {
          value.className = 'json-string'
          value.textContent = `"${data}"`
        } else if (typeof data === 'number') {
          value.className = 'json-number'
          value.textContent = data
        } else if (typeof data === 'boolean') {
          value.className = 'json-boolean'
          value.textContent = data ? 'true' : 'false'
        } else if (data === null) {
          value.className = 'json-null'
          value.textContent = 'null'
        }

        valueSpan.appendChild(value)
        item.appendChild(valueSpan)
      }

      return item
    } catch (error) {
      log.err(error, 'createTreeElement')
    }
  }

  /**
   * 保存JSON数据（可由外部重写或扩展）
   */
  async saveJson() {
    let R
    try {
      if (this.$jsonEditor.dom) {
        //  验证JSON格式
        const newJson = JSON.parse(this.$jsonEditor.val())

        const _id = newJson._id

        // @ts-expect-error
        const {url} = this.source
        let {token} = this.source
        token = token ?? 'token'

        const tk = token ? $.store.get(token) : ''
        console.log(tk, 'tk')
        const param = {
          id: _id,
          json: newJson,
        }
        // if (param) param.value = inputValue;
        // else param = {
        //     value: inputValue
        // };
        const rs = await $.post(url, param, {
          'x-wia-token': tk,
        })
        console.log(rs, 'rs')
        // // 输入完成后再触发查询
        // if (rs) {
        //     _.data = rs;
        //     const filteredData = _.filter(inputValue);
        //     _.showList(filteredData, inputValue);
        //     _.hideStatus();
        // }
      }
      // 4. 显示保存成功消息
      this.showMessage('JSON数据保存成功', 'success')

      R = true // 保存成功
    } catch (error) {
      // console.log(error,'error')
      // 格式错误，显示错误消息（理论上不会走到这里，因为按钮已禁用）
      this.showMessage(`保存失败：${error.message}`, 'error')
    }

    return R
  }
}
