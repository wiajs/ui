import {DATA_PREVIEW} from './constant'
import {getTransforms} from './util'

export default {
  initPreview() {
    /** @type {*} */
    const _ = this

    const {el, crossOrigin, opt} = _
    const {preview} = opt
    const url = crossOrigin ? _.crossOriginUrl : _.url
    const alt = _.img.alt || 'The image to preview'
    const image = document.createElement('img')

    if (crossOrigin) {
      image.crossOrigin = crossOrigin
    }

    image.src = url
    image.alt = alt
    _.viewBox.append(image)
    _.viewBoxImage = image

    if (!preview) {
      return
    }

    let previews = preview

    if (typeof preview === 'string') {
      previews = el.dom.querySelectorAll(preview)
    } else if (preview.querySelector) {
      previews = [preview]
    }

    _.previews = previews

    $.forEach(previews, n => {
      const $n = $(n)

      // 宽度不变，高度为 0
      $n.css('height', 0)

      const img = document.createElement('img')

      // Save the original size for recover
      // 锁定宽度，宽度有值，高度无值
      $n.data(DATA_PREVIEW, {
        width: n.offsetWidth,
        height: n.offsetHeight,
        html: n.innerHTML,
      })

      if (crossOrigin) {
        img.crossOrigin = crossOrigin
      }

      img.src = url
      img.alt = alt

      /**
       * Override img element styles
       * Add `display:block` to avoid margin top issue
       * Add `height:auto` to override `height` attribute on IE8
       * (Occur only when margin-top <= -height)
       */
      img.style.cssText =
        'display:block;' +
        'width:100%;' +
        'height:auto;' +
        'min-width:0!important;' +
        'min-height:0!important;' +
        'max-width:none!important;' +
        'max-height:none!important;' +
        'image-orientation:0deg!important;"'

      $n.html('')
      $n.append(img)
    })
  },

  resetPreview() {
    $.forEach(this.previews, n => {
      const $n = $(n)
      const data = $n.data(DATA_PREVIEW)

      $n.css({
        width: data.width,
        height: data.height,
      })

      n.innerHTML = data.html
      $n.removeData(DATA_PREVIEW)
    })
  },

  preview() {
    const _ = this
    const {opt} = _

    const {imageData, canvasData, cropBoxData} = _
    const {width: cropBoxWidth, height: cropBoxHeight} = cropBoxData
    const {width, height} = imageData
    const left = cropBoxData.left - canvasData.left - imageData.left
    const top = cropBoxData.top - canvasData.top - imageData.top

    if (!_.cropped || _.disabled) {
      return
    }

    $(_.viewBoxImage).css(
      $.assign(
        {
          width,
          height,
        },
        getTransforms(
          $.assign(
            {
              translateX: -left,
              translateY: -top,
            },
            imageData
          )
        )
      )
    )

    // 根据 preview 宽度，计算高度，缺省宽度 100%
    $.forEach(this.previews, n => {
      const $n = $(n)
      const data = $n.data(DATA_PREVIEW)
      const originalWidth = data.width
      const originalHeight = data.height

      // 宽度不变，高度变，重新计算高度
      let newHeight = originalHeight
      let ratio = 1
      if (cropBoxWidth) {
        ratio = originalWidth / cropBoxWidth // 预览宽度 / 裁剪框宽度
        newHeight = cropBoxHeight * ratio
      }

      // bug：宽度被改变
      // let newWidth = originalWidth
      // if (cropBoxHeight && newHeight > originalHeight) {
      //   ratio = originalHeight / cropBoxHeight
      //   newWidth = cropBoxWidth * ratio
      //   newHeight = originalHeight
      // }
      // $n.css({
      //   width: newWidth,
      //   height: newHeight,
      // })

      // 宽度不变，高度变
      $n.css({
        height: newHeight,
      })

      $n.findNode('img').css(
        $.assign(
          {
            width: width * ratio,
            height: height * ratio,
          },
          getTransforms(
            $.assign(
              {
                translateX: -left * ratio,
                translateY: -top * ratio,
              },
              imageData
            )
          )
        )
      )
    })
  },
}
