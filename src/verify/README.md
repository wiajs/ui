## 使用

```html
<li name="liVerify" class="item-content item-input" style="display:none;">
  <div class="verify"></div>
</li>
```

```js
/**
 * 初始化
 * @param {Login} pg
 */
function init(pg) {
  let R;

  try {
    /** @type {string|number} */
    // eslint-disable-next-line
    let width = getComputedStyle($('.item-inner')[0]).width;
    if (width && width !== '300px') width = Number.parseInt(width.replace('.px', ''));

    _verify = new Verify(pg, {
      el: '.verify',
      url: 'https://xxx.xxx/auth',
      width, // iPhone 需缩小避免页面左右滑动
    });

    _verify.onSuccess = () => {
      console.log('success');
      onSucc(mobile);
    };
    _verify.onFail = () => {
      console.log('fail');
    };
    _verify.onRefresh = () => {
      console.log('refresh');
    };
  } catch (e) {
    console.error(`init exp:${e.message}`);
  }

  return R;
}

/**
 * 绑定事件
 * @param {Login} pg
 */
function bind(pg) {
  try {
    _.class('checkbox').click(async ev => {
      const mobile = _.txMobile.val();
      if (/1\d{10}/.test(mobile)) {
        if (_.ckAgree.dom.checked) _.liVerify.hide();
        else {
          // 通过手机号码加载验证图片
          await _verify.loadImg(mobile);
          _.liVerify.show();
        }
      } else {
        alert('请输入正确手机号码');
        ev.preventDefault();
        _.ckAgree.dom.checked = false;
      }
    });
  } catch (e) {
    console.error(`bind exp: ${e.message}`);
  }
}

/**
 * 图片拖动验证成功
 * @param {string} mobile
 * @returns
 */
function onSucc(mobile) {
  let R;

  try {
    $.go('loginCode', {
      mobile,
      hash: _from.hash,
      from: _from.from,
      to: _from.to,
      param: _from.param,
    });
  } catch (e) {
    console.error(`onSucc exp:${e.message}`);
  }

  return R;
}
```
