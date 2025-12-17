/** @jsxImportSource @wiajs/core */
import {Event} from '@wiajs/core'
import {log as Log} from '@wiajs/util'
import {State} from '../editTable'

const log = Log({m: 'CatAttach'}) // 日志实例

/**
 * @typedef {import('../editTable/index').default} EditTable
 */

/**
 * @typedef {import('jquery')} $
 * @typedef {JQuery} Dom
 */

const g = {
  /** @type {*} */
  lightbox: null,
}

/**
 * 现场图片网格组件
 * @typedef {Object} Opts
 * @prop {string} [container] - 容器选择器或jQuery对象
 * @prop {Object} [data] - 组件数据
 * @prop {string} [projectAbb] - 项目简称
 * @prop {boolean} [isEditMode] - 是否处于编辑状态
 * @prop {{dir:string, url:string, token?:string, header?:Object, data?:Object, withCredentials?:boolean}} [upload] - 上传配置
 */
const def = {
  container: null,
  data: null,
  projectAbb: '',
  isEditMode: false,
}

/**
 * CatAttach 组件类
 */
export default class CatAttach extends Event {
  /**
   * 构造函数
   * @param {Page} page - Page 实例
   * @param {Opts} opts - 配置选项
   */
  constructor(page, opts = {}) {
    super(opts, [page])
    const _ = this

    /** @type {Opts} */
    const opt = {...def, ...opts}
    _.opt = opt
    _.page = page
    _.el = null // DOM元素，稍后初始化
    _.projectAbb = opt.projectAbb || '' // 项目简称
    _.isEditMode = opt.isEditMode || false // 是否处于编辑状态
    _.uploadOpt = opt.upload || null // 上传配置
    _.fileInput = null
    _.fileInputHandler = null
    _.pendingUploadCategory = null

    // 分类数据（动态，从 opt.data.categories 获取，如果没有则使用默认值）
    _.categories = opt.data?.categories || []

    // 分类图片映射，key 为分类名称，value 为附件对象数组（包含 id、url、type 等）
    _.categoryImages = opt.data?.categoryImages || {}

    // 编辑前的状态备份（用于取消时恢复）
    _.backupCategoryImages = null

    // 每个分类的当前图片索引，key 为 categoryId
    _.currentImageIndexes = {}
    // 每个分类的图标状态，key 为 categoryId，false 显示 &#xeba5;，true 显示 &#xea52;
    // 默认为 true（图集模式）
    _.iconStates = {}
    // 初始化所有分类默认为图集模式
    _.categories.forEach(cat => {
      _.iconStates[cat.id] = true
      _.currentImageIndexes[cat.id] = 0
    })

    // 初始化
    _.init()
  }

  /**
   * 初始化组件
   */
  init() {
    const _ = this
    try {
      // 获取容器元素
      if (_.opt.container) {
        if (typeof _.opt.container === 'string') {
          _.el = _.page.view.find(_.opt.container)
        } else {
          _.el = $(_.opt.container)
        }
      } else {
        // 如果没有指定容器，尝试从页面中查找
        _.el = _.page.view.find('[name="catAttachContainer"]')
      }

      if (!_.el || !_.el.dom) {
        log.err('Container not found', 'init')
        return
      }

      // 渲染组件
      _.render()

      // 绑定事件
      _.bind()

      // 初始化上传输入
      _.ensureFileInput()

      log('CatAttach initialized')
    } catch (e) {
      log.err(e, 'init')
    }
  }

  /**
   * 渲染组件
   */
  render() {
    const _ = this

    // 使用 JSX 创建组件 HTML
    // 如果没有分类，显示空状态
    if (!_.categories || _.categories.length === 0) {
      _.el.html('<div class="text-center text-gray-500 py-8">暂无图片数据</div>')
      // 初始化空引用，避免 bind() 中访问 undefined
      _.gridBody = null
      _.items = $()
      _.imageElements = $()
      return
    }

    const html = (
      <div class="grid grid-cols-4 gap-4 px-10">
        {_.categories.map(cat => {
          // 获取当前分类的图片索引，默认为 0
          const currentIndex = _.currentImageIndexes[cat.id] || 0
          const isGridMode = !!_.iconStates[cat.id]
          return (
            <div class="etCatAttach" data-category-id={cat.id}>
              <div class="etCatAttach-header">
                <span class="etCatAttach-title">{_.projectAbb ? `${_.projectAbb}— ${cat.name}` : cat.name}</span>
                <div
                  name="btnToggleIcon"
                  class={`etCatAttach-icon-btn ${_.isEditMode ? 'disabled' : ''}`}
                  data-category-id={cat.id}
                  style={_.isEditMode ? 'cursor: not-allowed; opacity: 0.5;' : ''}>
                  <i class="icon wiaicon">{_.iconStates[cat.id] ? '&#xea52;' : '&#xeba5;'}</i>
                </div>
              </div>
              <div class={`etCatAttach-content ${isGridMode ? 'grid-mode' : 'carousel-mode'}`}>
                {(() => {
                  // 获取当前分类的图片数组
                  const images = _.categoryImages[cat.name] || []
                  const hasImages = images.length > 0

                  return isGridMode ? (
                    hasImages || _.isEditMode ? (
                      <div class="grid grid-cols-3 gap-2" data-category-id={cat.id} style="width: 100%;">
                        {/* 编辑状态下，在第一个位置显示新增按钮 */}
                        {_.isEditMode && (
                          <div class="etCatAttach-add-btn" data-category-id={cat.id}>
                            <i class="icon wiaicon">&#xea63;</i>
                          </div>
                        )}
                        {hasImages &&
                          images.map((img, idx) => {
                            // 兼容字符串 URL 和附件对象两种格式
                            const imgUrl = typeof img === 'string' ? img : img.url
                            const imgId = typeof img === 'object' && img.id ? img.id : null
                            const imgAbb = typeof img === 'object' && img.abb ? img.abb : ''
                            return (
                              <div class="etCatAttach-gallery-item-wrapper" data-category-id={cat.id} data-image-index={idx}>
                                <div
                                  class="etCatAttach-gallery-item"
                                  data-category-id={cat.id}
                                  data-image-index={idx}
                                  data-image-id={imgId || ''}
                                  data-last-clicked={idx === _.currentImageIndexes[cat.id]}>
                                  <img class="w-full h-full object-fill" src={imgUrl} alt={`${cat.name}-${idx + 1}`} />
                                  {/* 编辑状态下，悬停时显示删除按钮 */}
                                  {_.isEditMode && (
                                    <div class="etCatAttach-delete-btn" data-category-id={cat.id} data-image-index={idx} data-image-id={imgId || ''}>
                                      <i class="icon wiaicon">&#xe9fb;</i>
                                    </div>
                                  )}
                                </div>
                                {/* 图片下方的 abb 文字 */}
                                {imgAbb && <p class="etCatAttach-abb-text">{imgAbb}</p>}
                              </div>
                            )
                          })}
                      </div>
                    ) : (
                      <div class="etCatAttach-empty">
                        <i class="icon wiaicon">&#xea53;</i>
                        <span>暂无图片</span>
                      </div>
                    )
                  ) : (
                    <>
                      {/* 左侧切换按钮 */}
                      <button
                        type="button"
                        name="btnPrev"
                        class="etCatAttach-nav-btn etCatAttach-nav-prev"
                        data-category-id={cat.id}
                        disabled={currentIndex === 0 || !hasImages}>
                        <i class="icon wiaicon">&#xe660;</i>
                      </button>

                      {/* 图片显示区域 */}
                      <div class="etCatAttach-image-container-wrapper" data-category-id={cat.id}>
                        <div class="etCatAttach-image-container">
                          {hasImages ? (
                            (() => {
                              const currentImg = images[currentIndex]
                              const imgUrl = typeof currentImg === 'string' ? currentImg : currentImg.url
                              const imgId = typeof currentImg === 'object' && currentImg.id ? currentImg.id : null
                              return (
                                <>
                                  <img src={imgUrl} alt={cat.name} class="etCatAttach-image" data-category-id={cat.id} data-image-id={imgId || ''} />
                                  {/* 编辑状态下，悬停时显示删除按钮 */}
                                  {_.isEditMode && (
                                    <div
                                      class="etCatAttach-delete-btn"
                                      data-category-id={cat.id}
                                      data-image-index={currentIndex}
                                      data-image-id={imgId || ''}>
                                      <i class="icon wiaicon">&#xe9fb;</i>
                                    </div>
                                  )}
                                </>
                              )
                            })()
                          ) : (
                            <div class="etCatAttach-empty">
                              <i class="icon wiaicon">&#xea53;</i>
                              <span>暂无图片</span>
                            </div>
                          )}
                        </div>
                        {/* 图片下方的 abb 文字（轮播模式） */}
                        {hasImages &&
                          images[currentIndex] &&
                          (() => {
                            const currentImg = images[currentIndex]
                            const imgAbb = typeof currentImg === 'object' && currentImg.abb ? currentImg.abb : ''
                            return imgAbb ? <p class="etCatAttach-abb-text">{imgAbb}</p> : null
                          })()}
                      </div>

                      <button
                        type="button"
                        name="btnNext"
                        class="etCatAttach-nav-btn etCatAttach-nav-next"
                        data-category-id={cat.id}
                        disabled={currentIndex >= images.length - 1 || !hasImages}>
                        <i class="icon wiaicon">&#xe65f;</i>
                      </button>
                    </>
                  )
                })()}
              </div>
            </div>
          )
        })}
      </div>
    )

    // 将 HTML 插入到容器中
    _.el.html(html)

    // 保存关键元素的引用
    _.gridBody = null // 已废弃，保留以兼容旧代码
    _.items = _.el.find('.etCatAttach')
    _.imageElements = _.el.find('.etCatAttach-image')
  }

  /**
   * 绑定事件
   */
  bind() {
    const _ = this

    // 如果没有分类数据，不绑定事件
    if (!_.categories || _.categories.length === 0) {
      return
    }

    // 绑定分类项点击事件（如果需要的话）
    if (_.items && _.items.length > 0) {
      _.items.click(ev => {
        const item = $(ev.currentTarget)
        const categoryId = item.data('category-id')

        // 触发选择事件
        _.emit('categorySelect', categoryId)

        log('Category selected', categoryId)
      })
    }

    // 绑定上一张按钮
    _.el.find('[name="btnPrev"]').click(ev => {
      ev.stopPropagation() // 阻止事件冒泡
      const btn = $(ev.currentTarget)
      const categoryId = btn.data('category-id')
      const currentIndex = _.currentImageIndexes[categoryId] || 0

      if (currentIndex > 0) {
        _.currentImageIndexes[categoryId] = currentIndex - 1
        _.updateImageDisplay(categoryId)
        _.updateNavButtons(categoryId)
      }
    })

    // 绑定下一张按钮
    _.el.find('[name="btnNext"]').click(ev => {
      ev.stopPropagation() // 阻止事件冒泡
      const btn = $(ev.currentTarget)
      const categoryId = btn.data('category-id')
      const currentIndex = _.currentImageIndexes[categoryId] || 0
      const cat = _.categories.find(c => c.id === categoryId)
      const images = cat ? _.categoryImages[cat.name] || [] : []

      if (currentIndex < images.length - 1) {
        _.currentImageIndexes[categoryId] = currentIndex + 1
        _.updateImageDisplay(categoryId)
        _.updateNavButtons(categoryId)
      }
    })

    // 初始化所有按钮状态
    _.categories.forEach(cat => {
      _.updateNavButtons(cat.id)
    })

    // 绑定图标切换按钮
    _.el.find('[name="btnToggleIcon"]').click(ev => {
      ev.stopPropagation() // 阻止事件冒泡

      // 编辑状态下不允许切换
      if (_.isEditMode) {
        return
      }

      const btn = $(ev.currentTarget)
      const categoryId = btn.data('category-id')

      // 如果从网格模式切换到图片模式，且当前索引为0，尝试从点击的图片元素获取索引
      const isSwitchingToImageMode = !!_.iconStates[categoryId] // 当前是网格模式
      if (isSwitchingToImageMode) {
        // 查找最近点击的图片项，如果有的话
        const lastClicked = _.el.find(`[data-category-id="${categoryId}"][data-image-index].last-clicked`)
        if (lastClicked.length > 0) {
          const imageIndex = lastClicked.data('image-index')
          if (imageIndex !== undefined) {
            _.currentImageIndexes[categoryId] = imageIndex
          }
        }
      }

      // 切换图标状态
      _.iconStates[categoryId] = !_.iconStates[categoryId]

      // 重新渲染组件以应用不同样式/功能
      _.render()
      _.bind()
    })

    // 绑定单个图片模式下的图片点击事件
    _.el.find('.etCatAttach-image').click(async ev => {
      ev.stopPropagation() // 阻止事件冒泡
      const img = $(ev.currentTarget)
      const categoryId = img.data('category-id')
      const currentIndex = _.currentImageIndexes[categoryId] || 0

      // 点击图片总是触发放大，与按钮状态无关
      await _.showLightbox(categoryId, currentIndex)
    })

    // 绑定图集模式下的缩略图点击事件
    _.el.find('.etCatAttach-gallery-item').click(async ev => {
      ev.stopPropagation() // 阻止事件冒泡
      const item = $(ev.currentTarget)
      const categoryId = item.data('category-id')
      const imageIndex = item.data('image-index')

      // 更新当前图片索引，这样切换到图片模式时会显示正确的图片
      _.currentImageIndexes[categoryId] = imageIndex

      // 标记这个图片项为最近点击的，用于切换到图片模式时同步索引
      _.el.find(`[data-category-id="${categoryId}"].last-clicked`).removeClass('last-clicked')
      item.addClass('last-clicked')

      // 使用 glightbox 打开图片
      await _.showLightbox(categoryId, imageIndex)
    })

    // 绑定新增按钮
    _.el.find('.etCatAttach-add-btn').click(ev => {
      ev.stopPropagation()
      if (!_.isEditMode) return
      const btn = $(ev.currentTarget)
      const categoryId = btn.data('category-id')
      _.openFileChooser(categoryId)
    })

    // 绑定删除按钮（点击图片右上角的叉叉）
    _.el.find('.etCatAttach-delete-btn').click(ev => {
      ev.stopPropagation()
      ev.preventDefault()
      if (!_.isEditMode) return

      const btn = $(ev.currentTarget)
      const categoryId = btn.data('category-id')
      const imageIndex = btn.data('image-index')
      const imageId = btn.data('image-id')

      // 获取分类信息
      const cat = _.categories.find(c => c.id === categoryId)
      if (!cat) return

      // 从数组中移除图片（只移除DOM，不调用接口）
      const images = _.categoryImages[cat.name] || []
      if (imageIndex >= 0 && imageIndex < images.length) {
        // 从数组中移除
        images.splice(imageIndex, 1)
        _.categoryImages[cat.name] = images

        // 如果删除的是当前显示的图片，调整索引
        if (_.currentImageIndexes[categoryId] >= images.length) {
          _.currentImageIndexes[categoryId] = Math.max(0, images.length - 1)
        }

        // 重新渲染（只重新渲染该分类）
        _.render()
        _.bind()
        // 更新 editTable 的隐藏 input
        _._updateEditTableInput()
      }
    })
  }

  /**
   * 更新图片显示（包括图片和底部文字）
   * @param {number} categoryId - 分类ID
   */
  updateImageDisplay(categoryId) {
    const _ = this
    if (_.iconStates[categoryId]) return // 如果是网格模式，不需要更新
    const currentIndex = _.currentImageIndexes[categoryId] || 0
    const cat = _.categories.find(c => c.id === categoryId)
    const images = cat ? _.categoryImages[cat.name] || [] : []
    const currentImage = images[currentIndex]
    if (currentImage) {
      // 兼容字符串 URL 和附件对象两种格式
      const imgUrl = typeof currentImage === 'string' ? currentImage : currentImage.url
      // 更新图片
      _.el.find(`.etCatAttach-image[data-category-id="${categoryId}"]`).attr('src', imgUrl)

      // 更新底部文字（abb）
      const imgAbb = typeof currentImage === 'object' && currentImage.abb ? currentImage.abb : ''
      const wrapper = _.el.find(`.etCatAttach-image-container-wrapper[data-category-id="${categoryId}"]`)
      const abbTextElement = wrapper.find('.etCatAttach-abb-text')
      if (abbTextElement.length > 0) {
        if (imgAbb) {
          abbTextElement.text(imgAbb)
          abbTextElement.show()
        } else {
          abbTextElement.hide()
        }
      }

      // 更新删除按钮的 data-image-index 和 data-image-id
      const imgId = typeof currentImage === 'object' && currentImage.id ? currentImage.id : null
      const deleteBtn = wrapper.find('.etCatAttach-delete-btn')
      if (deleteBtn.length > 0) {
        deleteBtn.attr('data-image-index', currentIndex)
        if (imgId) {
          deleteBtn.attr('data-image-id', imgId)
        }
      }
    }
  }

  /**
   * 更新导航按钮状态
   * @param {number} categoryId - 分类ID
   */
  updateNavButtons(categoryId) {
    const _ = this
    if (_.iconStates[categoryId]) return
    const currentIndex = _.currentImageIndexes[categoryId] || 0
    const cat = _.categories.find(c => c.id === categoryId)
    const images = cat ? _.categoryImages[cat.name] || [] : []

    // 只更新指定分类的按钮
    const prevBtn = _.el.find(`[name="btnPrev"][data-category-id="${categoryId}"]`)
    const nextBtn = _.el.find(`[name="btnNext"][data-category-id="${categoryId}"]`)

    // 更新上一张按钮
    if (currentIndex === 0 || images.length === 0) {
      prevBtn.prop('disabled', true).addClass('disabled')
    } else {
      prevBtn.prop('disabled', false).removeClass('disabled')
    }

    // 更新下一张按钮
    if (currentIndex >= images.length - 1 || images.length === 0) {
      nextBtn.prop('disabled', true).addClass('disabled')
    } else {
      nextBtn.prop('disabled', false).removeClass('disabled')
    }
  }

  /**
   * 使用 lightbox 显示图片
   * @param {number} categoryId - 分类ID
   * @param {number} startIndex - 起始图片索引
   */
  async showLightbox(categoryId, startIndex = 0) {
    const _ = this
    try {
      // 动态导入 glightbox
      if (!g.lightbox) {
        // @ts-expect-error
        const m = await import('https://cos.wia.pub/wiajs/glightbox.mjs')
        g.lightbox = m.default
      }

      // 获取当前分类的图片数组
      const cat = _.categories.find(c => c.id === categoryId)
      const images = cat ? _.categoryImages[cat.name] || [] : []

      if (!g.lightbox || !images || images.length === 0) {
        log.err('Lightbox not available or no images', 'showLightbox')
        return
      }

      // 创建 lightbox 实例
      const lbox = g.lightbox({selector: null})

      // 添加当前分类的所有图片到 lightbox（兼容字符串 URL 和附件对象两种格式）
      images.forEach(img => {
        const imgUrl = typeof img === 'string' ? img : img.url
        lbox.insertSlide({href: imgUrl})
      })

      // 打开 lightbox 并定位到指定图片
      lbox.openAt(startIndex)

      log('Lightbox opened', {categoryId, startIndex})
    } catch (e) {
      log.err(e, 'showLightbox')
    }
  }

  /**
   * 将所有卡片设置为图集模式
   */
  setAllToGridMode() {
    const _ = this
    // 将所有分类设置为图集模式（true）
    _.categories.forEach(cat => {
      _.iconStates[cat.id] = true
    })
    _.render()
    _.bind()
  }

  /**
   * 更新项目简称
   * @param {string} projectAbb - 项目简称
   */
  updateProjectAbb(projectAbb) {
    const _ = this
    _.projectAbb = projectAbb || ''
    _.render()
    _.bind()
  }

  /**
   * 设置编辑状态
   * @param {boolean} isEditMode - 是否处于编辑状态
   */
  setEditMode(isEditMode) {
    const _ = this
    if (isEditMode && !_.isEditMode) {
      // 进入编辑模式时，保存当前状态作为备份
      _.backupCategoryImages = JSON.parse(JSON.stringify(_.categoryImages))
    } else if (!isEditMode && _.isEditMode) {
      // 退出编辑模式时，如果是取消操作，会调用 cancel() 方法恢复状态
      // 这里只是切换状态，不恢复数据
    }
    _.isEditMode = isEditMode || false
    _.render()
    _.bind()
  }

  /**
   * 取消编辑，恢复到编辑前的状态
   * 移除新增的图片，恢复被删除的图片
   */
  cancel() {
    const _ = this
    if (_.backupCategoryImages) {
      // 恢复到编辑前的状态
      _.categoryImages = JSON.parse(JSON.stringify(_.backupCategoryImages))
      _.backupCategoryImages = null
      // 重新渲染
      _.render()
      _.bind()
    }
  }

  /**
   * 清除备份状态（保存成功后调用）
   */
  clearBackup() {
    const _ = this
    _.backupCategoryImages = null
  }

  /**
   * 更新组件数据
   * @param {Object} data - 新数据
   */
  update(data) {
    const _ = this
    if (data) {
      if (data.categories) {
        _.categories = data.categories
        // 重新初始化图标状态和索引
        _.categories.forEach(cat => {
          if (_.iconStates[cat.id] === undefined) {
            _.iconStates[cat.id] = true
          }
          if (_.currentImageIndexes[cat.id] === undefined) {
            _.currentImageIndexes[cat.id] = 0
          }
        })
      }
      if (data.categoryImages) {
        _.categoryImages = data.categoryImages
      }
      _.render()
      _.bind()
    }
  }

  /**
   * 销毁组件
   */
  destroy() {
    const _ = this
    if (_.el) {
      _.el.off() // 移除所有事件监听
      _.el.html('') // 清空内容
    }
    if (_.fileInput && _.fileInput.parentNode) {
      _.fileInput.removeEventListener('change', _.fileInputHandler)
      _.fileInput.parentNode.removeChild(_.fileInput)
    }
    log('CatAttach destroyed')
  }

  /**
   * 初始化隐藏的文件输入
   */
  ensureFileInput() {
    const _ = this
    if (_.fileInput || typeof document === 'undefined') return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.style.display = 'none'
    _.fileInputHandler = ev => _.handleFileInputChange(ev)
    input.addEventListener('change', _.fileInputHandler)
    document.body.appendChild(input)
    _.fileInput = input
  }

  /**
   * 打开文件选择
   * @param {number} categoryId
   */
  openFileChooser(categoryId) {
    const _ = this
    if (!_.uploadOpt || !_.uploadOpt.url) {
      log.err('Upload config missing', 'openFileChooser')
      return
    }
    _.pendingUploadCategory = categoryId
    _.ensureFileInput()
    if (_.fileInput) {
      _.fileInput.value = ''
      _.fileInput.click()
    }
  }

  /**
   * 处理文件选择
   * @param {Event & {target: HTMLInputElement}} ev
   */
  async handleFileInputChange(ev) {
    const _ = this
    try {
      /** @type {HTMLInputElement|null} */
      const inputEl = ev?.target || null
      const files = inputEl?.files
      if (!files || !files.length || !_.pendingUploadCategory) return
      const category = _.categories.find(c => c.id === _.pendingUploadCategory)
      if (!category) return

      // 先获取当前图片数量，作为起始序号
      const existingImages = _.categoryImages[category.name] || []
      const baseSeq = existingImages.length

      const uploadedAttachments = []
      // 依次上传，每个文件使用递增的序号
      for (let index = 0; index < files.length; index++) {
        const file = files[index]
        if (!file) continue
        const seq = baseSeq + index + 1 // 计算当前文件的序号
        const attachment = await _.uploadSingleFile(category, file, seq)
        if (attachment) uploadedAttachments.push(attachment)
      }

      if (uploadedAttachments.length) {
        _.prependImages(category.name, uploadedAttachments)
        _.render()
        _.bind()
        // 更新 editTable 的隐藏 input
        _._updateEditTableInput()
      }
    } catch (error) {
      log.err(error, 'handleFileInputChange')
    } finally {
      const inputEl = /** @type {HTMLInputElement|null} */ (ev?.target || null)
      if (inputEl) inputEl.value = ''
      _.pendingUploadCategory = null
    }
  }

  /**
   * 上传单个文件
   * @param {{id:number, name:string}} category
   * @param {File} file
   * @param {number} [seq] - 可选的序号，用于覆盖默认计算的序号（批量上传时使用）
   * @returns {Promise<{id:number|null, url:string, type:string, cat:string, abb:string}|null>} 返回附件对象
   */
  async uploadSingleFile(category, file, seq = null) {
    const _ = this
    if (!_.uploadOpt?.url || !_.uploadOpt?.dir) {
      log.err('Invalid upload config', 'uploadSingleFile')
      return null
    }
    try {
      const formData = new FormData()
      formData.append(_.uploadOpt.dir, file, file.name)

      // 如果传入了 seq，使用传入的序号；否则计算当前序号
      let finalSeq
      if (seq !== null) {
        finalSeq = seq
      } else {
        const images = _.categoryImages[category.name] || []
        finalSeq = images.length + 1
      }

      formData.append('cat', category.name)
      formData.append('abb', `${category.name}${finalSeq}`)

      if (_.uploadOpt.data) {
        Object.entries(_.uploadOpt.data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) formData.append(key, value)
        })
      }

      const headers = new Headers()
      if (_.uploadOpt.header) {
        Object.entries(_.uploadOpt.header).forEach(([key, value]) => {
          if (value !== undefined && value !== null) headers.append(key, `${value}`)
        })
      }
      if (_.uploadOpt.token && $.store?.get) {
        const tokenValue = $.store.get(_.uploadOpt.token)
        if (tokenValue) headers.append('x-wia-token', `${tokenValue}`)
      }

      /** @type {RequestInit} */
      const fetchOpt = {
        method: 'POST',
        body: formData,
        headers,
      }
      if (_.uploadOpt.withCredentials) {
        fetchOpt.credentials = 'include'
      }

      const response = await fetch(_.uploadOpt.url, fetchOpt)
      if (!response.ok) throw new Error(`上传失败 (${response.status})`)
      const result = await response.json()
      if (result?.code !== 200 || !result?.data) throw new Error('上传失败')
      const dataKeys = Object.keys(result.data)
      if (!dataKeys.length) throw new Error('上传结果为空')
      const key = result.data[file.name] ? file.name : dataKeys[0]
      const fileInfo = result.data[key]
      let url = fileInfo?.url || ''
      if (!url && fileInfo?.host && fileInfo?.dir && fileInfo?.file) {
        const host = fileInfo.host.replace(/\/$/, '')
        const dir = fileInfo.dir.replace(/(^\/|\/$)/g, '')
        url = `${host}/${dir}/${fileInfo.file}`
      }
      if (!url) throw new Error('未获取到文件地址')

      // 返回附件对象（包含 id、url、type 等），如果没有 id 则返回 url
      return {
        id: fileInfo?.id || null,
        url: url,
        type: 'img',
        cat: category.name,
        abb: `${category.name}${finalSeq}`,
      }
    } catch (error) {
      log.err(error, 'uploadSingleFile')
      return null
    }
  }

  /**
   * 将上传成功的图片加入分类列表
   * @param {string} categoryName
   * @param {(string|{id:number|null, url:string, type?:string, cat?:string, abb?:string})[]} attachments - URL 字符串或附件对象数组
   */
  prependImages(categoryName, attachments) {
    const _ = this
    if (!attachments || !attachments.length) return
    const existing = _.categoryImages[categoryName] || []
    _.categoryImages[categoryName] = [...attachments, ...existing]
  }

  /**
   * 获取所有图片的 ID 数组（用于保存时传给接口）
   * 包括原有的图片和新增上传的图片（上传接口已返回 id）
   * 不包括已删除的图片（点击删除按钮后，图片已从 categoryImages 中移除）
   * @returns {number[]} 图片 ID 数组
   */
  getImageIds() {
    const _ = this
    const imageIds = []

    // 遍历所有分类的图片
    for (const cat of _.categories) {
      const images = _.categoryImages[cat.name] || []
      for (const img of images) {
        // 如果是附件对象且有 id，则添加 id
        // 上传成功后，uploadSingleFile 返回的附件对象中包含 id（如果上传接口返回了 id）
        if (typeof img === 'object' && img.id) {
          imageIds.push(img.id)
        }
        // 如果是字符串 URL（旧数据格式兼容），则跳过
        // 正常情况下，上传接口应该返回 id，所以新增的图片也会有 id
      }
    }

    return imageIds
  }

  /**
   * 更新 editTable 的隐藏 input 元素的值
   * 用于与 editTable 的 attach 机制集成
   */
  _updateEditTableInput() {
    const _ = this
    if (!_._editTableInputDom) {
      log('_updateEditTableInput: _editTableInputDom is null', '_updateEditTableInput')
      return
    }

    // 获取当前所有图片的附件对象（包含 id、url、type、cat 等）
    const currentAttachments = []
    for (const cat of _.categories) {
      const images = _.categoryImages[cat.name] || []
      for (const img of images) {
        if (typeof img === 'object' && img.id) {
          currentAttachments.push({
            id: img.id,
            url: img.url || '',
            type: img.type || 'img',
            cat: img.cat || cat.name,
          })
        }
      }
    }

    // 计算新增的附件（当前有但原始没有的）
    const currentIds = currentAttachments.map(a => a.id)
    const originalIds = _._originalAttachments || []
    const newAttachments = currentAttachments.filter(a => !originalIds.includes(a.id))

    // 计算删除的附件索引（原始有但当前没有的）
    const deletedIds = originalIds.filter(id => !currentIds.includes(id))
    const input = _._editTableInputDom
    // @ts-expect-error
    if (!input._del) {
      // @ts-expect-error
      input._del = new Set()
    }
    // 清空之前的删除记录，重新计算
    // @ts-expect-error
    input._del.clear()
    // 将删除的 ID 转换为原始 value 数组中的索引
    // 注意：getCellVal 中的 value[i] 是原始附件数组中的元素，所以索引必须是原始 value 数组的索引
    if (_._originalValueArray && deletedIds.length > 0) {
      deletedIds.forEach(deletedId => {
        const index = _._originalValueArray.findIndex(v => v.id === deletedId)
        if (index >= 0) {
          // @ts-expect-error
          input._del.add(index)
        }
      })
    }

    // 更新 input 的值（新增的附件数组，JSON 格式）
    input.value = JSON.stringify(newAttachments)

    // 确保 _del 被正确设置（双重保险）
    if (!input._del || !(input._del instanceof Set)) {
      input._del = new Set()
    }

    // 标记 td 为已修改（如果确实有变化）
    const $td = _._editTableInput.closest('td')
    if ($td && $td.length > 0) {
      if (newAttachments.length > 0 || input._del.size > 0) {
        $td.addClass('etChange')
      } else {
        $td.removeClass('etChange')
      }
    }

    log({newAttachments: newAttachments.length, deletedCount: deletedIds.length, _delSize: input._del?.size}, '_updateEditTableInput')
  }

  /**
   * @param {EditTable} _ - 组件实例
   * @param {*} c - 列
   * @param {{_idx: number, id: number, cat:string, name:string,abb:string, url:string, status?:string, type:string, ext?:string}[]} value - 数据卡 值，对象数组
   * @param {*} tr - 行元素
   * @param {string[]} cats - 分类名称数组（字符串数组）
   * @param {number} [colSpan] - 列跨度
   * @param {number} [idx] - Kv编辑数据索引或表格编辑字段索引
   */
  static fillAttach(_, c, value, tr, cats, colSpan, idx) {
    try {
      const {opt} = _

      // 使用 CatAttach 插件渲染
      const td = document.createElement('td')
      // 添加标记属性，用于后续检查是否已渲染
      td.setAttribute('catAttachField', c.field)
      // 添加样式类，确保内容正常显示
      td.className = 'etCatAttach-td'
      td.colSpan = colSpan
      const $td = $(td)
      // 设置 data-idx 和 data-idy，用于 getCellVal 识别字段
      $td.data('idx', idx) // 字段索引（kv 模式下是数据索引）
      $td.data('idy', 0) // 数据行索引（kv 模式下为 0）
      // 设置 td 样式，确保内容区域正常显示
      $td.css({
        padding: '0',
        verticalAlign: 'top',
      })

      // 构建分类数据
      // @ts-expect-error
      const categories = cats.map((catName, id) => ({
        id: id + 1,
        name: catName,
        icon: '&#xe7af;',
      }))

      // 按分类组织图片
      const categoryImages = {}
      cats.forEach(catName => {
        categoryImages[catName] = (value || []).filter(v => v.cat === catName && (v.type === 'img' || v.type === 'video'))
      })

      // 获取项目简称（如果有的话）
      let projectAbb = ''
      // 尝试从数据中获取项目简称
      const abbField = _.data.find(d => d.field === 'abb' || d.name === '项目简称')
      if (abbField) {
        projectAbb = abbField.value || ''
      }

      // 调用插件的渲染方法
      const catAttach = CatAttach.renderInEditTable(_.page, {
        container: $td,
        data: {
          categories,
          categoryImages,
        },
        projectAbb,
        isEditMode: _.state === State.edit, // 使用 editTable 的 state 来判断编辑状态
        upload: opt.upload,
        field: c.field,
        idx: idx,
      })

      // 保存实例引用到 td，以便后续编辑/查看模式切换时调用
      $td.data('catAttach', catAttach)

      tr.append(td)
    } catch (e) {
      log.err(e, 'fillAttach')
    }
  }

  /**
   * 静态方法：在 editTable 的 td 中渲染 CatAttach
   * @param {*} page - Page 实例
   * @param {Object} opts - 配置选项
   * @param {*} opts.container - 容器 jQuery 对象（td）
   * @param {Object} opts.data - 组件数据
   * @param {string} opts.projectAbb - 项目简称
   * @param {boolean} opts.isEditMode - 是否处于编辑状态
   * @param {Object} opts.upload - 上传配置
   * @param {string} opts.field - 字段名
   * @param {number} opts.idx - 数据索引
   * @returns {CatAttach} CatAttach 实例
   */
  static renderInEditTable(page, opts = {}) {
    const {container, data, projectAbb, isEditMode, upload, field, idx, originalValue} = opts

    // 创建 CatAttach 实例
    // @ts-expect-error
    const instance = new CatAttach(page, {
      container: container,
      data: data || {categories: [], categoryImages: {}},
      projectAbb: projectAbb || '',
      isEditMode: isEditMode || false,
      upload: upload,
    })

    // 保存字段信息，用于后续数据更新
    instance._editTableField = field
    instance._editTableIdx = idx

    // 保存原始数据，用于计算新增和删除的附件
    instance._originalAttachments = [] // 原始附件 ID 数组
    // 使用传入的 originalValue（原始附件数组），如果没有则从 categoryImages 构建
    instance._originalValueArray = originalValue && Array.isArray(originalValue) ? originalValue : []
    if (!instance._originalValueArray.length && data && data.categoryImages) {
      // 如果没有传入 originalValue，从 categoryImages 构建
      for (const catName in data.categoryImages) {
        const images = data.categoryImages[catName] || []
        for (const img of images) {
          if (typeof img === 'object' && img.id) {
            instance._originalValueArray.push(img)
          }
        }
      }
    }
    // 从 _originalValueArray 提取 ID
    instance._originalAttachments = instance._originalValueArray.map(v => v.id)

    // 注意：input 必须在 render() 之后添加，因为构造函数会调用 init()，而 init() 会调用 render()
    // render() 会通过 _.el.html(html) 清空 container，所以在此之前添加的 input 会被删除

    // 先删除可能存在的旧 input（attach.js 创建的，有 _addVal class）
    const existingInput = container.find(`input[name="${field}-attach-add"]`)
    if (existingInput.length > 0) {
      existingInput.remove()
    }

    // 创建隐藏的 input 元素，用于与 editTable 的 attach 机制集成
    // 注意：name 需要使用 -attach-add 后缀，这样 getCellVal 才能正确识别并去掉后缀
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = `${field}-attach-add` // 使用 -attach-add 后缀，与 attach.js 保持一致
    input.value = '[]' // 初始值为空数组的 JSON
    // @ts-expect-error
    input._del = new Set() // 用于存储被删除的附件索引（直接设置在原生 DOM 元素上）

    // 关键：使用原生 DOM 方法直接添加到 td，而不是通过 jQuery
    // 这样可以确保 input 是 td 的直接子元素
    const tdElement = container[0] // 获取原生 DOM 元素
    if (tdElement) {
      tdElement.appendChild(input) // 使用原生方法添加
    } else {
      // 如果获取不到原生元素，回退到 jQuery 方法
      container.append(input)
    }

    instance._editTableInput = $(input)
    // @ts-expect-error
    instance._editTableInputDom = input // 保存原生 DOM 引用，用于直接访问 _del

    // 初始化时更新 input 的值
    instance._updateEditTableInput()

    return instance
  }
}
