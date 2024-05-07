import {getSize} from '@wiajs/lib/img/util';

import {IS_BROWSER, WINDOW} from './constant';

export {getSize};

/**
 * Check if the given value is not a number.
 */
export const isNaN = Number.isNaN || WINDOW.isNaN;

/**
 * Check if the given value is a positive number.
 * @param {*} value - The value to check.
 * @returns {boolean} Returns `true` if the given value is a positive number, else `false`.
 */
export const isPositiveNumber = value => value > 0 && value < Infinity;

/**
 * Check if the given value is undefined.
 * @param {*} value - The value to check.
 * @returns {boolean} Returns `true` if the given value is undefined, else `false`.
 */
export function isUndefined(value) {
  return typeof value === 'undefined';
}

/**
 * Check if the given value is an object.
 * @param {*} value - The value to check.
 * @returns {boolean} Returns `true` if the given value is an object, else `false`.
 */
export function isObject(value) {
  return typeof value === 'object' && value !== null;
}

const {hasOwnProperty} = Object.prototype;

const {slice} = Array.prototype;

/**
 * Convert array-like or iterable object to an array.
 * @param {*} value - The value to convert.
 * @returns {Array} Returns a new array.
 */
export function toArray(value) {
  return Array.from ? Array.from(value) : slice.call(value);
}

const REGEXP_DECIMALS = /\.\d*(?:0|9){12}\d*$/;

/**
 * Normalize decimal number.
 * Check out {@link https://0.30000000000000004.com/}
 * @param {number} value - The value to normalize.
 * @param {number} [times=100000000000] - The times for normalizing.
 * @returns {number} Returns the normalized number.
 */
export function normalizeDecimalNumber(value, times = 100000000000) {
  return REGEXP_DECIMALS.test(value) ? Math.round(value * times) / times : value;
}

const REGEXP_CAMEL_CASE = /([a-z\d])([A-Z])/g;

/**
 * Transform the given string from camelCase to kebab-case
 * @param {string} value - The value to transform.
 * @returns {string} The transformed value.
 */
export function toParamCase(value) {
  return value.replace(REGEXP_CAMEL_CASE, '$1-$2').toLowerCase();
}

/**
 * Get the offset base on the document.
 * @param {Element} element - The target element.
 * @returns {Object} The offset data.
 */
export function getOffset(element) {
  const box = element.getBoundingClientRect();

  return {
    left: box.left + (window.pageXOffset - document.documentElement.clientLeft),
    top: box.top + (window.pageYOffset - document.documentElement.clientTop),
  };
}

const {location} = WINDOW;
const REGEXP_ORIGINS = /^(\w+:)\/\/([^:/?#]*):?(\d*)/i;

/**
 * Check if the given URL is a cross origin URL.
 * @param {string} url - The target URL.
 * @returns {boolean} Returns `true` if the given URL is a cross origin URL, else `false`.
 */
export function isCrossOriginURL(url) {
  const parts = url.match(REGEXP_ORIGINS);

  return (
    parts !== null &&
    (parts[1] !== location.protocol || parts[2] !== location.hostname || parts[3] !== location.port)
  );
}

/**
 * Add timestamp to the given URL.
 * @param {string} url - The target URL.
 * @returns {string} The result URL.
 */
export function addTimestamp(url) {
  const timestamp = `timestamp=${new Date().getTime()}`;

  return url + (url.indexOf('?') === -1 ? '?' : '&') + timestamp;
}

/**
 * Get transforms base on the given object.
 * @param {Object} obj - The target object.
 * @returns {string} A string contains transform values.
 */
export function getTransforms({rotate, scaleX, scaleY, translateX, translateY}) {
  const values = [];

  if ($.isNumber(translateX) && translateX !== 0) {
    values.push(`translateX(${translateX}px)`);
  }

  if ($.isNumber(translateY) && translateY !== 0) {
    values.push(`translateY(${translateY}px)`);
  }

  // Rotate should come first before scale to match orientation transform
  if ($.isNumber(rotate) && rotate !== 0) {
    values.push(`rotate(${rotate}deg)`);
  }

  if ($.isNumber(scaleX) && scaleX !== 1) {
    values.push(`scaleX(${scaleX})`);
  }

  if ($.isNumber(scaleY) && scaleY !== 1) {
    values.push(`scaleY(${scaleY})`);
  }

  const transform = values.length ? values.join(' ') : 'none';

  return {
    WebkitTransform: transform,
    msTransform: transform,
    transform,
  };
}

/**
 * Get a pointer from an event object.
 * @param {Object} event - The target event object.
 * @param {boolean} endOnly - Indicates if only returns the end point coordinate or not.
 * @returns {Object} The result pointer contains start and/or end point coordinates.
 */
export function getPointer({pageX, pageY}, endOnly) {
  const end = {
    endX: pageX,
    endY: pageY,
  };

  return endOnly
    ? end
    : {
        startX: pageX,
        startY: pageY,
        ...end,
      };
}

/**
 * Get the center point coordinate of a group of pointers.
 * @param {Object} pointers - The target pointers.
 * @returns {Object} The center point coordinate.
 */
export function getPointersCenter(pointers) {
  let pageX = 0;
  let pageY = 0;
  let count = 0;

  forEach(pointers, ({startX, startY}) => {
    pageX += startX;
    pageY += startY;
    count += 1;
  });

  pageX /= count;
  pageY /= count;

  return {
    pageX,
    pageY,
  };
}

/**
 * Get the new sizes of a rectangle after rotated.
 * @param {Object} data - The original sizes.
 * @returns {Object} The result sizes.
 */
export function getRotatedSizes({width, height, degree}) {
  degree = Math.abs(degree) % 180;

  if (degree === 90) {
    return {
      width: height,
      height: width,
    };
  }

  const arc = ((degree % 90) * Math.PI) / 180;
  const sinArc = Math.sin(arc);
  const cosArc = Math.cos(arc);
  const newWidth = width * cosArc + height * sinArc;
  const newHeight = width * sinArc + height * cosArc;

  return degree > 90
    ? {
        width: newHeight,
        height: newWidth,
      }
    : {
        width: newWidth,
        height: newHeight,
      };
}

/**
 * Get a canvas which drew the given image.
 * @param {HTMLImageElement} image - The image for drawing.
 * @param {Object} imageData - The image data.
 * @param {Object} canvasData - The canvas data.
 * @param {Object} opt - The options.
 * @returns {HTMLCanvasElement} The result canvas.
 */
export function getSourceCanvas(
  image,
  {
    aspectRatio: imageAspectRatio,
    naturalWidth: imageNaturalWidth,
    naturalHeight: imageNaturalHeight,
    rotate = 0,
    scaleX = 1,
    scaleY = 1,
  },
  {aspectRatio, naturalWidth, naturalHeight},
  {
    fillColor = 'transparent',
    imageSmoothingEnabled = true,
    imageSmoothingQuality = 'low',
    maxWidth = Infinity,
    maxHeight = Infinity,
    minWidth = 0,
    minHeight = 0,
  }
) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const maxSizes = getSize({
    aspect: aspectRatio,
    width: maxWidth,
    height: maxHeight,
  });
  const minSizes = getSize(
    {
      aspect: aspectRatio,
      width: minWidth,
      height: minHeight,
    },
    'cover'
  );
  const width = Math.min(maxSizes.width, Math.max(minSizes.width, naturalWidth));
  const height = Math.min(maxSizes.height, Math.max(minSizes.height, naturalHeight));

  // Note: should always use image's natural sizes for drawing as
  // imageData.naturalWidth === canvasData.naturalHeight when rotate % 180 === 90
  const destMaxSizes = getSize({
    aspect: imageAspectRatio,
    width: maxWidth,
    height: maxHeight,
  });
  const destMinSizes = getSize(
    {
      aspect: imageAspectRatio,
      width: minWidth,
      height: minHeight,
    },
    'cover'
  );
  const destWidth = Math.min(destMaxSizes.width, Math.max(destMinSizes.width, imageNaturalWidth));
  const destHeight = Math.min(
    destMaxSizes.height,
    Math.max(destMinSizes.height, imageNaturalHeight)
  );
  const params = [-destWidth / 2, -destHeight / 2, destWidth, destHeight];

  canvas.width = normalizeDecimalNumber(width);
  canvas.height = normalizeDecimalNumber(height);
  context.fillStyle = fillColor;
  context.fillRect(0, 0, width, height);
  context.save();
  context.translate(width / 2, height / 2);
  context.rotate((rotate * Math.PI) / 180);
  context.scale(scaleX, scaleY);
  context.imageSmoothingEnabled = imageSmoothingEnabled;
  context.imageSmoothingQuality = imageSmoothingQuality;
  context.drawImage(image, ...params.map(param => Math.floor(normalizeDecimalNumber(param))));
  context.restore();
  return canvas;
}
