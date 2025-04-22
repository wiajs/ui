import {Utils, Event} from '@wiajs/core';

const def = {
  selector: '.messages',
  top: false,
  topOffset: 0,
  bottomOffset: 0,
  attachments: [],
  renderAttachments: undefined,
  renderAttachment: undefined,
  maxHeight: null,
  resizePage: true,
};

export default class Messagebar extends Event {
  constructor(page, opt = {}) {
    super(opt, [page]);

    const m = this;

    m.params = {...def, ...opt};

    // El
    const $el = opt.el || page.view.find(def.selector);
    if ($el.length === 0) return m;

    m.$el = $el;
    m.el = $el[0];

    if (m.el.wiaMessagebar) return m.el.wiaMessagebar;

    m.el.wiaMessagebar = m;

    // Page and PageContent
    const $pageEl = $el.parents('.page').eq(0);
    const $pageContentEl = $pageEl.find('.page-content').eq(0);

    // Area
    const $areaEl = $el.find('.messagebar-area');

    // Textarea
    let $textareaEl;
    if (m.params.textareaEl) {
      $textareaEl = $(m.params.textareaEl);
    } else {
      $textareaEl = $el.find('textarea');
    }

    // Attachments & Library
    const $attachmentsEl = $el.find('.messagebar-attachments');
    const $sheetEl = $el.find('.messagebar-sheet');

    if (m.params.top) {
      $el.addClass('messagebar-top');
    }

    Utils.extend(m, {
      $el,
      el: $el[0],
      $areaEl,
      areaEl: $areaEl[0],
      $textareaEl,
      textareaEl: $textareaEl[0],
      $attachmentsEl,
      attachmentsEl: $attachmentsEl[0],
      attachmentsVisible: $attachmentsEl.hasClass('messagebar-attachments-visible'),
      $sheetEl,
      sheetEl: $sheetEl[0],
      sheetVisible: $sheetEl.hasClass('messagebar-sheet-visible'),
      $pageEl,
      pageEl: $pageEl[0],
      $pageContentEl,
      pageContentEl: $pageContentEl,
      top: $el.hasClass('messagebar-top') || m.params.top,
      attachments: [],
    });

    // Events
    function onAppResize() {
      if (m.params.resizePage) {
        m.resizePage();
      }
    }
    function onSubmit(e) {
      e.preventDefault();
    }
    function onAttachmentClick(e) {
      const index = $(this).index();
      if ($(e.target).closest('.messagebar-attachment-delete').length) {
        $(this).trigger('messagebar:attachmentdelete', index);
        m.emit('local::attachmentDelete messagebarAttachmentDelete', m, this, index);
      } else {
        $(this).trigger('messagebar:attachmentclick', index);
        m.emit('local::attachmentClick messagebarAttachmentClick', m, this, index);
      }
    }
    function onTextareaChange() {
      m.checkEmptyState();
      m.$el.trigger('messagebar:change');
      m.emit('local::change messagebarChange', m);
    }
    function onTextareaFocus() {
      m.sheetHide();
      m.$el.addClass('messagebar-focused');
      m.$el.trigger('messagebar:focus');
      m.emit('local::focus messagebarFocus', m);
    }
    function onTextareaBlur() {
      m.$el.removeClass('messagebar-focused');
      m.$el.trigger('messagebar:blur');
      m.emit('local::blur messagebarBlur', m);
    }

    m.attachEvents = function () {
      $el.on('textarea:resize', onAppResize);
      $el.on('submit', onSubmit);
      $el.on('click', '.messagebar-attachment', onAttachmentClick);
      $textareaEl.on('change input', onTextareaChange);
      $textareaEl.on('focus', onTextareaFocus);
      $textareaEl.on('blur', onTextareaBlur);
      page.on('resize', onAppResize);
    };
    m.detachEvents = function () {
      $el.off('textarea:resize', onAppResize);
      $el.off('submit', onSubmit);
      $el.off('click', '.messagebar-attachment', onAttachmentClick);
      $textareaEl.off('change input', onTextareaChange);
      $textareaEl.off('focus', onTextareaFocus);
      $textareaEl.off('blur', onTextareaBlur);
      page.off('resize', onAppResize);
    };

    // Init
    m.init();
  }

  focus() {
    const m = this;
    m.$textareaEl.focus();
    return m;
  }

  blur() {
    const m = this;
    m.$textareaEl.blur();
    return m;
  }

  clear() {
    const m = this;
    m.$textareaEl.val('').trigger('change');
    return m;
  }

  getValue() {
    const m = this;
    return m.$textareaEl.val().trim();
  }

  setValue(value) {
    const m = this;
    m.$textareaEl.val(value).trigger('change');
    return m;
  }

  setPlaceholder(placeholder) {
    const m = this;
    m.$textareaEl.attr('placeholder', placeholder);
    return m;
  }

  resizePage() {
    const m = this;
    const {
      params,
      $el,
      top,
      $pageEl,
      $pageContentEl,
      $areaEl,
      $textareaEl,
      $sheetEl,
      $attachmentsEl,
    } = m;
    const elHeight = $el[0].offsetHeight;
    let {maxHeight} = {params};
    if (top) {
      /*
      Disable at the moment
      const requiredPaddingTop = elHeight + params.topOffset;
      const currentPaddingTop = parseInt($pageContentEl.css('padding-top'), 10);
      if (requiredPaddingTop !== currentPaddingTop) {
        if (!maxHeight) {
          maxHeight = $pageEl[0].offsetHeight - currentPaddingTop - $sheetEl.outerHeight() - $attachmentsEl.outerHeight() - parseInt($areaEl.css('margin-top'), 10) - parseInt($areaEl.css('margin-bottom'), 10);
        }
        $textareaEl.css('max-height', `${maxHeight}px`);
        $pageContentEl.css('padding-top', `${requiredPaddingTop}px`);
        $el.trigger('messagebar:resizePage');
        messagebar.emit('local::resizepage messagebarResizePage');
      }
      */
    } else {
      const currentPaddingBottom = parseInt($pageContentEl.css('padding-bottom'), 10);
      const requiredPaddingBottom = elHeight + params.bottomOffset;
      if (requiredPaddingBottom !== currentPaddingBottom && $pageContentEl.length) {
        const currentPaddingTop = parseInt($pageContentEl.css('padding-top'), 10);
        const pageScrollHeight = $pageContentEl[0].scrollHeight;
        const pageOffsetHeight = $pageContentEl[0].offsetHeight;
        const pageScrollTop = $pageContentEl[0].scrollTop;
        const scrollOnBottom = pageScrollTop === pageScrollHeight - pageOffsetHeight;
        if (!maxHeight) {
          maxHeight =
            $pageEl[0].offsetHeight -
            currentPaddingTop -
            $sheetEl.outerHeight() -
            $attachmentsEl.outerHeight() -
            parseInt($areaEl.css('margin-top'), 10) -
            parseInt($areaEl.css('margin-bottom'), 10);
        }
        $textareaEl.css('max-height', `${maxHeight}px`);
        $pageContentEl.css('padding-bottom', `${requiredPaddingBottom}px`);
        if (scrollOnBottom) {
          $pageContentEl.scrollTop($pageContentEl[0].scrollHeight - pageOffsetHeight);
        }
        $el.trigger('messagebar:resizepage');
        m.emit('local::resizePage messagebarResizePage', m);
      }
    }
  }

  checkEmptyState() {
    const m = this;
    const {$el, $textareaEl} = m;
    const value = $textareaEl.val().trim();
    if (value && value.length) {
      $el.addClass('messagebar-with-value');
    } else {
      $el.removeClass('messagebar-with-value');
    }
  }

  attachmentsCreate(innerHTML = '') {
    const m = this;
    const $attachmentsEl = $(`<div class="messagebar-attachments">${innerHTML}</div>`);
    $attachmentsEl.insertBefore(m.$textareaEl);
    Utils.extend(m, {
      $attachmentsEl,
      attachmentsEl: $attachmentsEl[0],
    });
    return m;
  }

  attachmentsShow(innerHTML = '') {
    const m = this;
    m.$attachmentsEl = m.$el.find('.messagebar-attachments');
    if (m.$attachmentsEl.length === 0) {
      m.attachmentsCreate(innerHTML);
    }
    m.$el.addClass('messagebar-attachments-visible');
    m.attachmentsVisible = true;
    if (m.params.resizePage) {
      m.resizePage();
    }
    return m;
  }

  attachmentsHide() {
    const m = this;
    m.$el.removeClass('messagebar-attachments-visible');
    m.attachmentsVisible = false;
    if (m.params.resizePage) {
      m.resizePage();
    }
    return m;
  }

  attachmentsToggle() {
    const m = this;
    if (m.attachmentsVisible) {
      m.attachmentsHide();
    } else {
      m.attachmentsShow();
    }
    return m;
  }

  renderAttachment(attachment) {
    const m = this;
    if (m.params.renderAttachment) {
      return m.params.renderAttachment.call(m, attachment);
    }
    return `
      <div class="messagebar-attachment">
        <img src="${attachment}">
        <span class="messagebar-attachment-delete"></span>
      </div>
    `;
  }

  renderAttachments() {
    const m = this;
    let html;
    if (m.params.renderAttachments) {
      html = m.params.renderAttachments.call(m, m.attachments);
    } else {
      html = `${m.attachments.map(attachment => m.renderAttachment(attachment)).join('')}`;
    }
    if (m.$attachmentsEl.length === 0) {
      m.attachmentsCreate(html);
    } else {
      m.$attachmentsEl.html(html);
    }
  }

  sheetCreate(innerHTML = '') {
    const m = this;
    const $sheetEl = $(`<div class="messagebar-sheet">${innerHTML}</div>`);
    m.$el.append($sheetEl);
    Utils.extend(m, {
      $sheetEl,
      sheetEl: $sheetEl[0],
    });
    return m;
  }

  sheetShow(innerHTML = '') {
    const m = this;
    m.$sheetEl = m.$el.find('.messagebar-sheet');
    if (m.$sheetEl.length === 0) {
      m.sheetCreate(innerHTML);
    }
    m.$el.addClass('messagebar-sheet-visible');
    m.sheetVisible = true;
    if (m.params.resizePage) {
      m.resizePage();
    }
    return m;
  }

  sheetHide() {
    const m = this;
    m.$el.removeClass('messagebar-sheet-visible');
    m.sheetVisible = false;
    if (m.params.resizePage) {
      m.resizePage();
    }
    return m;
  }

  sheetToggle() {
    const m = this;
    if (m.sheetVisible) {
      m.sheetHide();
    } else {
      m.sheetShow();
    }
    return m;
  }

  init() {
    const m = this;
    m.attachEvents();
    m.checkEmptyState();
    return m;
  }

  destroy() {
    const m = this;
    m.emit('local::beforeDestroy messagebarBeforeDestroy', m);
    m.$el.trigger('messagebar:beforedestroy');
    m.detachEvents();
    if (m.$el[0]) {
      m.$el[0].wiaMessagebar = null;
      delete m.$el[0].wiaMessagebar;
    }
    Utils.deleteProps(m);
  }
}
