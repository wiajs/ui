/**
 * Created by way on 16/6/10.
 */

/**
 * 正则表达式去掉字符串前后不可见字符
 * @returns {string}
 */

/*
 String.prototype.trim = function () {
 return !this ? this : this.replace(/(^\s*)|(\s*$)/g, '');
 }
 */

export const UA = navigator.userAgent;
export const URL = window.URL || window.webkitURL;

export function trim(str) {
  return str.replace(/(^\s*)|(\s*$)/g, '');
}

export function isIE() {
  return document.all;
}

export function isWechat() {
  return ~UA.indexOf('MicroMessenger');
}

export function isAndroid() {
  return ~UA.indexOf('Android');
}

export function isOldIos() {
  const match = UA.match(/(\d)_\d like Mac OS/);
  return match && match[1] <= 7;
}

export function id(x) {
  return document.getElementById(x);
}

/**
 * css 选择器
 * @param sel CSS selectors
 * @returns {Element} 返回第一个元素
 */
export function qu(sel) {
  return document.querySelector(sel);
}

/**
 * css 选择器
 * @param sel CSS selectors
 * @returns {Element} 返回所有元素
 */
export function qus(sel) {
  return document.querySelectorAll(sel);
}

export function names(name) {
  return document.getElementsByName(name);
}

export function tags(obj, tag) {
  if (!obj || !obj.getElementsByTagName)
    return null;

  return obj.getElementsByTagName(tag.toUpperCase());
}

export function dc(obj, tag, cls) {
  const el = document.createElement(tag);
  if (cls)
    el.className = cls;
  obj.appendChild(el);
  return el;
}
/**
 * 格式化字符串，类似 node util中带的 format
 * @type {Function}
 */
export function format(f, ...args) {
  let i = 0;
  const len = args.length;
  const str = String(f).replace(/%[sdj%]/g, x => {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s':
        return String(args[i++]);
      case '%d':
        return Number(args[i++]);
      case '%j':
        return JSON.stringify(args[i++]);
      default:
        return x;
    }
  });

  return str;
}

// 第一个子元素节点或非空文本节点 Object.prototype. ie 不支持
export function firstChild(obj) {
  let RC = null;
  if (!obj)
    return null;

  try {
    for (let i = 0; i < obj.childNodes.length; i++) {
      const nd = obj.childNodes[i];

      // alert(nd.nodeType + "/" + nd.nodeName + "/"
      //	+ (nd.nodeValue ? escape(nd.nodeValue) : "null") );

      if (nd.nodeType === 1// 元素节点
          // 有效文本节点，nodeName == "#text"
        || (nd.nodeType === 3 && nd.nodeValue && nd.nodeValue.trim())) {
        RC = nd;
        break;
      }
    }
  } catch (e) {
    alert(`firstChild exp:${e.message}`);
  }

  return RC;
}

// 下一个子元素节点或非空文本节点
export function nextNode(obj) {
  let RC = null;
  if (!obj)
    return null;

  let nd = obj.nextSibling;
  while (nd) {
    if (nd.nodeType === 1// 元素节点
        // 有效文本节点，nodeName == "#text"
      || (nd.nodeType === 3 && nd.nodeValue && nd.nodeValue.trim())) {
      RC = nd;
      break;
    }
    nd = nd.nextSibling;
  }

  return RC;
}

// 最后一个子元素节点或非空文本节点 Object.prototype. ie 不支持
export function lastChild(obj) {
  let RC = null;
  if (!obj)
    return null;

  for (let i = obj.childNodes.length - 1; i >= 0; i--) {
    const nd = obj.childNodes[i];

    // alert(nd.nodeType + "/" + nd.nodeName + "/"
    //	+ (nd.nodeValue ? escape(nd.nodeValue) : "null") );

    if (nd.nodeType === 1// 元素节点，元素节点没有 nodeValue
        // 有效文本节点，nodeName == "#text"
      || (nd.nodeType === 3 && nd.nodeValue && nd.nodeValue.trim())) {
      RC = nd;
      break;
    }
  }

  return RC;
}

// 元素子节点或非空文本节点数量
export function childCount(obj) {
  let RC = 0;

  if (!obj)
    return 0;

  for (let i = 0; i < obj.childNodes.length; i++) {
    const nd = obj.childNodes[i];

    // alert(nd.nodeType + "/" + nd.nodeName + "/"
    //	+ (nd.nodeValue ? escape(nd.nodeValue) : "null") );

    if (nd.nodeType === 1// 元素节点，元素节点没有 nodeValue
        // 有效文本节点，nodeName === "#text"
      || (nd.nodeType === 3 && nd.nodeValue && nd.nodeValue.trim())) {
      RC++;
    }
  }

  return RC;
}

// 设置样式，屏蔽兼容性问题
export function setClass(obj, val) {
  if (!obj)
    return;

  if (obj.className !== val)
    obj.className = val;
}

export function hasClass(obj, name) {
  if (!obj || !name) return false;
  const re = new RegExp(`(^|\\s)${name}(\\s|$)`);
  return re.test(obj.className);
}

export function addClass(obj, name) {
  if (!obj || !name) return;

  if (!hasClass(obj, name))
    obj.className += ` ${name}`;
}

export function removeClass(obj, name) {
  if (!obj || !name) return;

  if (hasClass(obj, name)) {
    const re = new RegExp(`(^|\\s+)${name}(\\s+|$)`, []);
    obj.className = obj.className.replace(re, ' ');
  }
}

/**
 * 修改微信 title
 */
export function setTitle(val) {
  setTimeout(() => {
    // 利用iframe的onload事件刷新页面
    document.title = val;

    const fr = document.createElement('iframe');
    // fr.style.visibility = 'hidden';
    fr.style.display = 'none';
    fr.src = 'img/favicon.ico';
    fr.onload = () => {
      setTimeout(() => {
        document.body.removeChild(fr);
      }, 0);
    };
    document.body.appendChild(fr);
  }, 0);
}

export function attr(tx, name) {
  if (!tx)
    return '';

  let rc = tx.getAttribute(name);
  if (rc == null)
    rc = '';

  return rc;
}

export function attrn(tx, name) {
  if (!tx)
    return '';

  let rc = tx.getAttribute(name);
  if (rc == null)
    rc = '';
  if (rc)
    rc = `${name}=${rc};`;
  return rc;
}

export function urlParam(name) {
  let rc = null;

  const val = `&${location.search.substr(1)}&`;
  const rg = new RegExp(`&${name}=([^&]*)&`);
  const rgs = rg.exec(val);
  if (rgs) {
    rc = rgs[1];
    rc = decodeURIComponent(rc);
  }

  return rc;
}

// 得到obj的上级元素TagName
// ff parentNode 会返回 空 节点
// ff textNode节点 没有 tagName
export function getUpperObj(obj, tagName) {
  let RC = null;

  const tn = tagName.toUpperCase();

  let i = 0;
  let nd = obj;
  while (nd) {
    i++;
    if (i >= 10)
      break;
    if (nd.tagName && nd.tagName === tn) {
      RC = nd;
      break;
    }
    nd = nd.parentNode;
  }

  return RC;
}

// 得到obj的上级元素TagName
// ff parentNode 会返回 空 节点
// ff textNode节点 没有 tagName
/**
 * 获取 指定 tagName的子元素
 * @param obj
 * @param tagName
 * @returns {*}
 */
export function childTag(obj, tag) {
  let RC = null;

  if (!obj)
    return null;

  try {
    for (let i = 0; i < obj.childNodes.length; i++) {
      const nd = obj.childNodes[i];

      if (nd.tagName && nd.tagName === tag.toUpperCase()) {
        RC = nd;
        break;
      }
    }
  } catch (e) {
    alert(`childTag exp:${e.message}`);
  }

  return RC;
}

/**
 * 光标放入尾部
 * @param el
 */
export function cursorEnd(el) {
  el.focus();

  if (typeof window.getSelection !== 'undefined'
    && typeof document.createRange !== 'undefined') {
    const rg = document.createRange();
    rg.selectNodeContents(el);
    // 合并光标
    rg.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(rg);
  } else if (typeof document.body.createTextRangrge !== 'undefined') {
    const rg = document.body.createTextRange();
    rg.moveToElementText(el);
    // 合并光标
    rg.collapse(false);
    // textRange.moveStart('character', 3);
    rg.select();
  }
}

/**
 * 获取光标位置
 * @param obj
 * @returns {number}
 */
export function getCursorPos(obj) {
  let rs = 0;

  if (!obj)
    return 0;

  // obj.focus();
  if (obj.selectionStart) { // IE以外
    rs = obj.selectionStart;
  } else { // IE
    let rg = null;
    if (obj.tagName.toLowerCase() === 'textarea') { // TEXTAREA
      rg = event.srcElement.createTextRange();
      rg.moveToPoint(event.x, event.y);
    } else { // Text
      rg = document.selection.createRange();
    }
    rg.moveStart('character', -event.srcElement.value.length);
    // rg.setEndPoint("StartToStart", obj.createTextRange())
    rs = rg.text.length;
  }
  return rs;
}

// 得到光标的位置
export function getCursorPosition(obj) {
  const qswh = '@#%#^&#*$';
  // obj.focus();
  const rng = document.selection.createRange();
  rng.text = qswh;
  const nPosition = obj.value.indexOf(qswh)
  rng.moveStart('character', -qswh.length)
  rng.text = '';
  return nPosition;
}

//设置光标位置
export function setCursorPos(obj, pos) {
  const rg = obj.createTextRange();
  rg.collapse(true);
  rg.moveStart('character', pos);
  rg.select();
}

export function moveFirst() {
  this.rowindex = 0;
}

/**
 创建xmlHttpRequest,返回xmlHttpRequest实例,根据不同的浏览器做兼容
 */
function getXhr() {
  let rs = null;

  if (window.XMLHttpRequest)
    rs = new XMLHttpRequest();
  else if (window.ActiveXObject)
    rs = new ActiveXObject('Microsoft.XMLHTTP');

  return rs;
}

function objToParam(obj) {
  let rs = '';

  const arr = [];
  for (const k in obj) {
    if (obj.hasOwnProperty(k)) {
      arr.push(`${k}=${obj[k]}`);
    }
    // rs += `${k}=${obj[k]}&`;
  }
  // 排序
  rs = arr.sort().join('&');
  // alert(rs);
  return rs;
}

export function post(url, data, cb) {
  const xhr = getXhr();
  xhr.onreadystatechange = () => {
    if ((xhr.readyState === 4) && (xhr.status === 200)) {
      cb(xhr.responseText);
    }
  };

  // 异步 post,回调通知
  xhr.open('POST', url, true);
  let param = data;
  if ((typeof data) === 'object')
    param = objToParam(data);

  // 发送 FormData 数据, 会自动设置为 multipart/form-data
  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  // xhr.setRequestHeader('Content-Type', 'multipart/form-data; boundary=AaB03x');
  // alert(param);
  xhr.send(param);
}

/**
 * xmlHttpRequest POST 方法
 * 发送 FormData 数据, 会自动设置为 multipart/form-data
 * 其他数据,应该是 application/x-www-form-urlencoded
 * @param url post的url地址
 * @param data 要post的数据
 * @param cb 回调
 */
export function postForm(url, data, cb) {
  const xhr = getXhr();
  xhr.onreadystatechange = () => {
    if ((xhr.readyState === 4) && (xhr.status === 200)) {
      cb(xhr.responseText);
    }
  };

  // 异步 post,回调通知
  xhr.open('POST', url, true);
  // 发送 FormData 数据, 会自动设置为 multipart/form-data
  // xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  // xhr.setRequestHeader('Content-Type', 'multipart/form-data; boundary=AaB03x');
  xhr.send(data);
}

/**
 * xmlHttpRequest GET 方法
 * @param url get的URL地址
 * @param data 要get的数据
 * @param cb 回调
 */
export function get(url, param, cb) {
  const xhr = getXhr();
  xhr.onreadystatechange = () => {
    if ((xhr.readyState === 4) && (xhr.status === 200)) {
      if (cb)
        cb(xhr.responseText);
    }
  };

  if (param)
    xhr.open('GET', `${url}?${param}`, true);
  else
    xhr.open('GET', url, true);
  xhr.send(null);
}

