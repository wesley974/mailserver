/*  Prototype JavaScript framework, version 1.6.0.3
 *  (c) 2005-2008 Sam Stephenson
 *
 *  Prototype is freely distributable under the terms of an MIT-style license.
 *  For details, see the Prototype web site: http://www.prototypejs.org/
 *
 *--------------------------------------------------------------------------*/

var Prototype = {
  Version: '1.6.0.3',

  Browser: {
    IE:     !!(window.attachEvent &&
      navigator.userAgent.indexOf('Opera') === -1),
    Opera:  navigator.userAgent.indexOf('Opera') > -1,
    WebKit: navigator.userAgent.indexOf('AppleWebKit/') > -1,
    Gecko:  navigator.userAgent.indexOf('Gecko') > -1 &&
      navigator.userAgent.indexOf('KHTML') === -1,
    MobileSafari: !!navigator.userAgent.match(/Apple.*Mobile.*Safari/)
  },

  BrowserFeatures: {
    XPath: !!document.evaluate,
    SelectorsAPI: !!document.querySelector,
    ElementExtensions: !!window.HTMLElement,
    SpecificElementExtensions:
      document.createElement('div')['__proto__'] &&
      document.createElement('div')['__proto__'] !==
        document.createElement('form')['__proto__']
  },

  ScriptFragment: '<script[^>]*>([\\S\\s]*?)<\/script>',
  JSONFilter: /^\/\*-secure-([\s\S]*)\*\/\s*$/,

  emptyFunction: function() { },
  K: function(x) { return x }
};

if (Prototype.Browser.MobileSafari)
  Prototype.BrowserFeatures.SpecificElementExtensions = false;


/* Based on Alex Arnell's inheritance implementation. */
var Class = {
  create: function() {
    var parent = null, properties = $A(arguments);
    if (Object.isFunction(properties[0]))
      parent = properties.shift();

    function klass() {
      this.initialize.apply(this, arguments);
    }

    Object.extend(klass, Class.Methods);
    klass.superclass = parent;
    klass.subclasses = [];

    if (parent) {
      var subclass = function() { };
      subclass.prototype = parent.prototype;
      klass.prototype = new subclass;
      parent.subclasses.push(klass);
    }

    for (var i = 0; i < properties.length; i++)
      klass.addMethods(properties[i]);

    if (!klass.prototype.initialize)
      klass.prototype.initialize = Prototype.emptyFunction;

    klass.prototype.constructor = klass;

    return klass;
  }
};

Class.Methods = {
  addMethods: function(source) {
    var ancestor   = this.superclass && this.superclass.prototype;
    var properties = Object.keys(source);

    if (!Object.keys({ toString: true }).length)
      properties.push("toString", "valueOf");

    for (var i = 0, length = properties.length; i < length; i++) {
      var property = properties[i], value = source[property];
      if (ancestor && Object.isFunction(value) &&
          value.argumentNames().first() == "$super") {
        var method = value;
        value = (function(m) {
          return function() { return ancestor[m].apply(this, arguments) };
        })(property).wrap(method);

        value.valueOf = method.valueOf.bind(method);
        value.toString = method.toString.bind(method);
      }
      this.prototype[property] = value;
    }

    return this;
  }
};

var Abstract = { };

Object.extend = function(destination, source) {
  for (var property in source)
    destination[property] = source[property];
  return destination;
};

Object.extend(Object, {
  inspect: function(object) {
    try {
      if (Object.isUndefined(object)) return 'undefined';
      if (object === null) return 'null';
      return object.inspect ? object.inspect() : String(object);
    } catch (e) {
      if (e instanceof RangeError) return '...';
      throw e;
    }
  },

  toJSON: function(object) {
    var type = typeof object;
    switch (type) {
      case 'undefined':
      case 'function':
      case 'unknown': return;
      case 'boolean': return object.toString();
    }

    if (object === null) return 'null';
    if (object.toJSON) return object.toJSON();
    if (Object.isElement(object)) return;

    var results = [];
    for (var property in object) {
      var value = Object.toJSON(object[property]);
      if (!Object.isUndefined(value))
        results.push(property.toJSON() + ': ' + value);
    }

    return '{' + results.join(', ') + '}';
  },

  toQueryString: function(object) {
    return $H(object).toQueryString();
  },

  toHTML: function(object) {
    return object && object.toHTML ? object.toHTML() : String.interpret(object);
  },

  keys: function(object) {
    var keys = [];
    for (var property in object)
      keys.push(property);
    return keys;
  },

  values: function(object) {
    var values = [];
    for (var property in object)
      values.push(object[property]);
    return values;
  },

  clone: function(object) {
    return Object.extend({ }, object);
  },

  isElement: function(object) {
    return !!(object && object.nodeType == 1);
  },

  isArray: function(object) {
    return object != null && typeof object == "object" &&
      'splice' in object && 'join' in object;
  },

  isHash: function(object) {
    return object instanceof Hash;
  },

  isFunction: function(object) {
    return typeof object == "function";
  },

  isString: function(object) {
    return typeof object == "string";
  },

  isNumber: function(object) {
    return typeof object == "number";
  },

  isUndefined: function(object) {
    return typeof object == "undefined";
  }
});

Object.extend(Function.prototype, {
  argumentNames: function() {
    var names = this.toString().match(/^[\s\(]*function[^(]*\(([^\)]*)\)/)[1]
      .replace(/\s+/g, '').split(',');
    return names.length == 1 && !names[0] ? [] : names;
  },

  bind: function() {
    if (arguments.length < 2 && Object.isUndefined(arguments[0])) return this;
    var __method = this, args = $A(arguments), object = args.shift();
    return function() {
      return __method.apply(object, args.concat($A(arguments)));
    }
  },

  bindAsEventListener: function() {
    var __method = this, args = $A(arguments), object = args.shift();
    return function(event) {
      return __method.apply(object, [event || window.event].concat(args));
    }
  },

  curry: function() {
    if (!arguments.length) return this;
    var __method = this, args = $A(arguments);
    return function() {
      return __method.apply(this, args.concat($A(arguments)));
    }
  },

  delay: function() {
    var __method = this, args = $A(arguments), timeout = args.shift() * 1000;
    return window.setTimeout(function() {
      return __method.apply(__method, args);
    }, timeout);
  },

  defer: function() {
    var args = [0.01].concat($A(arguments));
    return this.delay.apply(this, args);
  },

  wrap: function(wrapper) {
    var __method = this;
    return function() {
      return wrapper.apply(this, [__method.bind(this)].concat($A(arguments)));
    }
  },

  methodize: function() {
    if (this._methodized) return this._methodized;
    var __method = this;
    return this._methodized = function() {
      return __method.apply(null, [this].concat($A(arguments)));
    };
  }
});

Date.prototype.toJSON = function() {
  return '"' + this.getUTCFullYear() + '-' +
    (this.getUTCMonth() + 1).toPaddedString(2) + '-' +
    this.getUTCDate().toPaddedString(2) + 'T' +
    this.getUTCHours().toPaddedString(2) + ':' +
    this.getUTCMinutes().toPaddedString(2) + ':' +
    this.getUTCSeconds().toPaddedString(2) + 'Z"';
};

var Try = {
  these: function() {
    var returnValue;

    for (var i = 0, length = arguments.length; i < length; i++) {
      var lambda = arguments[i];
      try {
        returnValue = lambda();
        break;
      } catch (e) { }
    }

    return returnValue;
  }
};

RegExp.prototype.match = RegExp.prototype.test;

RegExp.escape = function(str) {
  return String(str).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
};

/*--------------------------------------------------------------------------*/

var PeriodicalExecuter = Class.create({
  initialize: function(callback, frequency) {
    this.callback = callback;
    this.frequency = frequency;
    this.currentlyExecuting = false;

    this.registerCallback();
  },

  registerCallback: function() {
    this.timer = setInterval(this.onTimerEvent.bind(this), this.frequency * 1000);
  },

  execute: function() {
    this.callback(this);
  },

  stop: function() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  },

  onTimerEvent: function() {
    if (!this.currentlyExecuting) {
      try {
        this.currentlyExecuting = true;
        this.execute();
      } finally {
        this.currentlyExecuting = false;
      }
    }
  }
});
Object.extend(String, {
  interpret: function(value) {
    return value == null ? '' : String(value);
  },
  specialChar: {
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\f': '\\f',
    '\r': '\\r',
    '\\': '\\\\'
  }
});

Object.extend(String.prototype, {
  gsub: function(pattern, replacement) {
    var result = '', source = this, match;
    replacement = arguments.callee.prepareReplacement(replacement);

    while (source.length > 0) {
      if (match = source.match(pattern)) {
        result += source.slice(0, match.index);
        result += String.interpret(replacement(match));
        source  = source.slice(match.index + match[0].length);
      } else {
        result += source, source = '';
      }
    }
    return result;
  },

  sub: function(pattern, replacement, count) {
    replacement = this.gsub.prepareReplacement(replacement);
    count = Object.isUndefined(count) ? 1 : count;

    return this.gsub(pattern, function(match) {
      if (--count < 0) return match[0];
      return replacement(match);
    });
  },

  scan: function(pattern, iterator) {
    this.gsub(pattern, iterator);
    return String(this);
  },

  truncate: function(length, truncation) {
    length = length || 30;
    truncation = Object.isUndefined(truncation) ? '...' : truncation;
    return this.length > length ?
      this.slice(0, length - truncation.length) + truncation : String(this);
  },

  strip: function() {
    return this.replace(/^\s+/, '').replace(/\s+$/, '');
  },

  stripTags: function() {
    return this.replace(/<\/?[^>]+>/gi, '');
  },

  stripScripts: function() {
    return this.replace(new RegExp(Prototype.ScriptFragment, 'img'), '');
  },

  extractScripts: function() {
    var matchAll = new RegExp(Prototype.ScriptFragment, 'img');
    var matchOne = new RegExp(Prototype.ScriptFragment, 'im');
    return (this.match(matchAll) || []).map(function(scriptTag) {
      return (scriptTag.match(matchOne) || ['', ''])[1];
    });
  },

  evalScripts: function() {
    return this.extractScripts().map(function(script) { return eval(script) });
  },

  escapeHTML: function() {
    var self = arguments.callee;
    self.text.data = this;
    return self.div.innerHTML;
  },

  unescapeHTML: function() {
    var div = new Element('div');
    div.innerHTML = this.stripTags();
    return div.childNodes[0] ? (div.childNodes.length > 1 ?
      $A(div.childNodes).inject('', function(memo, node) { return memo+node.nodeValue }) :
      div.childNodes[0].nodeValue) : '';
  },

  toQueryParams: function(separator) {
    var match = this.strip().match(/([^?#]*)(#.*)?$/);
    if (!match) return { };

    return match[1].split(separator || '&').inject({ }, function(hash, pair) {
      if ((pair = pair.split('='))[0]) {
        var key = decodeURIComponent(pair.shift());
        var value = pair.length > 1 ? pair.join('=') : pair[0];
        if (value != undefined) value = decodeURIComponent(value);

        if (key in hash) {
          if (!Object.isArray(hash[key])) hash[key] = [hash[key]];
          hash[key].push(value);
        }
        else hash[key] = value;
      }
      return hash;
    });
  },

  toArray: function() {
    return this.split('');
  },

  succ: function() {
    return this.slice(0, this.length - 1) +
      String.fromCharCode(this.charCodeAt(this.length - 1) + 1);
  },

  times: function(count) {
    return count < 1 ? '' : new Array(count + 1).join(this);
  },

  camelize: function() {
    var parts = this.split('-'), len = parts.length;
    if (len == 1) return parts[0];

    var camelized = this.charAt(0) == '-'
      ? parts[0].charAt(0).toUpperCase() + parts[0].substring(1)
      : parts[0];

    for (var i = 1; i < len; i++)
      camelized += parts[i].charAt(0).toUpperCase() + parts[i].substring(1);

    return camelized;
  },

  capitalize: function() {
    return this.charAt(0).toUpperCase() + this.substring(1).toLowerCase();
  },

  underscore: function() {
    return this.gsub(/::/, '/').gsub(/([A-Z]+)([A-Z][a-z])/,'#{1}_#{2}').gsub(/([a-z\d])([A-Z])/,'#{1}_#{2}').gsub(/-/,'_').toLowerCase();
  },

  dasherize: function() {
    return this.gsub(/_/,'-');
  },

  inspect: function(useDoubleQuotes) {
    var escapedString = this.gsub(/[\x00-\x1f\\]/, function(match) {
      var character = String.specialChar[match[0]];
      return character ? character : '\\u00' + match[0].charCodeAt().toPaddedString(2, 16);
    });
    if (useDoubleQuotes) return '"' + escapedString.replace(/"/g, '\\"') + '"';
    return "'" + escapedString.replace(/'/g, '\\\'') + "'";
  },

  toJSON: function() {
    return this.inspect(true);
  },

  unfilterJSON: function(filter) {
    return this.sub(filter || Prototype.JSONFilter, '#{1}');
  },

  isJSON: function() {
    var str = this;
    if (str.blank()) return false;
    str = this.replace(/\\./g, '@').replace(/"[^"\\\n\r]*"/g, '');
    return (/^[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]*$/).test(str);
  },

  evalJSON: function(sanitize) {
    var json = this.unfilterJSON();
    try {
      if (!sanitize || json.isJSON()) return eval('(' + json + ')');
    } catch (e) { }
    throw new SyntaxError('Badly formed JSON string: ' + this.inspect());
  },

  include: function(pattern) {
    return this.indexOf(pattern) > -1;
  },

  startsWith: function(pattern) {
    return this.indexOf(pattern) === 0;
  },

  endsWith: function(pattern) {
    var d = this.length - pattern.length;
    return d >= 0 && this.lastIndexOf(pattern) === d;
  },

  empty: function() {
    return this == '';
  },

  blank: function() {
    return /^\s*$/.test(this);
  },

  interpolate: function(object, pattern) {
    return new Template(this, pattern).evaluate(object);
  }
});

if (Prototype.Browser.WebKit || Prototype.Browser.IE) Object.extend(String.prototype, {
  escapeHTML: function() {
    return this.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  },
  unescapeHTML: function() {
    return this.stripTags().replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
  }
});

String.prototype.gsub.prepareReplacement = function(replacement) {
  if (Object.isFunction(replacement)) return replacement;
  var template = new Template(replacement);
  return function(match) { return template.evaluate(match) };
};

String.prototype.parseQuery = String.prototype.toQueryParams;

Object.extend(String.prototype.escapeHTML, {
  div:  document.createElement('div'),
  text: document.createTextNode('')
});

String.prototype.escapeHTML.div.appendChild(String.prototype.escapeHTML.text);

var Template = Class.create({
  initialize: function(template, pattern) {
    this.template = template.toString();
    this.pattern = pattern || Template.Pattern;
  },

  evaluate: function(object) {
    if (Object.isFunction(object.toTemplateReplacements))
      object = object.toTemplateReplacements();

    return this.template.gsub(this.pattern, function(match) {
      if (object == null) return '';

      var before = match[1] || '';
      if (before == '\\') return match[2];

      var ctx = object, expr = match[3];
      var pattern = /^([^.[]+|\[((?:.*?[^\\])?)\])(\.|\[|$)/;
      match = pattern.exec(expr);
      if (match == null) return before;

      while (match != null) {
        var comp = match[1].startsWith('[') ? match[2].gsub('\\\\]', ']') : match[1];
        ctx = ctx[comp];
        if (null == ctx || '' == match[3]) break;
        expr = expr.substring('[' == match[3] ? match[1].length : match[0].length);
        match = pattern.exec(expr);
      }

      return before + String.interpret(ctx);
    });
  }
});
Template.Pattern = /(^|.|\r|\n)(#\{(.*?)\})/;

var $break = { };

var Enumerable = {
  each: function(iterator, context) {
    var index = 0;
    try {
      this._each(function(value) {
        iterator.call(context, value, index++);
      });
    } catch (e) {
      if (e != $break) throw e;
    }
    return this;
  },

  eachSlice: function(number, iterator, context) {
    var index = -number, slices = [], array = this.toArray();
    if (number < 1) return array;
    while ((index += number) < array.length)
      slices.push(array.slice(index, index+number));
    return slices.collect(iterator, context);
  },

  all: function(iterator, context) {
    iterator = iterator || Prototype.K;
    var result = true;
    this.each(function(value, index) {
      result = result && !!iterator.call(context, value, index);
      if (!result) throw $break;
    });
    return result;
  },

  any: function(iterator, context) {
    iterator = iterator || Prototype.K;
    var result = false;
    this.each(function(value, index) {
      if (result = !!iterator.call(context, value, index))
        throw $break;
    });
    return result;
  },

  collect: function(iterator, context) {
    iterator = iterator || Prototype.K;
    var results = [];
    this.each(function(value, index) {
      results.push(iterator.call(context, value, index));
    });
    return results;
  },

  detect: function(iterator, context) {
    var result;
    this.each(function(value, index) {
      if (iterator.call(context, value, index)) {
        result = value;
        throw $break;
      }
    });
    return result;
  },

  findAll: function(iterator, context) {
    var results = [];
    this.each(function(value, index) {
      if (iterator.call(context, value, index))
        results.push(value);
    });
    return results;
  },

  grep: function(filter, iterator, context) {
    iterator = iterator || Prototype.K;
    var results = [];

    if (Object.isString(filter))
      filter = new RegExp(filter);

    this.each(function(value, index) {
      if (filter.match(value))
        results.push(iterator.call(context, value, index));
    });
    return results;
  },

  include: function(object) {
    if (Object.isFunction(this.indexOf))
      if (this.indexOf(object) != -1) return true;

    var found = false;
    this.each(function(value) {
      if (value == object) {
        found = true;
        throw $break;
      }
    });
    return found;
  },

  inGroupsOf: function(number, fillWith) {
    fillWith = Object.isUndefined(fillWith) ? null : fillWith;
    return this.eachSlice(number, function(slice) {
      while(slice.length < number) slice.push(fillWith);
      return slice;
    });
  },

  inject: function(memo, iterator, context) {
    this.each(function(value, index) {
      memo = iterator.call(context, memo, value, index);
    });
    return memo;
  },

  invoke: function(method) {
    var args = $A(arguments).slice(1);
    return this.map(function(value) {
      return value[method].apply(value, args);
    });
  },

  max: function(iterator, context) {
    iterator = iterator || Prototype.K;
    var result;
    this.each(function(value, index) {
      value = iterator.call(context, value, index);
      if (result == null || value >= result)
        result = value;
    });
    return result;
  },

  min: function(iterator, context) {
    iterator = iterator || Prototype.K;
    var result;
    this.each(function(value, index) {
      value = iterator.call(context, value, index);
      if (result == null || value < result)
        result = value;
    });
    return result;
  },

  partition: function(iterator, context) {
    iterator = iterator || Prototype.K;
    var trues = [], falses = [];
    this.each(function(value, index) {
      (iterator.call(context, value, index) ?
        trues : falses).push(value);
    });
    return [trues, falses];
  },

  pluck: function(property) {
    var results = [];
    this.each(function(value) {
      results.push(value[property]);
    });
    return results;
  },

  reject: function(iterator, context) {
    var results = [];
    this.each(function(value, index) {
      if (!iterator.call(context, value, index))
        results.push(value);
    });
    return results;
  },

  sortBy: function(iterator, context) {
    return this.map(function(value, index) {
      return {
        value: value,
        criteria: iterator.call(context, value, index)
      };
    }).sort(function(left, right) {
      var a = left.criteria, b = right.criteria;
      return a < b ? -1 : a > b ? 1 : 0;
    }).pluck('value');
  },

  toArray: function() {
    return this.map();
  },

  zip: function() {
    var iterator = Prototype.K, args = $A(arguments);
    if (Object.isFunction(args.last()))
      iterator = args.pop();

    var collections = [this].concat(args).map($A);
    return this.map(function(value, index) {
      return iterator(collections.pluck(index));
    });
  },

  size: function() {
    return this.toArray().length;
  },

  inspect: function() {
    return '#<Enumerable:' + this.toArray().inspect() + '>';
  }
};

Object.extend(Enumerable, {
  map:     Enumerable.collect,
  find:    Enumerable.detect,
  select:  Enumerable.findAll,
  filter:  Enumerable.findAll,
  member:  Enumerable.include,
  entries: Enumerable.toArray,
  every:   Enumerable.all,
  some:    Enumerable.any
});
function $A(iterable) {
  if (!iterable) return [];
  if (iterable.toArray) return iterable.toArray();
  var length = iterable.length || 0, results = new Array(length);
  while (length--) results[length] = iterable[length];
  return results;
}

if (Prototype.Browser.WebKit) {
  $A = function(iterable) {
    if (!iterable) return [];
    // In Safari, only use the `toArray` method if it's not a NodeList.
    // A NodeList is a function, has an function `item` property, and a numeric
    // `length` property. Adapted from Google Doctype.
    if (!(typeof iterable === 'function' && typeof iterable.length ===
        'number' && typeof iterable.item === 'function') && iterable.toArray)
      return iterable.toArray();
    var length = iterable.length || 0, results = new Array(length);
    while (length--) results[length] = iterable[length];
    return results;
  };
}

Array.from = $A;

Object.extend(Array.prototype, Enumerable);

if (!Array.prototype._reverse) Array.prototype._reverse = Array.prototype.reverse;

Object.extend(Array.prototype, {
  _each: function(iterator) {
    for (var i = 0, length = this.length; i < length; i++)
      iterator(this[i]);
  },

  clear: function() {
    this.length = 0;
    return this;
  },

  first: function() {
    return this[0];
  },

  last: function() {
    return this[this.length - 1];
  },

  compact: function() {
    return this.select(function(value) {
      return value != null;
    });
  },

  flatten: function() {
    return this.inject([], function(array, value) {
      return array.concat(Object.isArray(value) ?
        value.flatten() : [value]);
    });
  },

  without: function() {
    var values = $A(arguments);
    return this.select(function(value) {
      return !values.include(value);
    });
  },

  reverse: function(inline) {
    return (inline !== false ? this : this.toArray())._reverse();
  },

  reduce: function() {
    return this.length > 1 ? this : this[0];
  },

  uniq: function(sorted) {
    return this.inject([], function(array, value, index) {
      if (0 == index || (sorted ? array.last() != value : !array.include(value)))
        array.push(value);
      return array;
    });
  },

  intersect: function(array) {
    return this.uniq().findAll(function(item) {
      return array.detect(function(value) { return item === value });
    });
  },

  clone: function() {
    return [].concat(this);
  },

  size: function() {
    return this.length;
  },

  inspect: function() {
    return '[' + this.map(Object.inspect).join(', ') + ']';
  },

  toJSON: function() {
    var results = [];
    this.each(function(object) {
      var value = Object.toJSON(object);
      if (!Object.isUndefined(value)) results.push(value);
    });
    return '[' + results.join(', ') + ']';
  }
});

// use native browser JS 1.6 implementation if available
if (Object.isFunction(Array.prototype.forEach))
  Array.prototype._each = Array.prototype.forEach;

if (!Array.prototype.indexOf) Array.prototype.indexOf = function(item, i) {
  i || (i = 0);
  var length = this.length;
  if (i < 0) i = length + i;
  for (; i < length; i++)
    if (this[i] === item) return i;
  return -1;
};

if (!Array.prototype.lastIndexOf) Array.prototype.lastIndexOf = function(item, i) {
  i = isNaN(i) ? this.length : (i < 0 ? this.length + i : i) + 1;
  var n = this.slice(0, i).reverse().indexOf(item);
  return (n < 0) ? n : i - n - 1;
};

Array.prototype.toArray = Array.prototype.clone;

function $w(string) {
  if (!Object.isString(string)) return [];
  string = string.strip();
  return string ? string.split(/\s+/) : [];
}

if (Prototype.Browser.Opera){
  Array.prototype.concat = function() {
    var array = [];
    for (var i = 0, length = this.length; i < length; i++) array.push(this[i]);
    for (var i = 0, length = arguments.length; i < length; i++) {
      if (Object.isArray(arguments[i])) {
        for (var j = 0, arrayLength = arguments[i].length; j < arrayLength; j++)
          array.push(arguments[i][j]);
      } else {
        array.push(arguments[i]);
      }
    }
    return array;
  };
}
Object.extend(Number.prototype, {
  toColorPart: function() {
    return this.toPaddedString(2, 16);
  },

  succ: function() {
    return this + 1;
  },

  times: function(iterator, context) {
    $R(0, this, true).each(iterator, context);
    return this;
  },

  toPaddedString: function(length, radix) {
    var string = this.toString(radix || 10);
    return '0'.times(length - string.length) + string;
  },

  toJSON: function() {
    return isFinite(this) ? this.toString() : 'null';
  }
});

$w('abs round ceil floor').each(function(method){
  Number.prototype[method] = Math[method].methodize();
});
function $H(object) {
  return new Hash(object);
};

var Hash = Class.create(Enumerable, (function() {

  function toQueryPair(key, value) {
    if (Object.isUndefined(value)) return key;
    return key + '=' + encodeURIComponent(String.interpret(value));
  }

  return {
    initialize: function(object) {
      this._object = Object.isHash(object) ? object.toObject() : Object.clone(object);
    },

    _each: function(iterator) {
      for (var key in this._object) {
        var value = this._object[key], pair = [key, value];
        pair.key = key;
        pair.value = value;
        iterator(pair);
      }
    },

    set: function(key, value) {
      return this._object[key] = value;
    },

    get: function(key) {
      // simulating poorly supported hasOwnProperty
      if (this._object[key] !== Object.prototype[key])
        return this._object[key];
    },

    unset: function(key) {
      var value = this._object[key];
      delete this._object[key];
      return value;
    },

    toObject: function() {
      return Object.clone(this._object);
    },

    keys: function() {
      return this.pluck('key');
    },

    values: function() {
      return this.pluck('value');
    },

    index: function(value) {
      var match = this.detect(function(pair) {
        return pair.value === value;
      });
      return match && match.key;
    },

    merge: function(object) {
      return this.clone().update(object);
    },

    update: function(object) {
      return new Hash(object).inject(this, function(result, pair) {
        result.set(pair.key, pair.value);
        return result;
      });
    },

    toQueryString: function() {
      return this.inject([], function(results, pair) {
        var key = encodeURIComponent(pair.key), values = pair.value;

        if (values && typeof values == 'object') {
          if (Object.isArray(values))
            return results.concat(values.map(toQueryPair.curry(key)));
        } else results.push(toQueryPair(key, values));
        return results;
      }).join('&');
    },

    inspect: function() {
      return '#<Hash:{' + this.map(function(pair) {
        return pair.map(Object.inspect).join(': ');
      }).join(', ') + '}>';
    },

    toJSON: function() {
      return Object.toJSON(this.toObject());
    },

    clone: function() {
      return new Hash(this);
    }
  }
})());

Hash.prototype.toTemplateReplacements = Hash.prototype.toObject;
Hash.from = $H;
var ObjectRange = Class.create(Enumerable, {
  initialize: function(start, end, exclusive) {
    this.start = start;
    this.end = end;
    this.exclusive = exclusive;
  },

  _each: function(iterator) {
    var value = this.start;
    while (this.include(value)) {
      iterator(value);
      value = value.succ();
    }
  },

  include: function(value) {
    if (value < this.start)
      return false;
    if (this.exclusive)
      return value < this.end;
    return value <= this.end;
  }
});

var $R = function(start, end, exclusive) {
  return new ObjectRange(start, end, exclusive);
};

var Ajax = {
  getTransport: function() {
    return Try.these(
      function() {return new XMLHttpRequest()},
      function() {return new ActiveXObject('Msxml2.XMLHTTP')},
      function() {return new ActiveXObject('Microsoft.XMLHTTP')}
    ) || false;
  },

  activeRequestCount: 0
};

Ajax.Responders = {
  responders: [],

  _each: function(iterator) {
    this.responders._each(iterator);
  },

  register: function(responder) {
    if (!this.include(responder))
      this.responders.push(responder);
  },

  unregister: function(responder) {
    this.responders = this.responders.without(responder);
  },

  dispatch: function(callback, request, transport, json) {
    this.each(function(responder) {
      if (Object.isFunction(responder[callback])) {
        try {
          responder[callback].apply(responder, [request, transport, json]);
        } catch (e) { }
      }
    });
  }
};

Object.extend(Ajax.Responders, Enumerable);

Ajax.Responders.register({
  onCreate:   function() { Ajax.activeRequestCount++ },
  onComplete: function() { Ajax.activeRequestCount-- }
});

Ajax.Base = Class.create({
  initialize: function(options) {
    this.options = {
      method:       'post',
      asynchronous: true,
      contentType:  'application/x-www-form-urlencoded',
      encoding:     'UTF-8',
      parameters:   '',
      evalJSON:     true,
      evalJS:       true
    };
    Object.extend(this.options, options || { });

    this.options.method = this.options.method.toLowerCase();

    if (Object.isString(this.options.parameters))
      this.options.parameters = this.options.parameters.toQueryParams();
    else if (Object.isHash(this.options.parameters))
      this.options.parameters = this.options.parameters.toObject();
  }
});

Ajax.Request = Class.create(Ajax.Base, {
  _complete: false,

  initialize: function($super, url, options) {
    $super(options);
    this.transport = Ajax.getTransport();
    this.request(url);
  },

  request: function(url) {
    this.url = url;
    this.method = this.options.method;
    var params = Object.clone(this.options.parameters);

    if (!['get', 'post'].include(this.method)) {
      // simulate other verbs over post
      params['_method'] = this.method;
      this.method = 'post';
    }

    this.parameters = params;

    if (params = Object.toQueryString(params)) {
      // when GET, append parameters to URL
      if (this.method == 'get')
        this.url += (this.url.include('?') ? '&' : '?') + params;
      else if (/Konqueror|Safari|KHTML/.test(navigator.userAgent))
        params += '&_=';
    }

    try {
      var response = new Ajax.Response(this);
      if (this.options.onCreate) this.options.onCreate(response);
      Ajax.Responders.dispatch('onCreate', this, response);

      this.transport.open(this.method.toUpperCase(), this.url,
        this.options.asynchronous);

      if (this.options.asynchronous) this.respondToReadyState.bind(this).defer(1);

      this.transport.onreadystatechange = this.onStateChange.bind(this);
      this.setRequestHeaders();

      this.body = this.method == 'post' ? (this.options.postBody || params) : null;
      this.transport.send(this.body);

      /* Force Firefox to handle ready state 4 for synchronous requests */
      if (!this.options.asynchronous && this.transport.overrideMimeType)
        this.onStateChange();

    }
    catch (e) {
      this.dispatchException(e);
    }
  },

  onStateChange: function() {
    var readyState = this.transport.readyState;
    if (readyState > 1 && !((readyState == 4) && this._complete))
      this.respondToReadyState(this.transport.readyState);
  },

  setRequestHeaders: function() {
    var headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Prototype-Version': Prototype.Version,
      'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
    };

    if (this.method == 'post') {
      headers['Content-type'] = this.options.contentType +
        (this.options.encoding ? '; charset=' + this.options.encoding : '');

      /* Force "Connection: close" for older Mozilla browsers to work
       * around a bug where XMLHttpRequest sends an incorrect
       * Content-length header. See Mozilla Bugzilla #246651.
       */
      if (this.transport.overrideMimeType &&
          (navigator.userAgent.match(/Gecko\/(\d{4})/) || [0,2005])[1] < 2005)
            headers['Connection'] = 'close';
    }

    // user-defined headers
    if (typeof this.options.requestHeaders == 'object') {
      var extras = this.options.requestHeaders;

      if (Object.isFunction(extras.push))
        for (var i = 0, length = extras.length; i < length; i += 2)
          headers[extras[i]] = extras[i+1];
      else
        $H(extras).each(function(pair) { headers[pair.key] = pair.value });
    }

    for (var name in headers)
      this.transport.setRequestHeader(name, headers[name]);
  },

  success: function() {
    var status = this.getStatus();
    return !status || (status >= 200 && status < 300);
  },

  getStatus: function() {
    try {
      return this.transport.status || 0;
    } catch (e) { return 0 }
  },

  respondToReadyState: function(readyState) {
    var state = Ajax.Request.Events[readyState], response = new Ajax.Response(this);

    if (state == 'Complete') {
      try {
        this._complete = true;
        (this.options['on' + response.status]
         || this.options['on' + (this.success() ? 'Success' : 'Failure')]
         || Prototype.emptyFunction)(response, response.headerJSON);
      } catch (e) {
        this.dispatchException(e);
      }

      var contentType = response.getHeader('Content-type');
      if (this.options.evalJS == 'force'
          || (this.options.evalJS && this.isSameOrigin() && contentType
          && contentType.match(/^\s*(text|application)\/(x-)?(java|ecma)script(;.*)?\s*$/i)))
        this.evalResponse();
    }

    try {
      (this.options['on' + state] || Prototype.emptyFunction)(response, response.headerJSON);
      Ajax.Responders.dispatch('on' + state, this, response, response.headerJSON);
    } catch (e) {
      this.dispatchException(e);
    }

    if (state == 'Complete') {
      // avoid memory leak in MSIE: clean up
      this.transport.onreadystatechange = Prototype.emptyFunction;
    }
  },

  isSameOrigin: function() {
    var m = this.url.match(/^\s*https?:\/\/[^\/]*/);
    return !m || (m[0] == '#{protocol}//#{domain}#{port}'.interpolate({
      protocol: location.protocol,
      domain: document.domain,
      port: location.port ? ':' + location.port : ''
    }));
  },

  getHeader: function(name) {
    try {
      return this.transport.getResponseHeader(name) || null;
    } catch (e) { return null }
  },

  evalResponse: function() {
    try {
      return eval((this.transport.responseText || '').unfilterJSON());
    } catch (e) {
      this.dispatchException(e);
    }
  },

  dispatchException: function(exception) {
    (this.options.onException || Prototype.emptyFunction)(this, exception);
    Ajax.Responders.dispatch('onException', this, exception);
  }
});

Ajax.Request.Events =
  ['Uninitialized', 'Loading', 'Loaded', 'Interactive', 'Complete'];

Ajax.Response = Class.create({
  initialize: function(request){
    this.request = request;
    var transport  = this.transport  = request.transport,
        readyState = this.readyState = transport.readyState;

    if((readyState > 2 && !Prototype.Browser.IE) || readyState == 4) {
      this.status       = this.getStatus();
      this.statusText   = this.getStatusText();
      this.responseText = String.interpret(transport.responseText);
      this.headerJSON   = this._getHeaderJSON();
    }

    if(readyState == 4) {
      var xml = transport.responseXML;
      this.responseXML  = Object.isUndefined(xml) ? null : xml;
      this.responseJSON = this._getResponseJSON();
    }
  },

  status:      0,
  statusText: '',

  getStatus: Ajax.Request.prototype.getStatus,

  getStatusText: function() {
    try {
      return this.transport.statusText || '';
    } catch (e) { return '' }
  },

  getHeader: Ajax.Request.prototype.getHeader,

  getAllHeaders: function() {
    try {
      return this.getAllResponseHeaders();
    } catch (e) { return null }
  },

  getResponseHeader: function(name) {
    return this.transport.getResponseHeader(name);
  },

  getAllResponseHeaders: function() {
    return this.transport.getAllResponseHeaders();
  },

  _getHeaderJSON: function() {
    var json = this.getHeader('X-JSON');
    if (!json) return null;
    json = decodeURIComponent(escape(json));
    try {
      return json.evalJSON(this.request.options.sanitizeJSON ||
        !this.request.isSameOrigin());
    } catch (e) {
      this.request.dispatchException(e);
    }
  },

  _getResponseJSON: function() {
    var options = this.request.options;
    if (!options.evalJSON || (options.evalJSON != 'force' &&
      !(this.getHeader('Content-type') || '').include('application/json')) ||
        this.responseText.blank())
          return null;
    try {
      return this.responseText.evalJSON(options.sanitizeJSON ||
        !this.request.isSameOrigin());
    } catch (e) {
      this.request.dispatchException(e);
    }
  }
});

Ajax.Updater = Class.create(Ajax.Request, {
  initialize: function($super, container, url, options) {
    this.container = {
      success: (container.success || container),
      failure: (container.failure || (container.success ? null : container))
    };

    options = Object.clone(options);
    var onComplete = options.onComplete;
    options.onComplete = (function(response, json) {
      this.updateContent(response.responseText);
      if (Object.isFunction(onComplete)) onComplete(response, json);
    }).bind(this);

    $super(url, options);
  },

  updateContent: function(responseText) {
    var receiver = this.container[this.success() ? 'success' : 'failure'],
        options = this.options;

    if (!options.evalScripts) responseText = responseText.stripScripts();

    if (receiver = $(receiver)) {
      if (options.insertion) {
        if (Object.isString(options.insertion)) {
          var insertion = { }; insertion[options.insertion] = responseText;
          receiver.insert(insertion);
        }
        else options.insertion(receiver, responseText);
      }
      else receiver.update(responseText);
    }
  }
});

Ajax.PeriodicalUpdater = Class.create(Ajax.Base, {
  initialize: function($super, container, url, options) {
    $super(options);
    this.onComplete = this.options.onComplete;

    this.frequency = (this.options.frequency || 2);
    this.decay = (this.options.decay || 1);

    this.updater = { };
    this.container = container;
    this.url = url;

    this.start();
  },

  start: function() {
    this.options.onComplete = this.updateComplete.bind(this);
    this.onTimerEvent();
  },

  stop: function() {
    this.updater.options.onComplete = undefined;
    clearTimeout(this.timer);
    (this.onComplete || Prototype.emptyFunction).apply(this, arguments);
  },

  updateComplete: function(response) {
    if (this.options.decay) {
      this.decay = (response.responseText == this.lastText ?
        this.decay * this.options.decay : 1);

      this.lastText = response.responseText;
    }
    this.timer = this.onTimerEvent.bind(this).delay(this.decay * this.frequency);
  },

  onTimerEvent: function() {
    this.updater = new Ajax.Updater(this.container, this.url, this.options);
  }
});
function $(element) {
  if (arguments.length > 1) {
    for (var i = 0, elements = [], length = arguments.length; i < length; i++)
      elements.push($(arguments[i]));
    return elements;
  }
  if (Object.isString(element))
    element = document.getElementById(element);
  return Element.extend(element);
}

if (Prototype.BrowserFeatures.XPath) {
  document._getElementsByXPath = function(expression, parentElement) {
    var results = [];
    var query = document.evaluate(expression, $(parentElement) || document,
      null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (var i = 0, length = query.snapshotLength; i < length; i++)
      results.push(Element.extend(query.snapshotItem(i)));
    return results;
  };
}

/*--------------------------------------------------------------------------*/

if (!window.Node) var Node = { };

if (!Node.ELEMENT_NODE) {
  // DOM level 2 ECMAScript Language Binding
  Object.extend(Node, {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12
  });
}

(function() {
  var element = this.Element;
  this.Element = function(tagName, attributes) {
    attributes = attributes || { };
    tagName = tagName.toLowerCase();
    var cache = Element.cache;
    if (Prototype.Browser.IE && attributes.name) {
      tagName = '<' + tagName + ' name="' + attributes.name + '">';
      delete attributes.name;
      return Element.writeAttribute(document.createElement(tagName), attributes);
    }
    if (!cache[tagName]) cache[tagName] = Element.extend(document.createElement(tagName));
    return Element.writeAttribute(cache[tagName].cloneNode(false), attributes);
  };
  Object.extend(this.Element, element || { });
  if (element) this.Element.prototype = element.prototype;
}).call(window);

Element.cache = { };

Element.Methods = {
  visible: function(element) {
    return $(element).style.display != 'none';
  },

  toggle: function(element) {
    element = $(element);
    Element[Element.visible(element) ? 'hide' : 'show'](element);
    return element;
  },

  hide: function(element) {
    element = $(element);
    element.style.display = 'none';
    return element;
  },

  show: function(element) {
    element = $(element);
    element.style.display = '';
    return element;
  },

  remove: function(element) {
    element = $(element);
    element.parentNode.removeChild(element);
    return element;
  },

  update: function(element, content) {
    element = $(element);
    if (content && content.toElement) content = content.toElement();
    if (Object.isElement(content)) return element.update().insert(content);
    content = Object.toHTML(content);
    element.innerHTML = content.stripScripts();
    content.evalScripts.bind(content).defer();
    return element;
  },

  replace: function(element, content) {
    element = $(element);
    if (content && content.toElement) content = content.toElement();
    else if (!Object.isElement(content)) {
      content = Object.toHTML(content);
      var range = element.ownerDocument.createRange();
      range.selectNode(element);
      content.evalScripts.bind(content).defer();
      content = range.createContextualFragment(content.stripScripts());
    }
    element.parentNode.replaceChild(content, element);
    return element;
  },

  insert: function(element, insertions) {
    element = $(element);

    if (Object.isString(insertions) || Object.isNumber(insertions) ||
        Object.isElement(insertions) || (insertions && (insertions.toElement || insertions.toHTML)))
          insertions = {bottom:insertions};

    var content, insert, tagName, childNodes;

    for (var position in insertions) {
      content  = insertions[position];
      position = position.toLowerCase();
      insert = Element._insertionTranslations[position];

      if (content && content.toElement) content = content.toElement();
      if (Object.isElement(content)) {
        insert(element, content);
        continue;
      }

      content = Object.toHTML(content);

      tagName = ((position == 'before' || position == 'after')
        ? element.parentNode : element).tagName.toUpperCase();

      childNodes = Element._getContentFromAnonymousElement(tagName, content.stripScripts());

      if (position == 'top' || position == 'after') childNodes.reverse();
      childNodes.each(insert.curry(element));

      content.evalScripts.bind(content).defer();
    }

    return element;
  },

  wrap: function(element, wrapper, attributes) {
    element = $(element);
    if (Object.isElement(wrapper))
      $(wrapper).writeAttribute(attributes || { });
    else if (Object.isString(wrapper)) wrapper = new Element(wrapper, attributes);
    else wrapper = new Element('div', wrapper);
    if (element.parentNode)
      element.parentNode.replaceChild(wrapper, element);
    wrapper.appendChild(element);
    return wrapper;
  },

  inspect: function(element) {
    element = $(element);
    var result = '<' + element.tagName.toLowerCase();
    $H({'id': 'id', 'className': 'class'}).each(function(pair) {
      var property = pair.first(), attribute = pair.last();
      var value = (element[property] || '').toString();
      if (value) result += ' ' + attribute + '=' + value.inspect(true);
    });
    return result + '>';
  },

  recursivelyCollect: function(element, property) {
    element = $(element);
    var elements = [];
    while (element = element[property])
      if (element.nodeType == 1)
        elements.push(Element.extend(element));
    return elements;
  },

  ancestors: function(element) {
    return $(element).recursivelyCollect('parentNode');
  },

  descendants: function(element) {
    return $(element).select("*");
  },

  firstDescendant: function(element) {
    element = $(element).firstChild;
    while (element && element.nodeType != 1) element = element.nextSibling;
    return $(element);
  },

  immediateDescendants: function(element) {
    if (!(element = $(element).firstChild)) return [];
    while (element && element.nodeType != 1) element = element.nextSibling;
    if (element) return [element].concat($(element).nextSiblings());
    return [];
  },

  previousSiblings: function(element) {
    return $(element).recursivelyCollect('previousSibling');
  },

  nextSiblings: function(element) {
    return $(element).recursivelyCollect('nextSibling');
  },

  siblings: function(element) {
    element = $(element);
    return element.previousSiblings().reverse().concat(element.nextSiblings());
  },

  match: function(element, selector) {
    if (Object.isString(selector))
      selector = new Selector(selector);
    return selector.match($(element));
  },

  up: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(element.parentNode);
    var ancestors = element.ancestors();
    return Object.isNumber(expression) ? ancestors[expression] :
      Selector.findElement(ancestors, expression, index);
  },

  down: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return element.firstDescendant();
    return Object.isNumber(expression) ? element.descendants()[expression] :
      Element.select(element, expression)[index || 0];
  },

  previous: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(Selector.handlers.previousElementSibling(element));
    var previousSiblings = element.previousSiblings();
    return Object.isNumber(expression) ? previousSiblings[expression] :
      Selector.findElement(previousSiblings, expression, index);
  },

  next: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(Selector.handlers.nextElementSibling(element));
    var nextSiblings = element.nextSiblings();
    return Object.isNumber(expression) ? nextSiblings[expression] :
      Selector.findElement(nextSiblings, expression, index);
  },

  select: function() {
    var args = $A(arguments), element = $(args.shift());
    return Selector.findChildElements(element, args);
  },

  adjacent: function() {
    var args = $A(arguments), element = $(args.shift());
    return Selector.findChildElements(element.parentNode, args).without(element);
  },

  identify: function(element) {
    element = $(element);
    var id = element.readAttribute('id'), self = arguments.callee;
    if (id) return id;
    do { id = 'anonymous_element_' + self.counter++ } while ($(id));
    element.writeAttribute('id', id);
    return id;
  },

  readAttribute: function(element, name) {
    element = $(element);
    if (Prototype.Browser.IE) {
      var t = Element._attributeTranslations.read;
      if (t.values[name]) return t.values[name](element, name);
      if (t.names[name]) name = t.names[name];
      if (name.include(':')) {
        return (!element.attributes || !element.attributes[name]) ? null :
         element.attributes[name].value;
      }
    }
    return element.getAttribute(name);
  },

  writeAttribute: function(element, name, value) {
    element = $(element);
    var attributes = { }, t = Element._attributeTranslations.write;

    if (typeof name == 'object') attributes = name;
    else attributes[name] = Object.isUndefined(value) ? true : value;

    for (var attr in attributes) {
      name = t.names[attr] || attr;
      value = attributes[attr];
      if (t.values[attr]) name = t.values[attr](element, value);
      if (value === false || value === null)
        element.removeAttribute(name);
      else if (value === true)
        element.setAttribute(name, name);
      else element.setAttribute(name, value);
    }
    return element;
  },

  getHeight: function(element) {
    return $(element).getDimensions().height;
  },

  getWidth: function(element) {
    return $(element).getDimensions().width;
  },

  classNames: function(element) {
    return new Element.ClassNames(element);
  },

  hasClassName: function(element, className) {
    if (!(element = $(element))) return;
    var elementClassName = element.className;
    return (elementClassName.length > 0 && (elementClassName == className ||
      new RegExp("(^|\\s)" + className + "(\\s|$)").test(elementClassName)));
  },

  addClassName: function(element, className) {
    if (!(element = $(element))) return;
    if (!element.hasClassName(className))
      element.className += (element.className ? ' ' : '') + className;
    return element;
  },

  removeClassName: function(element, className) {
    if (!(element = $(element))) return;
    element.className = element.className.replace(
      new RegExp("(^|\\s+)" + className + "(\\s+|$)"), ' ').strip();
    return element;
  },

  toggleClassName: function(element, className) {
    if (!(element = $(element))) return;
    return element[element.hasClassName(className) ?
      'removeClassName' : 'addClassName'](className);
  },

  // removes whitespace-only text node children
  cleanWhitespace: function(element) {
    element = $(element);
    var node = element.firstChild;
    while (node) {
      var nextNode = node.nextSibling;
      if (node.nodeType == 3 && !/\S/.test(node.nodeValue))
        element.removeChild(node);
      node = nextNode;
    }
    return element;
  },

  empty: function(element) {
    return $(element).innerHTML.blank();
  },

  descendantOf: function(element, ancestor) {
    element = $(element), ancestor = $(ancestor);

    if (element.compareDocumentPosition)
      return (element.compareDocumentPosition(ancestor) & 8) === 8;

    if (ancestor.contains)
      return ancestor.contains(element) && ancestor !== element;

    while (element = element.parentNode)
      if (element == ancestor) return true;

    return false;
  },

  scrollTo: function(element) {
    element = $(element);
    var pos = element.cumulativeOffset();
    window.scrollTo(pos[0], pos[1]);
    return element;
  },

  getStyle: function(element, style) {
    element = $(element);
    style = style == 'float' ? 'cssFloat' : style.camelize();
    var value = element.style[style];
    if (!value || value == 'auto') {
      var css = document.defaultView.getComputedStyle(element, null);
      value = css ? css[style] : null;
    }
    if (style == 'opacity') return value ? parseFloat(value) : 1.0;
    return value == 'auto' ? null : value;
  },

  getOpacity: function(element) {
    return $(element).getStyle('opacity');
  },

  setStyle: function(element, styles) {
    element = $(element);
    var elementStyle = element.style, match;
    if (Object.isString(styles)) {
      element.style.cssText += ';' + styles;
      return styles.include('opacity') ?
        element.setOpacity(styles.match(/opacity:\s*(\d?\.?\d*)/)[1]) : element;
    }
    for (var property in styles)
      if (property == 'opacity') element.setOpacity(styles[property]);
      else
        elementStyle[(property == 'float' || property == 'cssFloat') ?
          (Object.isUndefined(elementStyle.styleFloat) ? 'cssFloat' : 'styleFloat') :
            property] = styles[property];

    return element;
  },

  setOpacity: function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1 || value === '') ? '' :
      (value < 0.00001) ? 0 : value;
    return element;
  },

  getDimensions: function(element) {
    element = $(element);
    var display = element.getStyle('display');
    if (display != 'none' && display != null) // Safari bug
      return {width: element.offsetWidth, height: element.offsetHeight};

    // All *Width and *Height properties give 0 on elements with display none,
    // so enable the element temporarily
    var els = element.style;
    var originalVisibility = els.visibility;
    var originalPosition = els.position;
    var originalDisplay = els.display;
    els.visibility = 'hidden';
    els.position = 'absolute';
    els.display = 'block';
    var originalWidth = element.clientWidth;
    var originalHeight = element.clientHeight;
    els.display = originalDisplay;
    els.position = originalPosition;
    els.visibility = originalVisibility;
    return {width: originalWidth, height: originalHeight};
  },

  makePositioned: function(element) {
    element = $(element);
    var pos = Element.getStyle(element, 'position');
    if (pos == 'static' || !pos) {
      element._madePositioned = true;
      element.style.position = 'relative';
      // Opera returns the offset relative to the positioning context, when an
      // element is position relative but top and left have not been defined
      if (Prototype.Browser.Opera) {
        element.style.top = 0;
        element.style.left = 0;
      }
    }
    return element;
  },

  undoPositioned: function(element) {
    element = $(element);
    if (element._madePositioned) {
      element._madePositioned = undefined;
      element.style.position =
        element.style.top =
        element.style.left =
        element.style.bottom =
        element.style.right = '';
    }
    return element;
  },

  makeClipping: function(element) {
    element = $(element);
    if (element._overflow) return element;
    element._overflow = Element.getStyle(element, 'overflow') || 'auto';
    if (element._overflow !== 'hidden')
      element.style.overflow = 'hidden';
    return element;
  },

  undoClipping: function(element) {
    element = $(element);
    if (!element._overflow) return element;
    element.style.overflow = element._overflow == 'auto' ? '' : element._overflow;
    element._overflow = null;
    return element;
  },

  cumulativeOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
    } while (element);
    return Element._returnOffset(valueL, valueT);
  },

  positionedOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
      if (element) {
        if (element.tagName.toUpperCase() == 'BODY') break;
        var p = Element.getStyle(element, 'position');
        if (p !== 'static') break;
      }
    } while (element);
    return Element._returnOffset(valueL, valueT);
  },

  absolutize: function(element) {
    element = $(element);
    if (element.getStyle('position') == 'absolute') return element;
    // Position.prepare(); // To be done manually by Scripty when it needs it.

    var offsets = element.positionedOffset();
    var top     = offsets[1];
    var left    = offsets[0];
    var width   = element.clientWidth;
    var height  = element.clientHeight;

    element._originalLeft   = left - parseFloat(element.style.left  || 0);
    element._originalTop    = top  - parseFloat(element.style.top || 0);
    element._originalWidth  = element.style.width;
    element._originalHeight = element.style.height;

    element.style.position = 'absolute';
    element.style.top    = top + 'px';
    element.style.left   = left + 'px';
    element.style.width  = width + 'px';
    element.style.height = height + 'px';
    return element;
  },

  relativize: function(element) {
    element = $(element);
    if (element.getStyle('position') == 'relative') return element;
    // Position.prepare(); // To be done manually by Scripty when it needs it.

    element.style.position = 'relative';
    var top  = parseFloat(element.style.top  || 0) - (element._originalTop || 0);
    var left = parseFloat(element.style.left || 0) - (element._originalLeft || 0);

    element.style.top    = top + 'px';
    element.style.left   = left + 'px';
    element.style.height = element._originalHeight;
    element.style.width  = element._originalWidth;
    return element;
  },

  cumulativeScrollOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.scrollTop  || 0;
      valueL += element.scrollLeft || 0;
      element = element.parentNode;
    } while (element);
    return Element._returnOffset(valueL, valueT);
  },

  getOffsetParent: function(element) {
    if (element.offsetParent) return $(element.offsetParent);
    if (element == document.body) return $(element);

    while ((element = element.parentNode) && element != document.body)
      if (Element.getStyle(element, 'position') != 'static')
        return $(element);

    return $(document.body);
  },

  viewportOffset: function(forElement) {
    var valueT = 0, valueL = 0;

    var element = forElement;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;

      // Safari fix
      if (element.offsetParent == document.body &&
        Element.getStyle(element, 'position') == 'absolute') break;

    } while (element = element.offsetParent);

    element = forElement;
    do {
      if (!Prototype.Browser.Opera || (element.tagName && (element.tagName.toUpperCase() == 'BODY'))) {
        valueT -= element.scrollTop  || 0;
        valueL -= element.scrollLeft || 0;
      }
    } while (element = element.parentNode);

    return Element._returnOffset(valueL, valueT);
  },

  clonePosition: function(element, source) {
    var options = Object.extend({
      setLeft:    true,
      setTop:     true,
      setWidth:   true,
      setHeight:  true,
      offsetTop:  0,
      offsetLeft: 0
    }, arguments[2] || { });

    // find page position of source
    source = $(source);
    var p = source.viewportOffset();

    // find coordinate system to use
    element = $(element);
    var delta = [0, 0];
    var parent = null;
    // delta [0,0] will do fine with position: fixed elements,
    // position:absolute needs offsetParent deltas
    if (Element.getStyle(element, 'position') == 'absolute') {
      parent = element.getOffsetParent();
      delta = parent.viewportOffset();
    }

    // correct by body offsets (fixes Safari)
    if (parent == document.body) {
      delta[0] -= document.body.offsetLeft;
      delta[1] -= document.body.offsetTop;
    }

    // set position
    if (options.setLeft)   element.style.left  = (p[0] - delta[0] + options.offsetLeft) + 'px';
    if (options.setTop)    element.style.top   = (p[1] - delta[1] + options.offsetTop) + 'px';
    if (options.setWidth)  element.style.width = source.offsetWidth + 'px';
    if (options.setHeight) element.style.height = source.offsetHeight + 'px';
    return element;
  }
};

Element.Methods.identify.counter = 1;

Object.extend(Element.Methods, {
  getElementsBySelector: Element.Methods.select,
  childElements: Element.Methods.immediateDescendants
});

Element._attributeTranslations = {
  write: {
    names: {
      className: 'class',
      htmlFor:   'for'
    },
    values: { }
  }
};

if (Prototype.Browser.Opera) {
  Element.Methods.getStyle = Element.Methods.getStyle.wrap(
    function(proceed, element, style) {
      switch (style) {
        case 'left': case 'top': case 'right': case 'bottom':
          if (proceed(element, 'position') === 'static') return null;
        case 'height': case 'width':
          // returns '0px' for hidden elements; we want it to return null
          if (!Element.visible(element)) return null;

          // returns the border-box dimensions rather than the content-box
          // dimensions, so we subtract padding and borders from the value
          var dim = parseInt(proceed(element, style), 10);

          if (dim !== element['offset' + style.capitalize()])
            return dim + 'px';

          var properties;
          if (style === 'height') {
            properties = ['border-top-width', 'padding-top',
             'padding-bottom', 'border-bottom-width'];
          }
          else {
            properties = ['border-left-width', 'padding-left',
             'padding-right', 'border-right-width'];
          }
          return properties.inject(dim, function(memo, property) {
            var val = proceed(element, property);
            return val === null ? memo : memo - parseInt(val, 10);
          }) + 'px';
        default: return proceed(element, style);
      }
    }
  );

  Element.Methods.readAttribute = Element.Methods.readAttribute.wrap(
    function(proceed, element, attribute) {
      if (attribute === 'title') return element.title;
      return proceed(element, attribute);
    }
  );
}

else if (Prototype.Browser.IE) {
  // IE doesn't report offsets correctly for static elements, so we change them
  // to "relative" to get the values, then change them back.
  Element.Methods.getOffsetParent = Element.Methods.getOffsetParent.wrap(
    function(proceed, element) {
      element = $(element);
      // IE throws an error if element is not in document
      try { element.offsetParent }
      catch(e) { return $(document.body) }
      var position = element.getStyle('position');
      if (position !== 'static') return proceed(element);
      element.setStyle({ position: 'relative' });
      var value = proceed(element);
      element.setStyle({ position: position });
      return value;
    }
  );

  $w('positionedOffset viewportOffset').each(function(method) {
    Element.Methods[method] = Element.Methods[method].wrap(
      function(proceed, element) {
        element = $(element);
        try { element.offsetParent }
        catch(e) { return Element._returnOffset(0,0) }
        var position = element.getStyle('position');
        if (position !== 'static') return proceed(element);
        // Trigger hasLayout on the offset parent so that IE6 reports
        // accurate offsetTop and offsetLeft values for position: fixed.
        var offsetParent = element.getOffsetParent();
        if (offsetParent && offsetParent.getStyle('position') === 'fixed')
          offsetParent.setStyle({ zoom: 1 });
        element.setStyle({ position: 'relative' });
        var value = proceed(element);
        element.setStyle({ position: position });
        return value;
      }
    );
  });

  Element.Methods.cumulativeOffset = Element.Methods.cumulativeOffset.wrap(
    function(proceed, element) {
      try { element.offsetParent }
      catch(e) { return Element._returnOffset(0,0) }
      return proceed(element);
    }
  );

  Element.Methods.getStyle = function(element, style) {
    element = $(element);
    style = (style == 'float' || style == 'cssFloat') ? 'styleFloat' : style.camelize();
    var value = element.style[style];
    if (!value && element.currentStyle) value = element.currentStyle[style];

    if (style == 'opacity') {
      if (value = (element.getStyle('filter') || '').match(/alpha\(opacity=(.*)\)/))
        if (value[1]) return parseFloat(value[1]) / 100;
      return 1.0;
    }

    if (value == 'auto') {
      if ((style == 'width' || style == 'height') && (element.getStyle('display') != 'none'))
        return element['offset' + style.capitalize()] + 'px';
      return null;
    }
    return value;
  };

  Element.Methods.setOpacity = function(element, value) {
    function stripAlpha(filter){
      return filter.replace(/alpha\([^\)]*\)/gi,'');
    }
    element = $(element);
    var currentStyle = element.currentStyle;
    if ((currentStyle && !currentStyle.hasLayout) ||
      (!currentStyle && element.style.zoom == 'normal'))
        element.style.zoom = 1;

    var filter = element.getStyle('filter'), style = element.style;
    if (value == 1 || value === '') {
      (filter = stripAlpha(filter)) ?
        style.filter = filter : style.removeAttribute('filter');
      return element;
    } else if (value < 0.00001) value = 0;
    style.filter = stripAlpha(filter) +
      'alpha(opacity=' + (value * 100) + ')';
    return element;
  };

  Element._attributeTranslations = {
    read: {
      names: {
        'class': 'className',
        'for':   'htmlFor'
      },
      values: {
        _getAttr: function(element, attribute) {
          return element.getAttribute(attribute, 2);
        },
        _getAttrNode: function(element, attribute) {
          var node = element.getAttributeNode(attribute);
          return node ? node.value : "";
        },
        _getEv: function(element, attribute) {
          attribute = element.getAttribute(attribute);
          return attribute ? attribute.toString().slice(23, -2) : null;
        },
        _flag: function(element, attribute) {
          return $(element).hasAttribute(attribute) ? attribute : null;
        },
        style: function(element) {
          return element.style.cssText.toLowerCase();
        },
        title: function(element) {
          return element.title;
        }
      }
    }
  };

  Element._attributeTranslations.write = {
    names: Object.extend({
      cellpadding: 'cellPadding',
      cellspacing: 'cellSpacing'
    }, Element._attributeTranslations.read.names),
    values: {
      checked: function(element, value) {
        element.checked = !!value;
      },

      style: function(element, value) {
        element.style.cssText = value ? value : '';
      }
    }
  };

  Element._attributeTranslations.has = {};

  $w('colSpan rowSpan vAlign dateTime accessKey tabIndex ' +
      'encType maxLength readOnly longDesc frameBorder').each(function(attr) {
    Element._attributeTranslations.write.names[attr.toLowerCase()] = attr;
    Element._attributeTranslations.has[attr.toLowerCase()] = attr;
  });

  (function(v) {
    Object.extend(v, {
      href:        v._getAttr,
      src:         v._getAttr,
      type:        v._getAttr,
      action:      v._getAttrNode,
      disabled:    v._flag,
      checked:     v._flag,
      readonly:    v._flag,
      multiple:    v._flag,
      onload:      v._getEv,
      onunload:    v._getEv,
      onclick:     v._getEv,
      ondblclick:  v._getEv,
      onmousedown: v._getEv,
      onmouseup:   v._getEv,
      onmouseover: v._getEv,
      onmousemove: v._getEv,
      onmouseout:  v._getEv,
      onfocus:     v._getEv,
      onblur:      v._getEv,
      onkeypress:  v._getEv,
      onkeydown:   v._getEv,
      onkeyup:     v._getEv,
      onsubmit:    v._getEv,
      onreset:     v._getEv,
      onselect:    v._getEv,
      onchange:    v._getEv
    });
  })(Element._attributeTranslations.read.values);
}

else if (Prototype.Browser.Gecko && /rv:1\.8\.0/.test(navigator.userAgent)) {
  Element.Methods.setOpacity = function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1) ? 0.999999 :
      (value === '') ? '' : (value < 0.00001) ? 0 : value;
    return element;
  };
}

else if (Prototype.Browser.WebKit) {
  Element.Methods.setOpacity = function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1 || value === '') ? '' :
      (value < 0.00001) ? 0 : value;

    if (value == 1)
      if(element.tagName.toUpperCase() == 'IMG' && element.width) {
        element.width++; element.width--;
      } else try {
        var n = document.createTextNode(' ');
        element.appendChild(n);
        element.removeChild(n);
      } catch (e) { }

    return element;
  };

  // Safari returns margins on body which is incorrect if the child is absolutely
  // positioned.  For performance reasons, redefine Element#cumulativeOffset for
  // KHTML/WebKit only.
  Element.Methods.cumulativeOffset = function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      if (element.offsetParent == document.body)
        if (Element.getStyle(element, 'position') == 'absolute') break;

      element = element.offsetParent;
    } while (element);

    return Element._returnOffset(valueL, valueT);
  };
}

if (Prototype.Browser.IE || Prototype.Browser.Opera) {
  // IE and Opera are missing .innerHTML support for TABLE-related and SELECT elements
  Element.Methods.update = function(element, content) {
    element = $(element);

    if (content && content.toElement) content = content.toElement();
    if (Object.isElement(content)) return element.update().insert(content);

    content = Object.toHTML(content);
    var tagName = element.tagName.toUpperCase();

    if (tagName in Element._insertionTranslations.tags) {
      $A(element.childNodes).each(function(node) { element.removeChild(node) });
      Element._getContentFromAnonymousElement(tagName, content.stripScripts())
        .each(function(node) { element.appendChild(node) });
    }
    else element.innerHTML = content.stripScripts();

    content.evalScripts.bind(content).defer();
    return element;
  };
}

if ('outerHTML' in document.createElement('div')) {
  Element.Methods.replace = function(element, content) {
    element = $(element);

    if (content && content.toElement) content = content.toElement();
    if (Object.isElement(content)) {
      element.parentNode.replaceChild(content, element);
      return element;
    }

    content = Object.toHTML(content);
    var parent = element.parentNode, tagName = parent.tagName.toUpperCase();

    if (Element._insertionTranslations.tags[tagName]) {
      var nextSibling = element.next();
      var fragments = Element._getContentFromAnonymousElement(tagName, content.stripScripts());
      parent.removeChild(element);
      if (nextSibling)
        fragments.each(function(node) { parent.insertBefore(node, nextSibling) });
      else
        fragments.each(function(node) { parent.appendChild(node) });
    }
    else element.outerHTML = content.stripScripts();

    content.evalScripts.bind(content).defer();
    return element;
  };
}

Element._returnOffset = function(l, t) {
  var result = [l, t];
  result.left = l;
  result.top = t;
  return result;
};

Element._getContentFromAnonymousElement = function(tagName, html) {
  var div = new Element('div'), t = Element._insertionTranslations.tags[tagName];
  if (t) {
    div.innerHTML = t[0] + html + t[1];
    t[2].times(function() { div = div.firstChild });
  } else div.innerHTML = html;
  return $A(div.childNodes);
};

Element._insertionTranslations = {
  before: function(element, node) {
    element.parentNode.insertBefore(node, element);
  },
  top: function(element, node) {
    element.insertBefore(node, element.firstChild);
  },
  bottom: function(element, node) {
    element.appendChild(node);
  },
  after: function(element, node) {
    element.parentNode.insertBefore(node, element.nextSibling);
  },
  tags: {
    TABLE:  ['<table>',                '</table>',                   1],
    TBODY:  ['<table><tbody>',         '</tbody></table>',           2],
    TR:     ['<table><tbody><tr>',     '</tr></tbody></table>',      3],
    TD:     ['<table><tbody><tr><td>', '</td></tr></tbody></table>', 4],
    SELECT: ['<select>',               '</select>',                  1]
  }
};

(function() {
  Object.extend(this.tags, {
    THEAD: this.tags.TBODY,
    TFOOT: this.tags.TBODY,
    TH:    this.tags.TD
  });
}).call(Element._insertionTranslations);

Element.Methods.Simulated = {
  hasAttribute: function(element, attribute) {
    attribute = Element._attributeTranslations.has[attribute] || attribute;
    var node = $(element).getAttributeNode(attribute);
    return !!(node && node.specified);
  }
};

Element.Methods.ByTag = { };

Object.extend(Element, Element.Methods);

if (!Prototype.BrowserFeatures.ElementExtensions &&
    document.createElement('div')['__proto__']) {
  window.HTMLElement = { };
  window.HTMLElement.prototype = document.createElement('div')['__proto__'];
  Prototype.BrowserFeatures.ElementExtensions = true;
}

Element.extend = (function() {
  if (Prototype.BrowserFeatures.SpecificElementExtensions)
    return Prototype.K;

  var Methods = { }, ByTag = Element.Methods.ByTag;

  var extend = Object.extend(function(element) {
    if (!element || element._extendedByPrototype ||
        element.nodeType != 1 || element == window) return element;

    var methods = Object.clone(Methods),
      tagName = element.tagName.toUpperCase(), property, value;

    // extend methods for specific tags
    if (ByTag[tagName]) Object.extend(methods, ByTag[tagName]);

    for (property in methods) {
      value = methods[property];
      if (Object.isFunction(value) && !(property in element))
        element[property] = value.methodize();
    }

    element._extendedByPrototype = Prototype.emptyFunction;
    return element;

  }, {
    refresh: function() {
      // extend methods for all tags (Safari doesn't need this)
      if (!Prototype.BrowserFeatures.ElementExtensions) {
        Object.extend(Methods, Element.Methods);
        Object.extend(Methods, Element.Methods.Simulated);
      }
    }
  });

  extend.refresh();
  return extend;
})();

Element.hasAttribute = function(element, attribute) {
  if (element.hasAttribute) return element.hasAttribute(attribute);
  return Element.Methods.Simulated.hasAttribute(element, attribute);
};

Element.addMethods = function(methods) {
  var F = Prototype.BrowserFeatures, T = Element.Methods.ByTag;

  if (!methods) {
    Object.extend(Form, Form.Methods);
    Object.extend(Form.Element, Form.Element.Methods);
    Object.extend(Element.Methods.ByTag, {
      "FORM":     Object.clone(Form.Methods),
      "INPUT":    Object.clone(Form.Element.Methods),
      "SELECT":   Object.clone(Form.Element.Methods),
      "TEXTAREA": Object.clone(Form.Element.Methods)
    });
  }

  if (arguments.length == 2) {
    var tagName = methods;
    methods = arguments[1];
  }

  if (!tagName) Object.extend(Element.Methods, methods || { });
  else {
    if (Object.isArray(tagName)) tagName.each(extend);
    else extend(tagName);
  }

  function extend(tagName) {
    tagName = tagName.toUpperCase();
    if (!Element.Methods.ByTag[tagName])
      Element.Methods.ByTag[tagName] = { };
    Object.extend(Element.Methods.ByTag[tagName], methods);
  }

  function copy(methods, destination, onlyIfAbsent) {
    onlyIfAbsent = onlyIfAbsent || false;
    for (var property in methods) {
      var value = methods[property];
      if (!Object.isFunction(value)) continue;
      if (!onlyIfAbsent || !(property in destination))
        destination[property] = value.methodize();
    }
  }

  function findDOMClass(tagName) {
    var klass;
    var trans = {
      "OPTGROUP": "OptGroup", "TEXTAREA": "TextArea", "P": "Paragraph",
      "FIELDSET": "FieldSet", "UL": "UList", "OL": "OList", "DL": "DList",
      "DIR": "Directory", "H1": "Heading", "H2": "Heading", "H3": "Heading",
      "H4": "Heading", "H5": "Heading", "H6": "Heading", "Q": "Quote",
      "INS": "Mod", "DEL": "Mod", "A": "Anchor", "IMG": "Image", "CAPTION":
      "TableCaption", "COL": "TableCol", "COLGROUP": "TableCol", "THEAD":
      "TableSection", "TFOOT": "TableSection", "TBODY": "TableSection", "TR":
      "TableRow", "TH": "TableCell", "TD": "TableCell", "FRAMESET":
      "FrameSet", "IFRAME": "IFrame"
    };
    if (trans[tagName]) klass = 'HTML' + trans[tagName] + 'Element';
    if (window[klass]) return window[klass];
    klass = 'HTML' + tagName + 'Element';
    if (window[klass]) return window[klass];
    klass = 'HTML' + tagName.capitalize() + 'Element';
    if (window[klass]) return window[klass];

    window[klass] = { };
    window[klass].prototype = document.createElement(tagName)['__proto__'];
    return window[klass];
  }

  if (F.ElementExtensions) {
    copy(Element.Methods, HTMLElement.prototype);
    copy(Element.Methods.Simulated, HTMLElement.prototype, true);
  }

  if (F.SpecificElementExtensions) {
    for (var tag in Element.Methods.ByTag) {
      var klass = findDOMClass(tag);
      if (Object.isUndefined(klass)) continue;
      copy(T[tag], klass.prototype);
    }
  }

  Object.extend(Element, Element.Methods);
  delete Element.ByTag;

  if (Element.extend.refresh) Element.extend.refresh();
  Element.cache = { };
};

document.viewport = {
  getDimensions: function() {
    var dimensions = { }, B = Prototype.Browser;
    $w('width height').each(function(d) {
      var D = d.capitalize();
      if (B.WebKit && !document.evaluate) {
        // Safari <3.0 needs self.innerWidth/Height
        dimensions[d] = self['inner' + D];
      } else if (B.Opera && parseFloat(window.opera.version()) < 9.5) {
        // Opera <9.5 needs document.body.clientWidth/Height
        dimensions[d] = document.body['client' + D]
      } else {
        dimensions[d] = document.documentElement['client' + D];
      }
    });
    return dimensions;
  },

  getWidth: function() {
    return this.getDimensions().width;
  },

  getHeight: function() {
    return this.getDimensions().height;
  },

  getScrollOffsets: function() {
    return Element._returnOffset(
      window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft,
      window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop);
  }
};
/* Portions of the Selector class are derived from Jack Slocum's DomQuery,
 * part of YUI-Ext version 0.40, distributed under the terms of an MIT-style
 * license.  Please see http://www.yui-ext.com/ for more information. */

var Selector = Class.create({
  initialize: function(expression) {
    this.expression = expression.strip();

    if (this.shouldUseSelectorsAPI()) {
      this.mode = 'selectorsAPI';
    } else if (this.shouldUseXPath()) {
      this.mode = 'xpath';
      this.compileXPathMatcher();
    } else {
      this.mode = "normal";
      this.compileMatcher();
    }

  },

  shouldUseXPath: function() {
    if (!Prototype.BrowserFeatures.XPath) return false;

    var e = this.expression;

    // Safari 3 chokes on :*-of-type and :empty
    if (Prototype.Browser.WebKit &&
     (e.include("-of-type") || e.include(":empty")))
      return false;

    // XPath can't do namespaced attributes, nor can it read
    // the "checked" property from DOM nodes
    if ((/(\[[\w-]*?:|:checked)/).test(e))
      return false;

    return true;
  },

  shouldUseSelectorsAPI: function() {
    if (!Prototype.BrowserFeatures.SelectorsAPI) return false;

    if (!Selector._div) Selector._div = new Element('div');

    // Make sure the browser treats the selector as valid. Test on an
    // isolated element to minimize cost of this check.
    try {
      Selector._div.querySelector(this.expression);
    } catch(e) {
      return false;
    }

    return true;
  },

  compileMatcher: function() {
    var e = this.expression, ps = Selector.patterns, h = Selector.handlers,
        c = Selector.criteria, le, p, m;

    if (Selector._cache[e]) {
      this.matcher = Selector._cache[e];
      return;
    }

    this.matcher = ["this.matcher = function(root) {",
                    "var r = root, h = Selector.handlers, c = false, n;"];

    while (e && le != e && (/\S/).test(e)) {
      le = e;
      for (var i in ps) {
        p = ps[i];
        if (m = e.match(p)) {
          this.matcher.push(Object.isFunction(c[i]) ? c[i](m) :
            new Template(c[i]).evaluate(m));
          e = e.replace(m[0], '');
          break;
        }
      }
    }

    this.matcher.push("return h.unique(n);\n}");
    eval(this.matcher.join('\n'));
    Selector._cache[this.expression] = this.matcher;
  },

  compileXPathMatcher: function() {
    var e = this.expression, ps = Selector.patterns,
        x = Selector.xpath, le, m;

    if (Selector._cache[e]) {
      this.xpath = Selector._cache[e]; return;
    }

    this.matcher = ['.//*'];
    while (e && le != e && (/\S/).test(e)) {
      le = e;
      for (var i in ps) {
        if (m = e.match(ps[i])) {
          this.matcher.push(Object.isFunction(x[i]) ? x[i](m) :
            new Template(x[i]).evaluate(m));
          e = e.replace(m[0], '');
          break;
        }
      }
    }

    this.xpath = this.matcher.join('');
    Selector._cache[this.expression] = this.xpath;
  },

  findElements: function(root) {
    root = root || document;
    var e = this.expression, results;

    switch (this.mode) {
      case 'selectorsAPI':
        // querySelectorAll queries document-wide, then filters to descendants
        // of the context element. That's not what we want.
        // Add an explicit context to the selector if necessary.
        if (root !== document) {
          var oldId = root.id, id = $(root).identify();
          e = "#" + id + " " + e;
        }

        results = $A(root.querySelectorAll(e)).map(Element.extend);
        root.id = oldId;

        return results;
      case 'xpath':
        return document._getElementsByXPath(this.xpath, root);
      default:
       return this.matcher(root);
    }
  },

  match: function(element) {
    this.tokens = [];

    var e = this.expression, ps = Selector.patterns, as = Selector.assertions;
    var le, p, m;

    while (e && le !== e && (/\S/).test(e)) {
      le = e;
      for (var i in ps) {
        p = ps[i];
        if (m = e.match(p)) {
          // use the Selector.assertions methods unless the selector
          // is too complex.
          if (as[i]) {
            this.tokens.push([i, Object.clone(m)]);
            e = e.replace(m[0], '');
          } else {
            // reluctantly do a document-wide search
            // and look for a match in the array
            return this.findElements(document).include(element);
          }
        }
      }
    }

    var match = true, name, matches;
    for (var i = 0, token; token = this.tokens[i]; i++) {
      name = token[0], matches = token[1];
      if (!Selector.assertions[name](element, matches)) {
        match = false; break;
      }
    }

    return match;
  },

  toString: function() {
    return this.expression;
  },

  inspect: function() {
    return "#<Selector:" + this.expression.inspect() + ">";
  }
});

Object.extend(Selector, {
  _cache: { },

  xpath: {
    descendant:   "//*",
    child:        "/*",
    adjacent:     "/following-sibling::*[1]",
    laterSibling: '/following-sibling::*',
    tagName:      function(m) {
      if (m[1] == '*') return '';
      return "[local-name()='" + m[1].toLowerCase() +
             "' or local-name()='" + m[1].toUpperCase() + "']";
    },
    className:    "[contains(concat(' ', @class, ' '), ' #{1} ')]",
    id:           "[@id='#{1}']",
    attrPresence: function(m) {
      m[1] = m[1].toLowerCase();
      return new Template("[@#{1}]").evaluate(m);
    },
    attr: function(m) {
      m[1] = m[1].toLowerCase();
      m[3] = m[5] || m[6];
      return new Template(Selector.xpath.operators[m[2]]).evaluate(m);
    },
    pseudo: function(m) {
      var h = Selector.xpath.pseudos[m[1]];
      if (!h) return '';
      if (Object.isFunction(h)) return h(m);
      return new Template(Selector.xpath.pseudos[m[1]]).evaluate(m);
    },
    operators: {
      '=':  "[@#{1}='#{3}']",
      '!=': "[@#{1}!='#{3}']",
      '^=': "[starts-with(@#{1}, '#{3}')]",
      '$=': "[substring(@#{1}, (string-length(@#{1}) - string-length('#{3}') + 1))='#{3}']",
      '*=': "[contains(@#{1}, '#{3}')]",
      '~=': "[contains(concat(' ', @#{1}, ' '), ' #{3} ')]",
      '|=': "[contains(concat('-', @#{1}, '-'), '-#{3}-')]"
    },
    pseudos: {
      'first-child': '[not(preceding-sibling::*)]',
      'last-child':  '[not(following-sibling::*)]',
      'only-child':  '[not(preceding-sibling::* or following-sibling::*)]',
      'empty':       "[count(*) = 0 and (count(text()) = 0)]",
      'checked':     "[@checked]",
      'disabled':    "[(@disabled) and (@type!='hidden')]",
      'enabled':     "[not(@disabled) and (@type!='hidden')]",
      'not': function(m) {
        var e = m[6], p = Selector.patterns,
            x = Selector.xpath, le, v;

        var exclusion = [];
        while (e && le != e && (/\S/).test(e)) {
          le = e;
          for (var i in p) {
            if (m = e.match(p[i])) {
              v = Object.isFunction(x[i]) ? x[i](m) : new Template(x[i]).evaluate(m);
              exclusion.push("(" + v.substring(1, v.length - 1) + ")");
              e = e.replace(m[0], '');
              break;
            }
          }
        }
        return "[not(" + exclusion.join(" and ") + ")]";
      },
      'nth-child':      function(m) {
        return Selector.xpath.pseudos.nth("(count(./preceding-sibling::*) + 1) ", m);
      },
      'nth-last-child': function(m) {
        return Selector.xpath.pseudos.nth("(count(./following-sibling::*) + 1) ", m);
      },
      'nth-of-type':    function(m) {
        return Selector.xpath.pseudos.nth("position() ", m);
      },
      'nth-last-of-type': function(m) {
        return Selector.xpath.pseudos.nth("(last() + 1 - position()) ", m);
      },
      'first-of-type':  function(m) {
        m[6] = "1"; return Selector.xpath.pseudos['nth-of-type'](m);
      },
      'last-of-type':   function(m) {
        m[6] = "1"; return Selector.xpath.pseudos['nth-last-of-type'](m);
      },
      'only-of-type':   function(m) {
        var p = Selector.xpath.pseudos; return p['first-of-type'](m) + p['last-of-type'](m);
      },
      nth: function(fragment, m) {
        var mm, formula = m[6], predicate;
        if (formula == 'even') formula = '2n+0';
        if (formula == 'odd')  formula = '2n+1';
        if (mm = formula.match(/^(\d+)$/)) // digit only
          return '[' + fragment + "= " + mm[1] + ']';
        if (mm = formula.match(/^(-?\d*)?n(([+-])(\d+))?/)) { // an+b
          if (mm[1] == "-") mm[1] = -1;
          var a = mm[1] ? Number(mm[1]) : 1;
          var b = mm[2] ? Number(mm[2]) : 0;
          predicate = "[((#{fragment} - #{b}) mod #{a} = 0) and " +
          "((#{fragment} - #{b}) div #{a} >= 0)]";
          return new Template(predicate).evaluate({
            fragment: fragment, a: a, b: b });
        }
      }
    }
  },

  criteria: {
    tagName:      'n = h.tagName(n, r, "#{1}", c);      c = false;',
    className:    'n = h.className(n, r, "#{1}", c);    c = false;',
    id:           'n = h.id(n, r, "#{1}", c);           c = false;',
    attrPresence: 'n = h.attrPresence(n, r, "#{1}", c); c = false;',
    attr: function(m) {
      m[3] = (m[5] || m[6]);
      return new Template('n = h.attr(n, r, "#{1}", "#{3}", "#{2}", c); c = false;').evaluate(m);
    },
    pseudo: function(m) {
      if (m[6]) m[6] = m[6].replace(/"/g, '\\"');
      return new Template('n = h.pseudo(n, "#{1}", "#{6}", r, c); c = false;').evaluate(m);
    },
    descendant:   'c = "descendant";',
    child:        'c = "child";',
    adjacent:     'c = "adjacent";',
    laterSibling: 'c = "laterSibling";'
  },

  patterns: {
    // combinators must be listed first
    // (and descendant needs to be last combinator)
    laterSibling: /^\s*~\s*/,
    child:        /^\s*>\s*/,
    adjacent:     /^\s*\+\s*/,
    descendant:   /^\s/,

    // selectors follow
    tagName:      /^\s*(\*|[\w\-]+)(\b|$)?/,
    id:           /^#([\w\-\*]+)(\b|$)/,
    className:    /^\.([\w\-\*]+)(\b|$)/,
    pseudo:
/^:((first|last|nth|nth-last|only)(-child|-of-type)|empty|checked|(en|dis)abled|not)(\((.*?)\))?(\b|$|(?=\s|[:+~>]))/,
    attrPresence: /^\[((?:[\w]+:)?[\w]+)\]/,
    attr:         /\[((?:[\w-]*:)?[\w-]+)\s*(?:([!^$*~|]?=)\s*((['"])([^\4]*?)\4|([^'"][^\]]*?)))?\]/
  },

  // for Selector.match and Element#match
  assertions: {
    tagName: function(element, matches) {
      return matches[1].toUpperCase() == element.tagName.toUpperCase();
    },

    className: function(element, matches) {
      return Element.hasClassName(element, matches[1]);
    },

    id: function(element, matches) {
      return element.id === matches[1];
    },

    attrPresence: function(element, matches) {
      return Element.hasAttribute(element, matches[1]);
    },

    attr: function(element, matches) {
      var nodeValue = Element.readAttribute(element, matches[1]);
      return nodeValue && Selector.operators[matches[2]](nodeValue, matches[5] || matches[6]);
    }
  },

  handlers: {
    // UTILITY FUNCTIONS
    // joins two collections
    concat: function(a, b) {
      for (var i = 0, node; node = b[i]; i++)
        a.push(node);
      return a;
    },

    // marks an array of nodes for counting
    mark: function(nodes) {
      var _true = Prototype.emptyFunction;
      for (var i = 0, node; node = nodes[i]; i++)
        node._countedByPrototype = _true;
      return nodes;
    },

    unmark: function(nodes) {
      for (var i = 0, node; node = nodes[i]; i++)
        node._countedByPrototype = undefined;
      return nodes;
    },

    // mark each child node with its position (for nth calls)
    // "ofType" flag indicates whether we're indexing for nth-of-type
    // rather than nth-child
    index: function(parentNode, reverse, ofType) {
      parentNode._countedByPrototype = Prototype.emptyFunction;
      if (reverse) {
        for (var nodes = parentNode.childNodes, i = nodes.length - 1, j = 1; i >= 0; i--) {
          var node = nodes[i];
          if (node.nodeType == 1 && (!ofType || node._countedByPrototype)) node.nodeIndex = j++;
        }
      } else {
        for (var i = 0, j = 1, nodes = parentNode.childNodes; node = nodes[i]; i++)
          if (node.nodeType == 1 && (!ofType || node._countedByPrototype)) node.nodeIndex = j++;
      }
    },

    // filters out duplicates and extends all nodes
    unique: function(nodes) {
      if (nodes.length == 0) return nodes;
      var results = [], n;
      for (var i = 0, l = nodes.length; i < l; i++)
        if (!(n = nodes[i])._countedByPrototype) {
          n._countedByPrototype = Prototype.emptyFunction;
          results.push(Element.extend(n));
        }
      return Selector.handlers.unmark(results);
    },

    // COMBINATOR FUNCTIONS
    descendant: function(nodes) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        h.concat(results, node.getElementsByTagName('*'));
      return results;
    },

    child: function(nodes) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        for (var j = 0, child; child = node.childNodes[j]; j++)
          if (child.nodeType == 1 && child.tagName != '!') results.push(child);
      }
      return results;
    },

    adjacent: function(nodes) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        var next = this.nextElementSibling(node);
        if (next) results.push(next);
      }
      return results;
    },

    laterSibling: function(nodes) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        h.concat(results, Element.nextSiblings(node));
      return results;
    },

    nextElementSibling: function(node) {
      while (node = node.nextSibling)
        if (node.nodeType == 1) return node;
      return null;
    },

    previousElementSibling: function(node) {
      while (node = node.previousSibling)
        if (node.nodeType == 1) return node;
      return null;
    },

    // TOKEN FUNCTIONS
    tagName: function(nodes, root, tagName, combinator) {
      var uTagName = tagName.toUpperCase();
      var results = [], h = Selector.handlers;
      if (nodes) {
        if (combinator) {
          // fastlane for ordinary descendant combinators
          if (combinator == "descendant") {
            for (var i = 0, node; node = nodes[i]; i++)
              h.concat(results, node.getElementsByTagName(tagName));
            return results;
          } else nodes = this[combinator](nodes);
          if (tagName == "*") return nodes;
        }
        for (var i = 0, node; node = nodes[i]; i++)
          if (node.tagName.toUpperCase() === uTagName) results.push(node);
        return results;
      } else return root.getElementsByTagName(tagName);
    },

    id: function(nodes, root, id, combinator) {
      var targetNode = $(id), h = Selector.handlers;
      if (!targetNode) return [];
      if (!nodes && root == document) return [targetNode];
      if (nodes) {
        if (combinator) {
          if (combinator == 'child') {
            for (var i = 0, node; node = nodes[i]; i++)
              if (targetNode.parentNode == node) return [targetNode];
          } else if (combinator == 'descendant') {
            for (var i = 0, node; node = nodes[i]; i++)
              if (Element.descendantOf(targetNode, node)) return [targetNode];
          } else if (combinator == 'adjacent') {
            for (var i = 0, node; node = nodes[i]; i++)
              if (Selector.handlers.previousElementSibling(targetNode) == node)
                return [targetNode];
          } else nodes = h[combinator](nodes);
        }
        for (var i = 0, node; node = nodes[i]; i++)
          if (node == targetNode) return [targetNode];
        return [];
      }
      return (targetNode && Element.descendantOf(targetNode, root)) ? [targetNode] : [];
    },

    className: function(nodes, root, className, combinator) {
      if (nodes && combinator) nodes = this[combinator](nodes);
      return Selector.handlers.byClassName(nodes, root, className);
    },

    byClassName: function(nodes, root, className) {
      if (!nodes) nodes = Selector.handlers.descendant([root]);
      var needle = ' ' + className + ' ';
      for (var i = 0, results = [], node, nodeClassName; node = nodes[i]; i++) {
        nodeClassName = node.className;
        if (nodeClassName.length == 0) continue;
        if (nodeClassName == className || (' ' + nodeClassName + ' ').include(needle))
          results.push(node);
      }
      return results;
    },

    attrPresence: function(nodes, root, attr, combinator) {
      if (!nodes) nodes = root.getElementsByTagName("*");
      if (nodes && combinator) nodes = this[combinator](nodes);
      var results = [];
      for (var i = 0, node; node = nodes[i]; i++)
        if (Element.hasAttribute(node, attr)) results.push(node);
      return results;
    },

    attr: function(nodes, root, attr, value, operator, combinator) {
      if (!nodes) nodes = root.getElementsByTagName("*");
      if (nodes && combinator) nodes = this[combinator](nodes);
      var handler = Selector.operators[operator], results = [];
      for (var i = 0, node; node = nodes[i]; i++) {
        var nodeValue = Element.readAttribute(node, attr);
        if (nodeValue === null) continue;
        if (handler(nodeValue, value)) results.push(node);
      }
      return results;
    },

    pseudo: function(nodes, name, value, root, combinator) {
      if (nodes && combinator) nodes = this[combinator](nodes);
      if (!nodes) nodes = root.getElementsByTagName("*");
      return Selector.pseudos[name](nodes, value, root);
    }
  },

  pseudos: {
    'first-child': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        if (Selector.handlers.previousElementSibling(node)) continue;
          results.push(node);
      }
      return results;
    },
    'last-child': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        if (Selector.handlers.nextElementSibling(node)) continue;
          results.push(node);
      }
      return results;
    },
    'only-child': function(nodes, value, root) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (!h.previousElementSibling(node) && !h.nextElementSibling(node))
          results.push(node);
      return results;
    },
    'nth-child':        function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root);
    },
    'nth-last-child':   function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root, true);
    },
    'nth-of-type':      function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root, false, true);
    },
    'nth-last-of-type': function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root, true, true);
    },
    'first-of-type':    function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, "1", root, false, true);
    },
    'last-of-type':     function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, "1", root, true, true);
    },
    'only-of-type':     function(nodes, formula, root) {
      var p = Selector.pseudos;
      return p['last-of-type'](p['first-of-type'](nodes, formula, root), formula, root);
    },

    // handles the an+b logic
    getIndices: function(a, b, total) {
      if (a == 0) return b > 0 ? [b] : [];
      return $R(1, total).inject([], function(memo, i) {
        if (0 == (i - b) % a && (i - b) / a >= 0) memo.push(i);
        return memo;
      });
    },

    // handles nth(-last)-child, nth(-last)-of-type, and (first|last)-of-type
    nth: function(nodes, formula, root, reverse, ofType) {
      if (nodes.length == 0) return [];
      if (formula == 'even') formula = '2n+0';
      if (formula == 'odd')  formula = '2n+1';
      var h = Selector.handlers, results = [], indexed = [], m;
      h.mark(nodes);
      for (var i = 0, node; node = nodes[i]; i++) {
        if (!node.parentNode._countedByPrototype) {
          h.index(node.parentNode, reverse, ofType);
          indexed.push(node.parentNode);
        }
      }
      if (formula.match(/^\d+$/)) { // just a number
        formula = Number(formula);
        for (var i = 0, node; node = nodes[i]; i++)
          if (node.nodeIndex == formula) results.push(node);
      } else if (m = formula.match(/^(-?\d*)?n(([+-])(\d+))?/)) { // an+b
        if (m[1] == "-") m[1] = -1;
        var a = m[1] ? Number(m[1]) : 1;
        var b = m[2] ? Number(m[2]) : 0;
        var indices = Selector.pseudos.getIndices(a, b, nodes.length);
        for (var i = 0, node, l = indices.length; node = nodes[i]; i++) {
          for (var j = 0; j < l; j++)
            if (node.nodeIndex == indices[j]) results.push(node);
        }
      }
      h.unmark(nodes);
      h.unmark(indexed);
      return results;
    },

    'empty': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        // IE treats comments as element nodes
        if (node.tagName == '!' || node.firstChild) continue;
        results.push(node);
      }
      return results;
    },

    'not': function(nodes, selector, root) {
      var h = Selector.handlers, selectorType, m;
      var exclusions = new Selector(selector).findElements(root);
      h.mark(exclusions);
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (!node._countedByPrototype) results.push(node);
      h.unmark(exclusions);
      return results;
    },

    'enabled': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (!node.disabled && (!node.type || node.type !== 'hidden'))
          results.push(node);
      return results;
    },

    'disabled': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (node.disabled) results.push(node);
      return results;
    },

    'checked': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (node.checked) results.push(node);
      return results;
    }
  },

  operators: {
    '=':  function(nv, v) { return nv == v; },
    '!=': function(nv, v) { return nv != v; },
    '^=': function(nv, v) { return nv == v || nv && nv.startsWith(v); },
    '$=': function(nv, v) { return nv == v || nv && nv.endsWith(v); },
    '*=': function(nv, v) { return nv == v || nv && nv.include(v); },
    '$=': function(nv, v) { return nv.endsWith(v); },
    '*=': function(nv, v) { return nv.include(v); },
    '~=': function(nv, v) { return (' ' + nv + ' ').include(' ' + v + ' '); },
    '|=': function(nv, v) { return ('-' + (nv || "").toUpperCase() +
     '-').include('-' + (v || "").toUpperCase() + '-'); }
  },

  split: function(expression) {
    var expressions = [];
    expression.scan(/(([\w#:.~>+()\s-]+|\*|\[.*?\])+)\s*(,|$)/, function(m) {
      expressions.push(m[1].strip());
    });
    return expressions;
  },

  matchElements: function(elements, expression) {
    var matches = $$(expression), h = Selector.handlers;
    h.mark(matches);
    for (var i = 0, results = [], element; element = elements[i]; i++)
      if (element._countedByPrototype) results.push(element);
    h.unmark(matches);
    return results;
  },

  findElement: function(elements, expression, index) {
    if (Object.isNumber(expression)) {
      index = expression; expression = false;
    }
    return Selector.matchElements(elements, expression || '*')[index || 0];
  },

  findChildElements: function(element, expressions) {
    expressions = Selector.split(expressions.join(','));
    var results = [], h = Selector.handlers;
    for (var i = 0, l = expressions.length, selector; i < l; i++) {
      selector = new Selector(expressions[i].strip());
      h.concat(results, selector.findElements(element));
    }
    return (l > 1) ? h.unique(results) : results;
  }
});

if (Prototype.Browser.IE) {
  Object.extend(Selector.handlers, {
    // IE returns comment nodes on getElementsByTagName("*").
    // Filter them out.
    concat: function(a, b) {
      for (var i = 0, node; node = b[i]; i++)
        if (node.tagName !== "!") a.push(node);
      return a;
    },

    // IE improperly serializes _countedByPrototype in (inner|outer)HTML.
    unmark: function(nodes) {
      for (var i = 0, node; node = nodes[i]; i++)
        node.removeAttribute('_countedByPrototype');
      return nodes;
    }
  });
}

function $$() {
  return Selector.findChildElements(document, $A(arguments));
}
var Form = {
  reset: function(form) {
    $(form).reset();
    return form;
  },

  serializeElements: function(elements, options) {
    if (typeof options != 'object') options = { hash: !!options };
    else if (Object.isUndefined(options.hash)) options.hash = true;
    var key, value, submitted = false, submit = options.submit;

    var data = elements.inject({ }, function(result, element) {
      if (!element.disabled && element.name) {
        key = element.name; value = $(element).getValue();
        if (value != null && element.type != 'file' && (element.type != 'submit' || (!submitted &&
            submit !== false && (!submit || key == submit) && (submitted = true)))) {
          if (key in result) {
            // a key is already present; construct an array of values
            if (!Object.isArray(result[key])) result[key] = [result[key]];
            result[key].push(value);
          }
          else result[key] = value;
        }
      }
      return result;
    });

    return options.hash ? data : Object.toQueryString(data);
  }
};

Form.Methods = {
  serialize: function(form, options) {
    return Form.serializeElements(Form.getElements(form), options);
  },

  getElements: function(form) {
    return $A($(form).getElementsByTagName('*')).inject([],
      function(elements, child) {
        if (Form.Element.Serializers[child.tagName.toLowerCase()])
          elements.push(Element.extend(child));
        return elements;
      }
    );
  },

  getInputs: function(form, typeName, name) {
    form = $(form);
    var inputs = form.getElementsByTagName('input');

    if (!typeName && !name) return $A(inputs).map(Element.extend);

    for (var i = 0, matchingInputs = [], length = inputs.length; i < length; i++) {
      var input = inputs[i];
      if ((typeName && input.type != typeName) || (name && input.name != name))
        continue;
      matchingInputs.push(Element.extend(input));
    }

    return matchingInputs;
  },

  disable: function(form) {
    form = $(form);
    Form.getElements(form).invoke('disable');
    return form;
  },

  enable: function(form) {
    form = $(form);
    Form.getElements(form).invoke('enable');
    return form;
  },

  findFirstElement: function(form) {
    var elements = $(form).getElements().findAll(function(element) {
      return 'hidden' != element.type && !element.disabled;
    });
    var firstByIndex = elements.findAll(function(element) {
      return element.hasAttribute('tabIndex') && element.tabIndex >= 0;
    }).sortBy(function(element) { return element.tabIndex }).first();

    return firstByIndex ? firstByIndex : elements.find(function(element) {
      return ['input', 'select', 'textarea'].include(element.tagName.toLowerCase());
    });
  },

  focusFirstElement: function(form) {
    form = $(form);
    form.findFirstElement().activate();
    return form;
  },

  request: function(form, options) {
    form = $(form), options = Object.clone(options || { });

    var params = options.parameters, action = form.readAttribute('action') || '';
    if (action.blank()) action = window.location.href;
    options.parameters = form.serialize(true);

    if (params) {
      if (Object.isString(params)) params = params.toQueryParams();
      Object.extend(options.parameters, params);
    }

    if (form.hasAttribute('method') && !options.method)
      options.method = form.method;

    return new Ajax.Request(action, options);
  }
};

/*--------------------------------------------------------------------------*/

Form.Element = {
  focus: function(element) {
    $(element).focus();
    return element;
  },

  select: function(element) {
    $(element).select();
    return element;
  }
};

Form.Element.Methods = {
  serialize: function(element) {
    element = $(element);
    if (!element.disabled && element.name) {
      var value = element.getValue();
      if (value != undefined) {
        var pair = { };
        pair[element.name] = value;
        return Object.toQueryString(pair);
      }
    }
    return '';
  },

  getValue: function(element) {
    element = $(element);
    var method = element.tagName.toLowerCase();
    return Form.Element.Serializers[method](element);
  },

  setValue: function(element, value) {
    element = $(element);
    var method = element.tagName.toLowerCase();
    Form.Element.Serializers[method](element, value);
    return element;
  },

  clear: function(element) {
    $(element).value = '';
    return element;
  },

  present: function(element) {
    return $(element).value != '';
  },

  activate: function(element) {
    element = $(element);
    try {
      element.focus();
      if (element.select && (element.tagName.toLowerCase() != 'input' ||
          !['button', 'reset', 'submit'].include(element.type)))
        element.select();
    } catch (e) { }
    return element;
  },

  disable: function(element) {
    element = $(element);
    element.disabled = true;
    return element;
  },

  enable: function(element) {
    element = $(element);
    element.disabled = false;
    return element;
  }
};

/*--------------------------------------------------------------------------*/

var Field = Form.Element;
var $F = Form.Element.Methods.getValue;

/*--------------------------------------------------------------------------*/

Form.Element.Serializers = {
  input: function(element, value) {
    switch (element.type.toLowerCase()) {
      case 'checkbox':
      case 'radio':
        return Form.Element.Serializers.inputSelector(element, value);
      default:
        return Form.Element.Serializers.textarea(element, value);
    }
  },

  inputSelector: function(element, value) {
    if (Object.isUndefined(value)) return element.checked ? element.value : null;
    else element.checked = !!value;
  },

  textarea: function(element, value) {
    if (Object.isUndefined(value)) return element.value;
    else element.value = value;
  },

  select: function(element, value) {
    if (Object.isUndefined(value))
      return this[element.type == 'select-one' ?
        'selectOne' : 'selectMany'](element);
    else {
      var opt, currentValue, single = !Object.isArray(value);
      for (var i = 0, length = element.length; i < length; i++) {
        opt = element.options[i];
        currentValue = this.optionValue(opt);
        if (single) {
          if (currentValue == value) {
            opt.selected = true;
            return;
          }
        }
        else opt.selected = value.include(currentValue);
      }
    }
  },

  selectOne: function(element) {
    var index = element.selectedIndex;
    return index >= 0 ? this.optionValue(element.options[index]) : null;
  },

  selectMany: function(element) {
    var values, length = element.length;
    if (!length) return null;

    for (var i = 0, values = []; i < length; i++) {
      var opt = element.options[i];
      if (opt.selected) values.push(this.optionValue(opt));
    }
    return values;
  },

  optionValue: function(opt) {
    // extend element because hasAttribute may not be native
    return Element.extend(opt).hasAttribute('value') ? opt.value : opt.text;
  }
};

/*--------------------------------------------------------------------------*/

Abstract.TimedObserver = Class.create(PeriodicalExecuter, {
  initialize: function($super, element, frequency, callback) {
    $super(callback, frequency);
    this.element   = $(element);
    this.lastValue = this.getValue();
  },

  execute: function() {
    var value = this.getValue();
    if (Object.isString(this.lastValue) && Object.isString(value) ?
        this.lastValue != value : String(this.lastValue) != String(value)) {
      this.callback(this.element, value);
      this.lastValue = value;
    }
  }
});

Form.Element.Observer = Class.create(Abstract.TimedObserver, {
  getValue: function() {
    return Form.Element.getValue(this.element);
  }
});

Form.Observer = Class.create(Abstract.TimedObserver, {
  getValue: function() {
    return Form.serialize(this.element);
  }
});

/*--------------------------------------------------------------------------*/

Abstract.EventObserver = Class.create({
  initialize: function(element, callback) {
    this.element  = $(element);
    this.callback = callback;

    this.lastValue = this.getValue();
    if (this.element.tagName.toLowerCase() == 'form')
      this.registerFormCallbacks();
    else
      this.registerCallback(this.element);
  },

  onElementEvent: function() {
    var value = this.getValue();
    if (this.lastValue != value) {
      this.callback(this.element, value);
      this.lastValue = value;
    }
  },

  registerFormCallbacks: function() {
    Form.getElements(this.element).each(this.registerCallback, this);
  },

  registerCallback: function(element) {
    if (element.type) {
      switch (element.type.toLowerCase()) {
        case 'checkbox':
        case 'radio':
          Event.observe(element, 'click', this.onElementEvent.bind(this));
          break;
        default:
          Event.observe(element, 'change', this.onElementEvent.bind(this));
          break;
      }
    }
  }
});

Form.Element.EventObserver = Class.create(Abstract.EventObserver, {
  getValue: function() {
    return Form.Element.getValue(this.element);
  }
});

Form.EventObserver = Class.create(Abstract.EventObserver, {
  getValue: function() {
    return Form.serialize(this.element);
  }
});
if (!window.Event) var Event = { };

Object.extend(Event, {
  KEY_BACKSPACE: 8,
  KEY_TAB:       9,
  KEY_RETURN:   13,
  KEY_ESC:      27,
  KEY_LEFT:     37,
  KEY_UP:       38,
  KEY_RIGHT:    39,
  KEY_DOWN:     40,
  KEY_DELETE:   46,
  KEY_HOME:     36,
  KEY_END:      35,
  KEY_PAGEUP:   33,
  KEY_PAGEDOWN: 34,
  KEY_INSERT:   45,

  cache: { },

  relatedTarget: function(event) {
    var element;
    switch(event.type) {
      case 'mouseover': element = event.fromElement; break;
      case 'mouseout':  element = event.toElement;   break;
      default: return null;
    }
    return Element.extend(element);
  }
});

Event.Methods = (function() {
  var isButton;

  if (Prototype.Browser.IE) {
    var buttonMap = { 0: 1, 1: 4, 2: 2 };
    isButton = function(event, code) {
      return event.button == buttonMap[code];
    };

  } else if (Prototype.Browser.WebKit) {
    isButton = function(event, code) {
      switch (code) {
        case 0: return event.which == 1 && !event.metaKey;
        case 1: return event.which == 1 && event.metaKey;
        default: return false;
      }
    };

  } else {
    isButton = function(event, code) {
      return event.which ? (event.which === code + 1) : (event.button === code);
    };
  }

  return {
    isLeftClick:   function(event) { return isButton(event, 0) },
    isMiddleClick: function(event) { return isButton(event, 1) },
    isRightClick:  function(event) { return isButton(event, 2) },

    element: function(event) {
      event = Event.extend(event);

      var node          = event.target,
          type          = event.type,
          currentTarget = event.currentTarget;

      if (currentTarget && currentTarget.tagName) {
        // Firefox screws up the "click" event when moving between radio buttons
        // via arrow keys. It also screws up the "load" and "error" events on images,
        // reporting the document as the target instead of the original image.
        if (type === 'load' || type === 'error' ||
          (type === 'click' && currentTarget.tagName.toLowerCase() === 'input'
            && currentTarget.type === 'radio'))
              node = currentTarget;
      }
      if (node.nodeType == Node.TEXT_NODE) node = node.parentNode;
      return Element.extend(node);
    },

    findElement: function(event, expression) {
      var element = Event.element(event);
      if (!expression) return element;
      var elements = [element].concat(element.ancestors());
      return Selector.findElement(elements, expression, 0);
    },

    pointer: function(event) {
      var docElement = document.documentElement,
      body = document.body || { scrollLeft: 0, scrollTop: 0 };
      return {
        x: event.pageX || (event.clientX +
          (docElement.scrollLeft || body.scrollLeft) -
          (docElement.clientLeft || 0)),
        y: event.pageY || (event.clientY +
          (docElement.scrollTop || body.scrollTop) -
          (docElement.clientTop || 0))
      };
    },

    pointerX: function(event) { return Event.pointer(event).x },
    pointerY: function(event) { return Event.pointer(event).y },

    stop: function(event) {
      Event.extend(event);
      event.preventDefault();
      event.stopPropagation();
      event.stopped = true;
    }
  };
})();

Event.extend = (function() {
  var methods = Object.keys(Event.Methods).inject({ }, function(m, name) {
    m[name] = Event.Methods[name].methodize();
    return m;
  });

  if (Prototype.Browser.IE) {
    Object.extend(methods, {
      stopPropagation: function() { this.cancelBubble = true },
      preventDefault:  function() { this.returnValue = false },
      inspect: function() { return "[object Event]" }
    });

    return function(event) {
      if (!event) return false;
      if (event._extendedByPrototype) return event;

      event._extendedByPrototype = Prototype.emptyFunction;
      var pointer = Event.pointer(event);
      Object.extend(event, {
        target: event.srcElement,
        relatedTarget: Event.relatedTarget(event),
        pageX:  pointer.x,
        pageY:  pointer.y
      });
      return Object.extend(event, methods);
    };

  } else {
    Event.prototype = Event.prototype || document.createEvent("HTMLEvents")['__proto__'];
    Object.extend(Event.prototype, methods);
    return Prototype.K;
  }
})();

Object.extend(Event, (function() {
  var cache = Event.cache;

  function getEventID(element) {
    if (element._prototypeEventID) return element._prototypeEventID[0];
    arguments.callee.id = arguments.callee.id || 1;
    return element._prototypeEventID = [++arguments.callee.id];
  }

  function getDOMEventName(eventName) {
    if (eventName && eventName.include(':')) return "dataavailable";
    return eventName;
  }

  function getCacheForID(id) {
    return cache[id] = cache[id] || { };
  }

  function getWrappersForEventName(id, eventName) {
    var c = getCacheForID(id);
    return c[eventName] = c[eventName] || [];
  }

  function createWrapper(element, eventName, handler) {
    var id = getEventID(element);
    var c = getWrappersForEventName(id, eventName);
    if (c.pluck("handler").include(handler)) return false;

    var wrapper = function(event) {
      if (!Event || !Event.extend ||
        (event.eventName && event.eventName != eventName))
          return false;

      Event.extend(event);
      handler.call(element, event);
    };

    wrapper.handler = handler;
    c.push(wrapper);
    return wrapper;
  }

  function findWrapper(id, eventName, handler) {
    var c = getWrappersForEventName(id, eventName);
    return c.find(function(wrapper) { return wrapper.handler == handler });
  }

  function destroyWrapper(id, eventName, handler) {
    var c = getCacheForID(id);
    if (!c[eventName]) return false;
    c[eventName] = c[eventName].without(findWrapper(id, eventName, handler));
  }

  function destroyCache() {
    for (var id in cache)
      for (var eventName in cache[id])
        cache[id][eventName] = null;
  }


  // Internet Explorer needs to remove event handlers on page unload
  // in order to avoid memory leaks.
  if (window.attachEvent) {
    window.attachEvent("onunload", destroyCache);
  }

  // Safari has a dummy event handler on page unload so that it won't
  // use its bfcache. Safari <= 3.1 has an issue with restoring the "document"
  // object when page is returned to via the back button using its bfcache.
  if (Prototype.Browser.WebKit) {
    window.addEventListener('unload', Prototype.emptyFunction, false);
  }

  return {
    observe: function(element, eventName, handler) {
      element = $(element);
      var name = getDOMEventName(eventName);

      var wrapper = createWrapper(element, eventName, handler);
      if (!wrapper) return element;

      if (element.addEventListener) {
        element.addEventListener(name, wrapper, false);
      } else {
        element.attachEvent("on" + name, wrapper);
      }

      return element;
    },

    stopObserving: function(element, eventName, handler) {
      element = $(element);
      var id = getEventID(element), name = getDOMEventName(eventName);

      if (!handler && eventName) {
        getWrappersForEventName(id, eventName).each(function(wrapper) {
          element.stopObserving(eventName, wrapper.handler);
        });
        return element;

      } else if (!eventName) {
        Object.keys(getCacheForID(id)).each(function(eventName) {
          element.stopObserving(eventName);
        });
        return element;
      }

      var wrapper = findWrapper(id, eventName, handler);
      if (!wrapper) return element;

      if (element.removeEventListener) {
        element.removeEventListener(name, wrapper, false);
      } else {
        element.detachEvent("on" + name, wrapper);
      }

      destroyWrapper(id, eventName, handler);

      return element;
    },

    fire: function(element, eventName, memo) {
      element = $(element);
      if (element == document && document.createEvent && !element.dispatchEvent)
        element = document.documentElement;

      var event;
      if (document.createEvent) {
        event = document.createEvent("HTMLEvents");
        event.initEvent("dataavailable", true, true);
      } else {
        event = document.createEventObject();
        event.eventType = "ondataavailable";
      }

      event.eventName = eventName;
      event.memo = memo || { };

      if (document.createEvent) {
        element.dispatchEvent(event);
      } else {
        element.fireEvent(event.eventType, event);
      }

      return Event.extend(event);
    }
  };
})());

Object.extend(Event, Event.Methods);

Element.addMethods({
  fire:          Event.fire,
  observe:       Event.observe,
  stopObserving: Event.stopObserving
});

Object.extend(document, {
  fire:          Element.Methods.fire.methodize(),
  observe:       Element.Methods.observe.methodize(),
  stopObserving: Element.Methods.stopObserving.methodize(),
  loaded:        false
});

(function() {
  /* Support for the DOMContentLoaded event is based on work by Dan Webb,
     Matthias Miller, Dean Edwards and John Resig. */

  var timer;

  function fireContentLoadedEvent() {
    if (document.loaded) return;
    if (timer) window.clearInterval(timer);
    document.fire("dom:loaded");
    document.loaded = true;
  }

  if (document.addEventListener) {
    if (Prototype.Browser.WebKit) {
      timer = window.setInterval(function() {
        if (/loaded|complete/.test(document.readyState))
          fireContentLoadedEvent();
      }, 0);

      Event.observe(window, "load", fireContentLoadedEvent);

    } else {
      document.addEventListener("DOMContentLoaded",
        fireContentLoadedEvent, false);
    }

  } else {
    document.write("<script id=__onDOMContentLoaded defer src=//:><\/script>");
    $("__onDOMContentLoaded").onreadystatechange = function() {
      if (this.readyState == "complete") {
        this.onreadystatechange = null;
        fireContentLoadedEvent();
      }
    };
  }
})();
/*------------------------------- DEPRECATED -------------------------------*/

Hash.toQueryString = Object.toQueryString;

var Toggle = { display: Element.toggle };

Element.Methods.childOf = Element.Methods.descendantOf;

var Insertion = {
  Before: function(element, content) {
    return Element.insert(element, {before:content});
  },

  Top: function(element, content) {
    return Element.insert(element, {top:content});
  },

  Bottom: function(element, content) {
    return Element.insert(element, {bottom:content});
  },

  After: function(element, content) {
    return Element.insert(element, {after:content});
  }
};

var $continue = new Error('"throw $continue" is deprecated, use "return" instead');

// This should be moved to script.aculo.us; notice the deprecated methods
// further below, that map to the newer Element methods.
var Position = {
  // set to true if needed, warning: firefox performance problems
  // NOT neeeded for page scrolling, only if draggable contained in
  // scrollable elements
  includeScrollOffsets: false,

  // must be called before calling withinIncludingScrolloffset, every time the
  // page is scrolled
  prepare: function() {
    this.deltaX =  window.pageXOffset
                || document.documentElement.scrollLeft
                || document.body.scrollLeft
                || 0;
    this.deltaY =  window.pageYOffset
                || document.documentElement.scrollTop
                || document.body.scrollTop
                || 0;
  },

  // caches x/y coordinate pair to use with overlap
  within: function(element, x, y) {
    if (this.includeScrollOffsets)
      return this.withinIncludingScrolloffsets(element, x, y);
    this.xcomp = x;
    this.ycomp = y;
    this.offset = Element.cumulativeOffset(element);

    return (y >= this.offset[1] &&
            y <  this.offset[1] + element.offsetHeight &&
            x >= this.offset[0] &&
            x <  this.offset[0] + element.offsetWidth);
  },

  withinIncludingScrolloffsets: function(element, x, y) {
    var offsetcache = Element.cumulativeScrollOffset(element);

    this.xcomp = x + offsetcache[0] - this.deltaX;
    this.ycomp = y + offsetcache[1] - this.deltaY;
    this.offset = Element.cumulativeOffset(element);

    return (this.ycomp >= this.offset[1] &&
            this.ycomp <  this.offset[1] + element.offsetHeight &&
            this.xcomp >= this.offset[0] &&
            this.xcomp <  this.offset[0] + element.offsetWidth);
  },

  // within must be called directly before
  overlap: function(mode, element) {
    if (!mode) return 0;
    if (mode == 'vertical')
      return ((this.offset[1] + element.offsetHeight) - this.ycomp) /
        element.offsetHeight;
    if (mode == 'horizontal')
      return ((this.offset[0] + element.offsetWidth) - this.xcomp) /
        element.offsetWidth;
  },

  // Deprecation layer -- use newer Element methods now (1.5.2).

  cumulativeOffset: Element.Methods.cumulativeOffset,

  positionedOffset: Element.Methods.positionedOffset,

  absolutize: function(element) {
    Position.prepare();
    return Element.absolutize(element);
  },

  relativize: function(element) {
    Position.prepare();
    return Element.relativize(element);
  },

  realOffset: Element.Methods.cumulativeScrollOffset,

  offsetParent: Element.Methods.getOffsetParent,

  page: Element.Methods.viewportOffset,

  clone: function(source, target, options) {
    options = options || { };
    return Element.clonePosition(target, source, options);
  }
};

/*--------------------------------------------------------------------------*/

if (!document.getElementsByClassName) document.getElementsByClassName = function(instanceMethods){
  function iter(name) {
    return name.blank() ? null : "[contains(concat(' ', @class, ' '), ' " + name + " ')]";
  }

  instanceMethods.getElementsByClassName = Prototype.BrowserFeatures.XPath ?
  function(element, className) {
    className = className.toString().strip();
    var cond = /\s/.test(className) ? $w(className).map(iter).join('') : iter(className);
    return cond ? document._getElementsByXPath('.//*' + cond, element) : [];
  } : function(element, className) {
    className = className.toString().strip();
    var elements = [], classNames = (/\s/.test(className) ? $w(className) : null);
    if (!classNames && !className) return elements;

    var nodes = $(element).getElementsByTagName('*');
    className = ' ' + className + ' ';

    for (var i = 0, child, cn; child = nodes[i]; i++) {
      if (child.className && (cn = ' ' + child.className + ' ') && (cn.include(className) ||
          (classNames && classNames.all(function(name) {
            return !name.toString().blank() && cn.include(' ' + name + ' ');
          }))))
        elements.push(Element.extend(child));
    }
    return elements;
  };

  return function(className, parentElement) {
    return $(parentElement || document.body).getElementsByClassName(className);
  };
}(Element.Methods);

/*--------------------------------------------------------------------------*/

Element.ClassNames = Class.create();
Element.ClassNames.prototype = {
  initialize: function(element) {
    this.element = $(element);
  },

  _each: function(iterator) {
    this.element.className.split(/\s+/).select(function(name) {
      return name.length > 0;
    })._each(iterator);
  },

  set: function(className) {
    this.element.className = className;
  },

  add: function(classNameToAdd) {
    if (this.include(classNameToAdd)) return;
    this.set($A(this).concat(classNameToAdd).join(' '));
  },

  remove: function(classNameToRemove) {
    if (!this.include(classNameToRemove)) return;
    this.set($A(this).without(classNameToRemove).join(' '));
  },

  toString: function() {
    return $A(this).join(' ');
  }
};

Object.extend(Element.ClassNames.prototype, Enumerable);

/*--------------------------------------------------------------------------*/

Element.addMethods();

// Copyright (c) 2005-2008 Thomas Fuchs (http://script.aculo.us, http://mir.aculo.us)
// Contributors:
//  Justin Palmer (http://encytemedia.com/)
//  Mark Pilgrim (http://diveintomark.org/)
//  Martin Bialasinki
//
// script.aculo.us is freely distributable under the terms of an MIT-style license.
// For details, see the script.aculo.us web site: http://script.aculo.us/

// converts rgb() and #xxx to #xxxxxx format,
// returns self (or first argument) if not convertable
String.prototype.parseColor = function() {
  var color = '#';
  if (this.slice(0,4) == 'rgb(') {
    var cols = this.slice(4,this.length-1).split(',');
    var i=0; do { color += parseInt(cols[i]).toColorPart() } while (++i<3);
  } else {
    if (this.slice(0,1) == '#') {
      if (this.length==4) for(var i=1;i<4;i++) color += (this.charAt(i) + this.charAt(i)).toLowerCase();
      if (this.length==7) color = this.toLowerCase();
    }
  }
  return (color.length==7 ? color : (arguments[0] || this));
};

/*--------------------------------------------------------------------------*/

Element.collectTextNodes = function(element) {
  return $A($(element).childNodes).collect( function(node) {
    return (node.nodeType==3 ? node.nodeValue :
      (node.hasChildNodes() ? Element.collectTextNodes(node) : ''));
  }).flatten().join('');
};

Element.collectTextNodesIgnoreClass = function(element, className) {
  return $A($(element).childNodes).collect( function(node) {
    return (node.nodeType==3 ? node.nodeValue :
      ((node.hasChildNodes() && !Element.hasClassName(node,className)) ?
        Element.collectTextNodesIgnoreClass(node, className) : ''));
  }).flatten().join('');
};

Element.setContentZoom = function(element, percent) {
  element = $(element);
  element.setStyle({fontSize: (percent/100) + 'em'});
  if (Prototype.Browser.WebKit) window.scrollBy(0,0);
  return element;
};

Element.getInlineOpacity = function(element){
  return $(element).style.opacity || '';
};

Element.forceRerendering = function(element) {
  try {
    element = $(element);
    var n = document.createTextNode(' ');
    element.appendChild(n);
    element.removeChild(n);
  } catch(e) { }
};

/*--------------------------------------------------------------------------*/

var Effect = {
  _elementDoesNotExistError: {
    name: 'ElementDoesNotExistError',
    message: 'The specified DOM element does not exist, but is required for this effect to operate'
  },
  Transitions: {
    linear: Prototype.K,
    sinoidal: function(pos) {
      return (-Math.cos(pos*Math.PI)/2) + .5;
    },
    reverse: function(pos) {
      return 1-pos;
    },
    flicker: function(pos) {
      var pos = ((-Math.cos(pos*Math.PI)/4) + .75) + Math.random()/4;
      return pos > 1 ? 1 : pos;
    },
    wobble: function(pos) {
      return (-Math.cos(pos*Math.PI*(9*pos))/2) + .5;
    },
    pulse: function(pos, pulses) {
      return (-Math.cos((pos*((pulses||5)-.5)*2)*Math.PI)/2) + .5;
    },
    spring: function(pos) {
      return 1 - (Math.cos(pos * 4.5 * Math.PI) * Math.exp(-pos * 6));
    },
    none: function(pos) {
      return 0;
    },
    full: function(pos) {
      return 1;
    }
  },
  DefaultOptions: {
    duration:   1.0,   // seconds
    fps:        100,   // 100= assume 66fps max.
    sync:       false, // true for combining
    from:       0.0,
    to:         1.0,
    delay:      0.0,
    queue:      'parallel'
  },
  tagifyText: function(element) {
    var tagifyStyle = 'position:relative';
    if (Prototype.Browser.IE) tagifyStyle += ';zoom:1';

    element = $(element);
    $A(element.childNodes).each( function(child) {
      if (child.nodeType==3) {
        child.nodeValue.toArray().each( function(character) {
          element.insertBefore(
            new Element('span', {style: tagifyStyle}).update(
              character == ' ' ? String.fromCharCode(160) : character),
              child);
        });
        Element.remove(child);
      }
    });
  },
  multiple: function(element, effect) {
    var elements;
    if (((typeof element == 'object') ||
        Object.isFunction(element)) &&
       (element.length))
      elements = element;
    else
      elements = $(element).childNodes;

    var options = Object.extend({
      speed: 0.1,
      delay: 0.0
    }, arguments[2] || { });
    var masterDelay = options.delay;

    $A(elements).each( function(element, index) {
      new effect(element, Object.extend(options, { delay: index * options.speed + masterDelay }));
    });
  },
  PAIRS: {
    'slide':  ['SlideDown','SlideUp'],
    'blind':  ['BlindDown','BlindUp'],
    'appear': ['Appear','Fade']
  },
  toggle: function(element, effect) {
    element = $(element);
    effect = (effect || 'appear').toLowerCase();
    var options = Object.extend({
      queue: { position:'end', scope:(element.id || 'global'), limit: 1 }
    }, arguments[2] || { });
    Effect[element.visible() ?
      Effect.PAIRS[effect][1] : Effect.PAIRS[effect][0]](element, options);
  }
};

Effect.DefaultOptions.transition = Effect.Transitions.sinoidal;

/* ------------- core effects ------------- */

Effect.ScopedQueue = Class.create(Enumerable, {
  initialize: function() {
    this.effects  = [];
    this.interval = null;
  },
  _each: function(iterator) {
    this.effects._each(iterator);
  },
  add: function(effect) {
    var timestamp = new Date().getTime();

    var position = Object.isString(effect.options.queue) ?
      effect.options.queue : effect.options.queue.position;

    switch(position) {
      case 'front':
        // move unstarted effects after this effect
        this.effects.findAll(function(e){ return e.state=='idle' }).each( function(e) {
            e.startOn  += effect.finishOn;
            e.finishOn += effect.finishOn;
          });
        break;
      case 'with-last':
        timestamp = this.effects.pluck('startOn').max() || timestamp;
        break;
      case 'end':
        // start effect after last queued effect has finished
        timestamp = this.effects.pluck('finishOn').max() || timestamp;
        break;
    }

    effect.startOn  += timestamp;
    effect.finishOn += timestamp;

    if (!effect.options.queue.limit || (this.effects.length < effect.options.queue.limit))
      this.effects.push(effect);

    if (!this.interval)
      this.interval = setInterval(this.loop.bind(this), 15);
  },
  remove: function(effect) {
    this.effects = this.effects.reject(function(e) { return e==effect });
    if (this.effects.length == 0) {
      clearInterval(this.interval);
      this.interval = null;
    }
  },
  loop: function() {
    var timePos = new Date().getTime();
    for(var i=0, len=this.effects.length;i<len;i++)
      this.effects[i] && this.effects[i].loop(timePos);
  }
});

Effect.Queues = {
  instances: $H(),
  get: function(queueName) {
    if (!Object.isString(queueName)) return queueName;

    return this.instances.get(queueName) ||
      this.instances.set(queueName, new Effect.ScopedQueue());
  }
};
Effect.Queue = Effect.Queues.get('global');

Effect.Base = Class.create({
  position: null,
  start: function(options) {
    function codeForEvent(options,eventName){
      return (
        (options[eventName+'Internal'] ? 'this.options.'+eventName+'Internal(this);' : '') +
        (options[eventName] ? 'this.options.'+eventName+'(this);' : '')
      );
    }
    if (options && options.transition === false) options.transition = Effect.Transitions.linear;
    this.options      = Object.extend(Object.extend({ },Effect.DefaultOptions), options || { });
    this.currentFrame = 0;
    this.state        = 'idle';
    this.startOn      = this.options.delay*1000;
    this.finishOn     = this.startOn+(this.options.duration*1000);
    this.fromToDelta  = this.options.to-this.options.from;
    this.totalTime    = this.finishOn-this.startOn;
    this.totalFrames  = this.options.fps*this.options.duration;

    this.render = (function() {
      function dispatch(effect, eventName) {
        if (effect.options[eventName + 'Internal'])
          effect.options[eventName + 'Internal'](effect);
        if (effect.options[eventName])
          effect.options[eventName](effect);
      }

      return function(pos) {
        if (this.state === "idle") {
          this.state = "running";
          dispatch(this, 'beforeSetup');
          if (this.setup) this.setup();
          dispatch(this, 'afterSetup');
        }
        if (this.state === "running") {
          pos = (this.options.transition(pos) * this.fromToDelta) + this.options.from;
          this.position = pos;
          dispatch(this, 'beforeUpdate');
          if (this.update) this.update(pos);
          dispatch(this, 'afterUpdate');
        }
      };
    })();

    this.event('beforeStart');
    if (!this.options.sync)
      Effect.Queues.get(Object.isString(this.options.queue) ?
        'global' : this.options.queue.scope).add(this);
  },
  loop: function(timePos) {
    if (timePos >= this.startOn) {
      if (timePos >= this.finishOn) {
        this.render(1.0);
        this.cancel();
        this.event('beforeFinish');
        if (this.finish) this.finish();
        this.event('afterFinish');
        return;
      }
      var pos   = (timePos - this.startOn) / this.totalTime,
          frame = (pos * this.totalFrames).round();
      if (frame > this.currentFrame) {
        this.render(pos);
        this.currentFrame = frame;
      }
    }
  },
  cancel: function() {
    if (!this.options.sync)
      Effect.Queues.get(Object.isString(this.options.queue) ?
        'global' : this.options.queue.scope).remove(this);
    this.state = 'finished';
  },
  event: function(eventName) {
    if (this.options[eventName + 'Internal']) this.options[eventName + 'Internal'](this);
    if (this.options[eventName]) this.options[eventName](this);
  },
  inspect: function() {
    var data = $H();
    for(property in this)
      if (!Object.isFunction(this[property])) data.set(property, this[property]);
    return '#<Effect:' + data.inspect() + ',options:' + $H(this.options).inspect() + '>';
  }
});

Effect.Parallel = Class.create(Effect.Base, {
  initialize: function(effects) {
    this.effects = effects || [];
    this.start(arguments[1]);
  },
  update: function(position) {
    this.effects.invoke('render', position);
  },
  finish: function(position) {
    this.effects.each( function(effect) {
      effect.render(1.0);
      effect.cancel();
      effect.event('beforeFinish');
      if (effect.finish) effect.finish(position);
      effect.event('afterFinish');
    });
  }
});

Effect.Tween = Class.create(Effect.Base, {
  initialize: function(object, from, to) {
    object = Object.isString(object) ? $(object) : object;
    var args = $A(arguments), method = args.last(),
      options = args.length == 5 ? args[3] : null;
    this.method = Object.isFunction(method) ? method.bind(object) :
      Object.isFunction(object[method]) ? object[method].bind(object) :
      function(value) { object[method] = value };
    this.start(Object.extend({ from: from, to: to }, options || { }));
  },
  update: function(position) {
    this.method(position);
  }
});

Effect.Event = Class.create(Effect.Base, {
  initialize: function() {
    this.start(Object.extend({ duration: 0 }, arguments[0] || { }));
  },
  update: Prototype.emptyFunction
});

Effect.Opacity = Class.create(Effect.Base, {
  initialize: function(element) {
    this.element = $(element);
    if (!this.element) throw(Effect._elementDoesNotExistError);
    // make this work on IE on elements without 'layout'
    if (Prototype.Browser.IE && (!this.element.currentStyle.hasLayout))
      this.element.setStyle({zoom: 1});
    var options = Object.extend({
      from: this.element.getOpacity() || 0.0,
      to:   1.0
    }, arguments[1] || { });
    this.start(options);
  },
  update: function(position) {
    this.element.setOpacity(position);
  }
});

Effect.Move = Class.create(Effect.Base, {
  initialize: function(element) {
    this.element = $(element);
    if (!this.element) throw(Effect._elementDoesNotExistError);
    var options = Object.extend({
      x:    0,
      y:    0,
      mode: 'relative'
    }, arguments[1] || { });
    this.start(options);
  },
  setup: function() {
    this.element.makePositioned();
    this.originalLeft = parseFloat(this.element.getStyle('left') || '0');
    this.originalTop  = parseFloat(this.element.getStyle('top')  || '0');
    if (this.options.mode == 'absolute') {
      this.options.x = this.options.x - this.originalLeft;
      this.options.y = this.options.y - this.originalTop;
    }
  },
  update: function(position) {
    this.element.setStyle({
      left: (this.options.x  * position + this.originalLeft).round() + 'px',
      top:  (this.options.y  * position + this.originalTop).round()  + 'px'
    });
  }
});

// for backwards compatibility
Effect.MoveBy = function(element, toTop, toLeft) {
  return new Effect.Move(element,
    Object.extend({ x: toLeft, y: toTop }, arguments[3] || { }));
};

Effect.Scale = Class.create(Effect.Base, {
  initialize: function(element, percent) {
    this.element = $(element);
    if (!this.element) throw(Effect._elementDoesNotExistError);
    var options = Object.extend({
      scaleX: true,
      scaleY: true,
      scaleContent: true,
      scaleFromCenter: false,
      scaleMode: 'box',        // 'box' or 'contents' or { } with provided values
      scaleFrom: 100.0,
      scaleTo:   percent
    }, arguments[2] || { });
    this.start(options);
  },
  setup: function() {
    this.restoreAfterFinish = this.options.restoreAfterFinish || false;
    this.elementPositioning = this.element.getStyle('position');

    this.originalStyle = { };
    ['top','left','width','height','fontSize'].each( function(k) {
      this.originalStyle[k] = this.element.style[k];
    }.bind(this));

    this.originalTop  = this.element.offsetTop;
    this.originalLeft = this.element.offsetLeft;

    var fontSize = this.element.getStyle('font-size') || '100%';
    ['em','px','%','pt'].each( function(fontSizeType) {
      if (fontSize.indexOf(fontSizeType)>0) {
        this.fontSize     = parseFloat(fontSize);
        this.fontSizeType = fontSizeType;
      }
    }.bind(this));

    this.factor = (this.options.scaleTo - this.options.scaleFrom)/100;

    this.dims = null;
    if (this.options.scaleMode=='box')
      this.dims = [this.element.offsetHeight, this.element.offsetWidth];
    if (/^content/.test(this.options.scaleMode))
      this.dims = [this.element.scrollHeight, this.element.scrollWidth];
    if (!this.dims)
      this.dims = [this.options.scaleMode.originalHeight,
                   this.options.scaleMode.originalWidth];
  },
  update: function(position) {
    var currentScale = (this.options.scaleFrom/100.0) + (this.factor * position);
    if (this.options.scaleContent && this.fontSize)
      this.element.setStyle({fontSize: this.fontSize * currentScale + this.fontSizeType });
    this.setDimensions(this.dims[0] * currentScale, this.dims[1] * currentScale);
  },
  finish: function(position) {
    if (this.restoreAfterFinish) this.element.setStyle(this.originalStyle);
  },
  setDimensions: function(height, width) {
    var d = { };
    if (this.options.scaleX) d.width = width.round() + 'px';
    if (this.options.scaleY) d.height = height.round() + 'px';
    if (this.options.scaleFromCenter) {
      var topd  = (height - this.dims[0])/2;
      var leftd = (width  - this.dims[1])/2;
      if (this.elementPositioning == 'absolute') {
        if (this.options.scaleY) d.top = this.originalTop-topd + 'px';
        if (this.options.scaleX) d.left = this.originalLeft-leftd + 'px';
      } else {
        if (this.options.scaleY) d.top = -topd + 'px';
        if (this.options.scaleX) d.left = -leftd + 'px';
      }
    }
    this.element.setStyle(d);
  }
});

Effect.Highlight = Class.create(Effect.Base, {
  initialize: function(element) {
    this.element = $(element);
    if (!this.element) throw(Effect._elementDoesNotExistError);
    var options = Object.extend({ startcolor: '#ffff99' }, arguments[1] || { });
    this.start(options);
  },
  setup: function() {
    // Prevent executing on elements not in the layout flow
    if (this.element.getStyle('display')=='none') { this.cancel(); return; }
    // Disable background image during the effect
    this.oldStyle = { };
    if (!this.options.keepBackgroundImage) {
      this.oldStyle.backgroundImage = this.element.getStyle('background-image');
      this.element.setStyle({backgroundImage: 'none'});
    }
    if (!this.options.endcolor)
      this.options.endcolor = this.element.getStyle('background-color').parseColor('#ffffff');
    if (!this.options.restorecolor)
      this.options.restorecolor = this.element.getStyle('background-color');
    // init color calculations
    this._base  = $R(0,2).map(function(i){ return parseInt(this.options.startcolor.slice(i*2+1,i*2+3),16) }.bind(this));
    this._delta = $R(0,2).map(function(i){ return parseInt(this.options.endcolor.slice(i*2+1,i*2+3),16)-this._base[i] }.bind(this));
  },
  update: function(position) {
    this.element.setStyle({backgroundColor: $R(0,2).inject('#',function(m,v,i){
      return m+((this._base[i]+(this._delta[i]*position)).round().toColorPart()); }.bind(this)) });
  },
  finish: function() {
    this.element.setStyle(Object.extend(this.oldStyle, {
      backgroundColor: this.options.restorecolor
    }));
  }
});

Effect.ScrollTo = function(element) {
  var options = arguments[1] || { },
  scrollOffsets = document.viewport.getScrollOffsets(),
  elementOffsets = $(element).cumulativeOffset();

  if (options.offset) elementOffsets[1] += options.offset;

  return new Effect.Tween(null,
    scrollOffsets.top,
    elementOffsets[1],
    options,
    function(p){ scrollTo(scrollOffsets.left, p.round()); }
  );
};

/* ------------- combination effects ------------- */

Effect.Fade = function(element) {
  element = $(element);
  var oldOpacity = element.getInlineOpacity();
  var options = Object.extend({
    from: element.getOpacity() || 1.0,
    to:   0.0,
    afterFinishInternal: function(effect) {
      if (effect.options.to!=0) return;
      effect.element.hide().setStyle({opacity: oldOpacity});
    }
  }, arguments[1] || { });
  return new Effect.Opacity(element,options);
};

Effect.Appear = function(element) {
  element = $(element);
  var options = Object.extend({
  from: (element.getStyle('display') == 'none' ? 0.0 : element.getOpacity() || 0.0),
  to:   1.0,
  // force Safari to render floated elements properly
  afterFinishInternal: function(effect) {
    effect.element.forceRerendering();
  },
  beforeSetup: function(effect) {
    effect.element.setOpacity(effect.options.from).show();
  }}, arguments[1] || { });
  return new Effect.Opacity(element,options);
};

Effect.Puff = function(element) {
  element = $(element);
  var oldStyle = {
    opacity: element.getInlineOpacity(),
    position: element.getStyle('position'),
    top:  element.style.top,
    left: element.style.left,
    width: element.style.width,
    height: element.style.height
  };
  return new Effect.Parallel(
   [ new Effect.Scale(element, 200,
      { sync: true, scaleFromCenter: true, scaleContent: true, restoreAfterFinish: true }),
     new Effect.Opacity(element, { sync: true, to: 0.0 } ) ],
     Object.extend({ duration: 1.0,
      beforeSetupInternal: function(effect) {
        Position.absolutize(effect.effects[0].element);
      },
      afterFinishInternal: function(effect) {
         effect.effects[0].element.hide().setStyle(oldStyle); }
     }, arguments[1] || { })
   );
};

Effect.BlindUp = function(element) {
  element = $(element);
  element.makeClipping();
  return new Effect.Scale(element, 0,
    Object.extend({ scaleContent: false,
      scaleX: false,
      restoreAfterFinish: true,
      afterFinishInternal: function(effect) {
        effect.element.hide().undoClipping();
      }
    }, arguments[1] || { })
  );
};

Effect.BlindDown = function(element) {
  element = $(element);
  var elementDimensions = element.getDimensions();
  return new Effect.Scale(element, 100, Object.extend({
    scaleContent: false,
    scaleX: false,
    scaleFrom: 0,
    scaleMode: {originalHeight: elementDimensions.height, originalWidth: elementDimensions.width},
    restoreAfterFinish: true,
    afterSetup: function(effect) {
      effect.element.makeClipping().setStyle({height: '0px'}).show();
    },
    afterFinishInternal: function(effect) {
      effect.element.undoClipping();
    }
  }, arguments[1] || { }));
};

Effect.SwitchOff = function(element) {
  element = $(element);
  var oldOpacity = element.getInlineOpacity();
  return new Effect.Appear(element, Object.extend({
    duration: 0.4,
    from: 0,
    transition: Effect.Transitions.flicker,
    afterFinishInternal: function(effect) {
      new Effect.Scale(effect.element, 1, {
        duration: 0.3, scaleFromCenter: true,
        scaleX: false, scaleContent: false, restoreAfterFinish: true,
        beforeSetup: function(effect) {
          effect.element.makePositioned().makeClipping();
        },
        afterFinishInternal: function(effect) {
          effect.element.hide().undoClipping().undoPositioned().setStyle({opacity: oldOpacity});
        }
      });
    }
  }, arguments[1] || { }));
};

Effect.DropOut = function(element) {
  element = $(element);
  var oldStyle = {
    top: element.getStyle('top'),
    left: element.getStyle('left'),
    opacity: element.getInlineOpacity() };
  return new Effect.Parallel(
    [ new Effect.Move(element, {x: 0, y: 100, sync: true }),
      new Effect.Opacity(element, { sync: true, to: 0.0 }) ],
    Object.extend(
      { duration: 0.5,
        beforeSetup: function(effect) {
          effect.effects[0].element.makePositioned();
        },
        afterFinishInternal: function(effect) {
          effect.effects[0].element.hide().undoPositioned().setStyle(oldStyle);
        }
      }, arguments[1] || { }));
};

Effect.Shake = function(element) {
  element = $(element);
  var options = Object.extend({
    distance: 20,
    duration: 0.5
  }, arguments[1] || {});
  var distance = parseFloat(options.distance);
  var split = parseFloat(options.duration) / 10.0;
  var oldStyle = {
    top: element.getStyle('top'),
    left: element.getStyle('left') };
    return new Effect.Move(element,
      { x:  distance, y: 0, duration: split, afterFinishInternal: function(effect) {
    new Effect.Move(effect.element,
      { x: -distance*2, y: 0, duration: split*2,  afterFinishInternal: function(effect) {
    new Effect.Move(effect.element,
      { x:  distance*2, y: 0, duration: split*2,  afterFinishInternal: function(effect) {
    new Effect.Move(effect.element,
      { x: -distance*2, y: 0, duration: split*2,  afterFinishInternal: function(effect) {
    new Effect.Move(effect.element,
      { x:  distance*2, y: 0, duration: split*2,  afterFinishInternal: function(effect) {
    new Effect.Move(effect.element,
      { x: -distance, y: 0, duration: split, afterFinishInternal: function(effect) {
        effect.element.undoPositioned().setStyle(oldStyle);
  }}); }}); }}); }}); }}); }});
};

Effect.SlideDown = function(element) {
  element = $(element).cleanWhitespace();
  // SlideDown need to have the content of the element wrapped in a container element with fixed height!
  var oldInnerBottom = element.down().getStyle('bottom');
  var elementDimensions = element.getDimensions();
  return new Effect.Scale(element, 100, Object.extend({
    scaleContent: false,
    scaleX: false,
    scaleFrom: window.opera ? 0 : 1,
    scaleMode: {originalHeight: elementDimensions.height, originalWidth: elementDimensions.width},
    restoreAfterFinish: true,
    afterSetup: function(effect) {
      effect.element.makePositioned();
      effect.element.down().makePositioned();
      if (window.opera) effect.element.setStyle({top: ''});
      effect.element.makeClipping().setStyle({height: '0px'}).show();
    },
    afterUpdateInternal: function(effect) {
      effect.element.down().setStyle({bottom:
        (effect.dims[0] - effect.element.clientHeight) + 'px' });
    },
    afterFinishInternal: function(effect) {
      effect.element.undoClipping().undoPositioned();
      effect.element.down().undoPositioned().setStyle({bottom: oldInnerBottom}); }
    }, arguments[1] || { })
  );
};

Effect.SlideUp = function(element) {
  element = $(element).cleanWhitespace();
  var oldInnerBottom = element.down().getStyle('bottom');
  var elementDimensions = element.getDimensions();
  return new Effect.Scale(element, window.opera ? 0 : 1,
   Object.extend({ scaleContent: false,
    scaleX: false,
    scaleMode: 'box',
    scaleFrom: 100,
    scaleMode: {originalHeight: elementDimensions.height, originalWidth: elementDimensions.width},
    restoreAfterFinish: true,
    afterSetup: function(effect) {
      effect.element.makePositioned();
      effect.element.down().makePositioned();
      if (window.opera) effect.element.setStyle({top: ''});
      effect.element.makeClipping().show();
    },
    afterUpdateInternal: function(effect) {
      effect.element.down().setStyle({bottom:
        (effect.dims[0] - effect.element.clientHeight) + 'px' });
    },
    afterFinishInternal: function(effect) {
      effect.element.hide().undoClipping().undoPositioned();
      effect.element.down().undoPositioned().setStyle({bottom: oldInnerBottom});
    }
   }, arguments[1] || { })
  );
};

// Bug in opera makes the TD containing this element expand for a instance after finish
Effect.Squish = function(element) {
  return new Effect.Scale(element, window.opera ? 1 : 0, {
    restoreAfterFinish: true,
    beforeSetup: function(effect) {
      effect.element.makeClipping();
    },
    afterFinishInternal: function(effect) {
      effect.element.hide().undoClipping();
    }
  });
};

Effect.Grow = function(element) {
  element = $(element);
  var options = Object.extend({
    direction: 'center',
    moveTransition: Effect.Transitions.sinoidal,
    scaleTransition: Effect.Transitions.sinoidal,
    opacityTransition: Effect.Transitions.full
  }, arguments[1] || { });
  var oldStyle = {
    top: element.style.top,
    left: element.style.left,
    height: element.style.height,
    width: element.style.width,
    opacity: element.getInlineOpacity() };

  var dims = element.getDimensions();
  var initialMoveX, initialMoveY;
  var moveX, moveY;

  switch (options.direction) {
    case 'top-left':
      initialMoveX = initialMoveY = moveX = moveY = 0;
      break;
    case 'top-right':
      initialMoveX = dims.width;
      initialMoveY = moveY = 0;
      moveX = -dims.width;
      break;
    case 'bottom-left':
      initialMoveX = moveX = 0;
      initialMoveY = dims.height;
      moveY = -dims.height;
      break;
    case 'bottom-right':
      initialMoveX = dims.width;
      initialMoveY = dims.height;
      moveX = -dims.width;
      moveY = -dims.height;
      break;
    case 'center':
      initialMoveX = dims.width / 2;
      initialMoveY = dims.height / 2;
      moveX = -dims.width / 2;
      moveY = -dims.height / 2;
      break;
  }

  return new Effect.Move(element, {
    x: initialMoveX,
    y: initialMoveY,
    duration: 0.01,
    beforeSetup: function(effect) {
      effect.element.hide().makeClipping().makePositioned();
    },
    afterFinishInternal: function(effect) {
      new Effect.Parallel(
        [ new Effect.Opacity(effect.element, { sync: true, to: 1.0, from: 0.0, transition: options.opacityTransition }),
          new Effect.Move(effect.element, { x: moveX, y: moveY, sync: true, transition: options.moveTransition }),
          new Effect.Scale(effect.element, 100, {
            scaleMode: { originalHeight: dims.height, originalWidth: dims.width },
            sync: true, scaleFrom: window.opera ? 1 : 0, transition: options.scaleTransition, restoreAfterFinish: true})
        ], Object.extend({
             beforeSetup: function(effect) {
               effect.effects[0].element.setStyle({height: '0px'}).show();
             },
             afterFinishInternal: function(effect) {
               effect.effects[0].element.undoClipping().undoPositioned().setStyle(oldStyle);
             }
           }, options)
      );
    }
  });
};

Effect.Shrink = function(element) {
  element = $(element);
  var options = Object.extend({
    direction: 'center',
    moveTransition: Effect.Transitions.sinoidal,
    scaleTransition: Effect.Transitions.sinoidal,
    opacityTransition: Effect.Transitions.none
  }, arguments[1] || { });
  var oldStyle = {
    top: element.style.top,
    left: element.style.left,
    height: element.style.height,
    width: element.style.width,
    opacity: element.getInlineOpacity() };

  var dims = element.getDimensions();
  var moveX, moveY;

  switch (options.direction) {
    case 'top-left':
      moveX = moveY = 0;
      break;
    case 'top-right':
      moveX = dims.width;
      moveY = 0;
      break;
    case 'bottom-left':
      moveX = 0;
      moveY = dims.height;
      break;
    case 'bottom-right':
      moveX = dims.width;
      moveY = dims.height;
      break;
    case 'center':
      moveX = dims.width / 2;
      moveY = dims.height / 2;
      break;
  }

  return new Effect.Parallel(
    [ new Effect.Opacity(element, { sync: true, to: 0.0, from: 1.0, transition: options.opacityTransition }),
      new Effect.Scale(element, window.opera ? 1 : 0, { sync: true, transition: options.scaleTransition, restoreAfterFinish: true}),
      new Effect.Move(element, { x: moveX, y: moveY, sync: true, transition: options.moveTransition })
    ], Object.extend({
         beforeStartInternal: function(effect) {
           effect.effects[0].element.makePositioned().makeClipping();
         },
         afterFinishInternal: function(effect) {
           effect.effects[0].element.hide().undoClipping().undoPositioned().setStyle(oldStyle); }
       }, options)
  );
};

Effect.Pulsate = function(element) {
  element = $(element);
  var options    = arguments[1] || { },
    oldOpacity = element.getInlineOpacity(),
    transition = options.transition || Effect.Transitions.linear,
    reverser   = function(pos){
      return 1 - transition((-Math.cos((pos*(options.pulses||5)*2)*Math.PI)/2) + .5);
    };

  return new Effect.Opacity(element,
    Object.extend(Object.extend({  duration: 2.0, from: 0,
      afterFinishInternal: function(effect) { effect.element.setStyle({opacity: oldOpacity}); }
    }, options), {transition: reverser}));
};

Effect.Fold = function(element) {
  element = $(element);
  var oldStyle = {
    top: element.style.top,
    left: element.style.left,
    width: element.style.width,
    height: element.style.height };
  element.makeClipping();
  return new Effect.Scale(element, 5, Object.extend({
    scaleContent: false,
    scaleX: false,
    afterFinishInternal: function(effect) {
    new Effect.Scale(element, 1, {
      scaleContent: false,
      scaleY: false,
      afterFinishInternal: function(effect) {
        effect.element.hide().undoClipping().setStyle(oldStyle);
      } });
  }}, arguments[1] || { }));
};

Effect.Morph = Class.create(Effect.Base, {
  initialize: function(element) {
    this.element = $(element);
    if (!this.element) throw(Effect._elementDoesNotExistError);
    var options = Object.extend({
      style: { }
    }, arguments[1] || { });

    if (!Object.isString(options.style)) this.style = $H(options.style);
    else {
      if (options.style.include(':'))
        this.style = options.style.parseStyle();
      else {
        this.element.addClassName(options.style);
        this.style = $H(this.element.getStyles());
        this.element.removeClassName(options.style);
        var css = this.element.getStyles();
        this.style = this.style.reject(function(style) {
          return style.value == css[style.key];
        });
        options.afterFinishInternal = function(effect) {
          effect.element.addClassName(effect.options.style);
          effect.transforms.each(function(transform) {
            effect.element.style[transform.style] = '';
          });
        };
      }
    }
    this.start(options);
  },

  setup: function(){
    function parseColor(color){
      if (!color || ['rgba(0, 0, 0, 0)','transparent'].include(color)) color = '#ffffff';
      color = color.parseColor();
      return $R(0,2).map(function(i){
        return parseInt( color.slice(i*2+1,i*2+3), 16 );
      });
    }
    this.transforms = this.style.map(function(pair){
      var property = pair[0], value = pair[1], unit = null;

      if (value.parseColor('#zzzzzz') != '#zzzzzz') {
        value = value.parseColor();
        unit  = 'color';
      } else if (property == 'opacity') {
        value = parseFloat(value);
        if (Prototype.Browser.IE && (!this.element.currentStyle.hasLayout))
          this.element.setStyle({zoom: 1});
      } else if (Element.CSS_LENGTH.test(value)) {
          var components = value.match(/^([\+\-]?[0-9\.]+)(.*)$/);
          value = parseFloat(components[1]);
          unit = (components.length == 3) ? components[2] : null;
      }

      var originalValue = this.element.getStyle(property);
      return {
        style: property.camelize(),
        originalValue: unit=='color' ? parseColor(originalValue) : parseFloat(originalValue || 0),
        targetValue: unit=='color' ? parseColor(value) : value,
        unit: unit
      };
    }.bind(this)).reject(function(transform){
      return (
        (transform.originalValue == transform.targetValue) ||
        (
          transform.unit != 'color' &&
          (isNaN(transform.originalValue) || isNaN(transform.targetValue))
        )
      );
    });
  },
  update: function(position) {
    var style = { }, transform, i = this.transforms.length;
    while(i--)
      style[(transform = this.transforms[i]).style] =
        transform.unit=='color' ? '#'+
          (Math.round(transform.originalValue[0]+
            (transform.targetValue[0]-transform.originalValue[0])*position)).toColorPart() +
          (Math.round(transform.originalValue[1]+
            (transform.targetValue[1]-transform.originalValue[1])*position)).toColorPart() +
          (Math.round(transform.originalValue[2]+
            (transform.targetValue[2]-transform.originalValue[2])*position)).toColorPart() :
        (transform.originalValue +
          (transform.targetValue - transform.originalValue) * position).toFixed(3) +
            (transform.unit === null ? '' : transform.unit);
    this.element.setStyle(style, true);
  }
});

Effect.Transform = Class.create({
  initialize: function(tracks){
    this.tracks  = [];
    this.options = arguments[1] || { };
    this.addTracks(tracks);
  },
  addTracks: function(tracks){
    tracks.each(function(track){
      track = $H(track);
      var data = track.values().first();
      this.tracks.push($H({
        ids:     track.keys().first(),
        effect:  Effect.Morph,
        options: { style: data }
      }));
    }.bind(this));
    return this;
  },
  play: function(){
    return new Effect.Parallel(
      this.tracks.map(function(track){
        var ids = track.get('ids'), effect = track.get('effect'), options = track.get('options');
        var elements = [$(ids) || $$(ids)].flatten();
        return elements.map(function(e){ return new effect(e, Object.extend({ sync:true }, options)) });
      }).flatten(),
      this.options
    );
  }
});

Element.CSS_PROPERTIES = $w(
  'backgroundColor backgroundPosition borderBottomColor borderBottomStyle ' +
  'borderBottomWidth borderLeftColor borderLeftStyle borderLeftWidth ' +
  'borderRightColor borderRightStyle borderRightWidth borderSpacing ' +
  'borderTopColor borderTopStyle borderTopWidth bottom clip color ' +
  'fontSize fontWeight height left letterSpacing lineHeight ' +
  'marginBottom marginLeft marginRight marginTop markerOffset maxHeight '+
  'maxWidth minHeight minWidth opacity outlineColor outlineOffset ' +
  'outlineWidth paddingBottom paddingLeft paddingRight paddingTop ' +
  'right textIndent top width wordSpacing zIndex');

Element.CSS_LENGTH = /^(([\+\-]?[0-9\.]+)(em|ex|px|in|cm|mm|pt|pc|\%))|0$/;

String.__parseStyleElement = document.createElement('div');
String.prototype.parseStyle = function(){
  var style, styleRules = $H();
  if (Prototype.Browser.WebKit)
    style = new Element('div',{style:this}).style;
  else {
    String.__parseStyleElement.innerHTML = '<div style="' + this + '"></div>';
    style = String.__parseStyleElement.childNodes[0].style;
  }

  Element.CSS_PROPERTIES.each(function(property){
    if (style[property]) styleRules.set(property, style[property]);
  });

  if (Prototype.Browser.IE && this.include('opacity'))
    styleRules.set('opacity', this.match(/opacity:\s*((?:0|1)?(?:\.\d*)?)/)[1]);

  return styleRules;
};

if (document.defaultView && document.defaultView.getComputedStyle) {
  Element.getStyles = function(element) {
    var css = document.defaultView.getComputedStyle($(element), null);
    return Element.CSS_PROPERTIES.inject({ }, function(styles, property) {
      styles[property] = css[property];
      return styles;
    });
  };
} else {
  Element.getStyles = function(element) {
    element = $(element);
    var css = element.currentStyle, styles;
    styles = Element.CSS_PROPERTIES.inject({ }, function(results, property) {
      results[property] = css[property];
      return results;
    });
    if (!styles.opacity) styles.opacity = element.getOpacity();
    return styles;
  };
}

Effect.Methods = {
  morph: function(element, style) {
    element = $(element);
    new Effect.Morph(element, Object.extend({ style: style }, arguments[2] || { }));
    return element;
  },
  visualEffect: function(element, effect, options) {
    element = $(element);
    var s = effect.dasherize().camelize(), klass = s.charAt(0).toUpperCase() + s.substring(1);
    new Effect[klass](element, options);
    return element;
  },
  highlight: function(element, options) {
    element = $(element);
    new Effect.Highlight(element, options);
    return element;
  }
};

$w('fade appear grow shrink fold blindUp blindDown slideUp slideDown '+
  'pulsate shake puff squish switchOff dropOut').each(
  function(effect) {
    Effect.Methods[effect] = function(element, options){
      element = $(element);
      Effect[effect.charAt(0).toUpperCase() + effect.substring(1)](element, options);
      return element;
    };
  }
);

$w('getInlineOpacity forceRerendering setContentZoom collectTextNodes collectTextNodesIgnoreClass getStyles').each(
  function(f) { Effect.Methods[f] = Element[f]; }
);

Element.addMethods(Effect.Methods);

// Copyright (c) 2005-2008 Thomas Fuchs (http://script.aculo.us, http://mir.aculo.us)
//           (c) 2005-2008 Sammi Williams (http://www.oriontransfer.co.nz, sammi@oriontransfer.co.nz)
//
// script.aculo.us is freely distributable under the terms of an MIT-style license.
// For details, see the script.aculo.us web site: http://script.aculo.us/

if(Object.isUndefined(Effect))
  throw("dragdrop.js requires including script.aculo.us' effects.js library");

var Droppables = {
  drops: [],

  remove: function(element) {
    this.drops = this.drops.reject(function(d) { return d.element==$(element) });
  },

  add: function(element) {
    element = $(element);
    var options = Object.extend({
      greedy:     true,
      hoverclass: null,
      tree:       false
    }, arguments[1] || { });

    // cache containers
    if(options.containment) {
      options._containers = [];
      var containment = options.containment;
      if(Object.isArray(containment)) {
        containment.each( function(c) { options._containers.push($(c)) });
      } else {
        options._containers.push($(containment));
      }
    }

    if(options.accept) options.accept = [options.accept].flatten();

    Element.makePositioned(element); // fix IE
    options.element = element;

    this.drops.push(options);
  },

  findDeepestChild: function(drops) {
    deepest = drops[0];

    for (i = 1; i < drops.length; ++i)
      if (Element.isParent(drops[i].element, deepest.element))
        deepest = drops[i];

    return deepest;
  },

  isContained: function(element, drop) {
    var containmentNode;
    if(drop.tree) {
      containmentNode = element.treeNode;
    } else {
      containmentNode = element.parentNode;
    }
    return drop._containers.detect(function(c) { return containmentNode == c });
  },

  isAffected: function(point, element, drop) {
    return (
      (drop.element!=element) &&
      ((!drop._containers) ||
        this.isContained(element, drop)) &&
      ((!drop.accept) ||
        (Element.classNames(element).detect(
          function(v) { return drop.accept.include(v) } ) )) &&
      Position.within(drop.element, point[0], point[1]) );
  },

  deactivate: function(drop) {
    if(drop.hoverclass)
      Element.removeClassName(drop.element, drop.hoverclass);
    this.last_active = null;
  },

  activate: function(drop) {
    if(drop.hoverclass)
      Element.addClassName(drop.element, drop.hoverclass);
    this.last_active = drop;
  },

  show: function(point, element) {
    if(!this.drops.length) return;
    var drop, affected = [];

    this.drops.each( function(drop) {
      if(Droppables.isAffected(point, element, drop))
        affected.push(drop);
    });

    if(affected.length>0)
      drop = Droppables.findDeepestChild(affected);

    if(this.last_active && this.last_active != drop) this.deactivate(this.last_active);
    if (drop) {
      Position.within(drop.element, point[0], point[1]);
      if(drop.onHover)
        drop.onHover(element, drop.element, Position.overlap(drop.overlap, drop.element));

      if (drop != this.last_active) Droppables.activate(drop);
    }
  },

  fire: function(event, element) {
    if(!this.last_active) return;
    Position.prepare();

    if (this.isAffected([Event.pointerX(event), Event.pointerY(event)], element, this.last_active))
      if (this.last_active.onDrop) {
        this.last_active.onDrop(element, this.last_active.element, event);
        return true;
      }
  },

  reset: function() {
    if(this.last_active)
      this.deactivate(this.last_active);
  }
};

var Draggables = {
  drags: [],
  observers: [],

  register: function(draggable) {
    if(this.drags.length == 0) {
      this.eventMouseUp   = this.endDrag.bindAsEventListener(this);
      this.eventMouseMove = this.updateDrag.bindAsEventListener(this);
      this.eventKeypress  = this.keyPress.bindAsEventListener(this);

      Event.observe(document, "mouseup", this.eventMouseUp);
      Event.observe(document, "mousemove", this.eventMouseMove);
      Event.observe(document, "keypress", this.eventKeypress);
    }
    this.drags.push(draggable);
  },

  unregister: function(draggable) {
    this.drags = this.drags.reject(function(d) { return d==draggable });
    if(this.drags.length == 0) {
      Event.stopObserving(document, "mouseup", this.eventMouseUp);
      Event.stopObserving(document, "mousemove", this.eventMouseMove);
      Event.stopObserving(document, "keypress", this.eventKeypress);
    }
  },

  activate: function(draggable) {
    if(draggable.options.delay) {
      this._timeout = setTimeout(function() {
        Draggables._timeout = null;
        window.focus();
        Draggables.activeDraggable = draggable;
      }.bind(this), draggable.options.delay);
    } else {
      window.focus(); // allows keypress events if window isn't currently focused, fails for Safari
      this.activeDraggable = draggable;
    }
  },

  deactivate: function() {
    this.activeDraggable = null;
  },

  updateDrag: function(event) {
    if(!this.activeDraggable) return;
    var pointer = [Event.pointerX(event), Event.pointerY(event)];
    // Mozilla-based browsers fire successive mousemove events with
    // the same coordinates, prevent needless redrawing (moz bug?)
    if(this._lastPointer && (this._lastPointer.inspect() == pointer.inspect())) return;
    this._lastPointer = pointer;

    this.activeDraggable.updateDrag(event, pointer);
  },

  endDrag: function(event) {
    if(this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
    if(!this.activeDraggable) return;
    this._lastPointer = null;
    this.activeDraggable.endDrag(event);
    this.activeDraggable = null;
  },

  keyPress: function(event) {
    if(this.activeDraggable)
      this.activeDraggable.keyPress(event);
  },

  addObserver: function(observer) {
    this.observers.push(observer);
    this._cacheObserverCallbacks();
  },

  removeObserver: function(element) {  // element instead of observer fixes mem leaks
    this.observers = this.observers.reject( function(o) { return o.element==element });
    this._cacheObserverCallbacks();
  },

  notify: function(eventName, draggable, event) {  // 'onStart', 'onEnd', 'onDrag'
    if(this[eventName+'Count'] > 0)
      this.observers.each( function(o) {
        if(o[eventName]) o[eventName](eventName, draggable, event);
      });
    if(draggable.options[eventName]) draggable.options[eventName](draggable, event);
  },

  _cacheObserverCallbacks: function() {
    ['onStart','onEnd','onDrag'].each( function(eventName) {
      Draggables[eventName+'Count'] = Draggables.observers.select(
        function(o) { return o[eventName]; }
      ).length;
    });
  }
};

/*--------------------------------------------------------------------------*/

var Draggable = Class.create({
  initialize: function(element) {
    var defaults = {
      handle: false,
      reverteffect: function(element, top_offset, left_offset) {
        var dur = Math.sqrt(Math.abs(top_offset^2)+Math.abs(left_offset^2))*0.02;
        new Effect.Move(element, { x: -left_offset, y: -top_offset, duration: dur,
          queue: {scope:'_draggable', position:'end'}
        });
      },
      endeffect: function(element) {
        var toOpacity = Object.isNumber(element._opacity) ? element._opacity : 1.0;
        new Effect.Opacity(element, {duration:0.2, from:0.7, to:toOpacity,
          queue: {scope:'_draggable', position:'end'},
          afterFinish: function(){
            Draggable._dragging[element] = false
          }
        });
      },
      zindex: 1000,
      revert: false,
      quiet: false,
      scroll: false,
      scrollSensitivity: 20,
      scrollSpeed: 15,
      snap: false,  // false, or xy or [x,y] or function(x,y){ return [x,y] }
      delay: 0
    };

    if(!arguments[1] || Object.isUndefined(arguments[1].endeffect))
      Object.extend(defaults, {
        starteffect: function(element) {
          element._opacity = Element.getOpacity(element);
          Draggable._dragging[element] = true;
          new Effect.Opacity(element, {duration:0.2, from:element._opacity, to:0.7});
        }
      });

    var options = Object.extend(defaults, arguments[1] || { });

    this.element = $(element);

    if(options.handle && Object.isString(options.handle))
      this.handle = this.element.down('.'+options.handle, 0);

    if(!this.handle) this.handle = $(options.handle);
    if(!this.handle) this.handle = this.element;

    if(options.scroll && !options.scroll.scrollTo && !options.scroll.outerHTML) {
      options.scroll = $(options.scroll);
      this._isScrollChild = Element.childOf(this.element, options.scroll);
    }

    Element.makePositioned(this.element); // fix IE

    this.options  = options;
    this.dragging = false;

    this.eventMouseDown = this.initDrag.bindAsEventListener(this);
    Event.observe(this.handle, "mousedown", this.eventMouseDown);

    Draggables.register(this);
  },

  destroy: function() {
    Event.stopObserving(this.handle, "mousedown", this.eventMouseDown);
    Draggables.unregister(this);
  },

  currentDelta: function() {
    return([
      parseInt(Element.getStyle(this.element,'left') || '0'),
      parseInt(Element.getStyle(this.element,'top') || '0')]);
  },

  initDrag: function(event) {
    if(!Object.isUndefined(Draggable._dragging[this.element]) &&
      Draggable._dragging[this.element]) return;
    if(Event.isLeftClick(event)) {
      // abort on form elements, fixes a Firefox issue
      var src = Event.element(event);
      if((tag_name = src.tagName.toUpperCase()) && (
        tag_name=='INPUT' ||
        tag_name=='SELECT' ||
        tag_name=='OPTION' ||
        tag_name=='BUTTON' ||
        tag_name=='TEXTAREA')) return;

      var pointer = [Event.pointerX(event), Event.pointerY(event)];
      var pos     = Position.cumulativeOffset(this.element);
      this.offset = [0,1].map( function(i) { return (pointer[i] - pos[i]) });

      Draggables.activate(this);
      Event.stop(event);
    }
  },

  startDrag: function(event) {
    this.dragging = true;
    if(!this.delta)
      this.delta = this.currentDelta();

    if(this.options.zindex) {
      this.originalZ = parseInt(Element.getStyle(this.element,'z-index') || 0);
      this.element.style.zIndex = this.options.zindex;
    }

    if(this.options.ghosting) {
      this._clone = this.element.cloneNode(true);
      this._originallyAbsolute = (this.element.getStyle('position') == 'absolute');
      if (!this._originallyAbsolute)
        Position.absolutize(this.element);
      this.element.parentNode.insertBefore(this._clone, this.element);
    }

    if(this.options.scroll) {
      if (this.options.scroll == window) {
        var where = this._getWindowScroll(this.options.scroll);
        this.originalScrollLeft = where.left;
        this.originalScrollTop = where.top;
      } else {
        this.originalScrollLeft = this.options.scroll.scrollLeft;
        this.originalScrollTop = this.options.scroll.scrollTop;
      }
    }

    Draggables.notify('onStart', this, event);

    if(this.options.starteffect) this.options.starteffect(this.element);
  },

  updateDrag: function(event, pointer) {
    if(!this.dragging) this.startDrag(event);

    if(!this.options.quiet){
      Position.prepare();
      Droppables.show(pointer, this.element);
    }

    Draggables.notify('onDrag', this, event);

    this.draw(pointer);
    if(this.options.change) this.options.change(this);

    if(this.options.scroll) {
      this.stopScrolling();

      var p;
      if (this.options.scroll == window) {
        with(this._getWindowScroll(this.options.scroll)) { p = [ left, top, left+width, top+height ]; }
      } else {
        p = Position.page(this.options.scroll);
        p[0] += this.options.scroll.scrollLeft + Position.deltaX;
        p[1] += this.options.scroll.scrollTop + Position.deltaY;
        p.push(p[0]+this.options.scroll.offsetWidth);
        p.push(p[1]+this.options.scroll.offsetHeight);
      }
      var speed = [0,0];
      if(pointer[0] < (p[0]+this.options.scrollSensitivity)) speed[0] = pointer[0]-(p[0]+this.options.scrollSensitivity);
      if(pointer[1] < (p[1]+this.options.scrollSensitivity)) speed[1] = pointer[1]-(p[1]+this.options.scrollSensitivity);
      if(pointer[0] > (p[2]-this.options.scrollSensitivity)) speed[0] = pointer[0]-(p[2]-this.options.scrollSensitivity);
      if(pointer[1] > (p[3]-this.options.scrollSensitivity)) speed[1] = pointer[1]-(p[3]-this.options.scrollSensitivity);
      this.startScrolling(speed);
    }

    // fix AppleWebKit rendering
    if(Prototype.Browser.WebKit) window.scrollBy(0,0);

    Event.stop(event);
  },

  finishDrag: function(event, success) {
    this.dragging = false;

    if(this.options.quiet){
      Position.prepare();
      var pointer = [Event.pointerX(event), Event.pointerY(event)];
      Droppables.show(pointer, this.element);
    }

    if(this.options.ghosting) {
      if (!this._originallyAbsolute)
        Position.relativize(this.element);
      delete this._originallyAbsolute;
      Element.remove(this._clone);
      this._clone = null;
    }

    var dropped = false;
    if(success) {
      dropped = Droppables.fire(event, this.element);
      if (!dropped) dropped = false;
    }
    if(dropped && this.options.onDropped) this.options.onDropped(this.element);
    Draggables.notify('onEnd', this, event);

    var revert = this.options.revert;
    if(revert && Object.isFunction(revert)) revert = revert(this.element);

    var d = this.currentDelta();
    if(revert && this.options.reverteffect) {
      if (dropped == 0 || revert != 'failure')
        this.options.reverteffect(this.element,
          d[1]-this.delta[1], d[0]-this.delta[0]);
    } else {
      this.delta = d;
    }

    if(this.options.zindex)
      this.element.style.zIndex = this.originalZ;

    if(this.options.endeffect)
      this.options.endeffect(this.element);

    Draggables.deactivate(this);
    Droppables.reset();
  },

  keyPress: function(event) {
    if(event.keyCode!=Event.KEY_ESC) return;
    this.finishDrag(event, false);
    Event.stop(event);
  },

  endDrag: function(event) {
    if(!this.dragging) return;
    this.stopScrolling();
    this.finishDrag(event, true);
    Event.stop(event);
  },

  draw: function(point) {
    var pos = Position.cumulativeOffset(this.element);
    if(this.options.ghosting) {
      var r   = Position.realOffset(this.element);
      pos[0] += r[0] - Position.deltaX; pos[1] += r[1] - Position.deltaY;
    }

    var d = this.currentDelta();
    pos[0] -= d[0]; pos[1] -= d[1];

    if(this.options.scroll && (this.options.scroll != window && this._isScrollChild)) {
      pos[0] -= this.options.scroll.scrollLeft-this.originalScrollLeft;
      pos[1] -= this.options.scroll.scrollTop-this.originalScrollTop;
    }

    var p = [0,1].map(function(i){
      return (point[i]-pos[i]-this.offset[i])
    }.bind(this));

    if(this.options.snap) {
      if(Object.isFunction(this.options.snap)) {
        p = this.options.snap(p[0],p[1],this);
      } else {
      if(Object.isArray(this.options.snap)) {
        p = p.map( function(v, i) {
          return (v/this.options.snap[i]).round()*this.options.snap[i] }.bind(this));
      } else {
        p = p.map( function(v) {
          return (v/this.options.snap).round()*this.options.snap }.bind(this));
      }
    }}

    var style = this.element.style;
    if((!this.options.constraint) || (this.options.constraint=='horizontal'))
      style.left = p[0] + "px";
    if((!this.options.constraint) || (this.options.constraint=='vertical'))
      style.top  = p[1] + "px";

    if(style.visibility=="hidden") style.visibility = ""; // fix gecko rendering
  },

  stopScrolling: function() {
    if(this.scrollInterval) {
      clearInterval(this.scrollInterval);
      this.scrollInterval = null;
      Draggables._lastScrollPointer = null;
    }
  },

  startScrolling: function(speed) {
    if(!(speed[0] || speed[1])) return;
    this.scrollSpeed = [speed[0]*this.options.scrollSpeed,speed[1]*this.options.scrollSpeed];
    this.lastScrolled = new Date();
    this.scrollInterval = setInterval(this.scroll.bind(this), 10);
  },

  scroll: function() {
    var current = new Date();
    var delta = current - this.lastScrolled;
    this.lastScrolled = current;
    if(this.options.scroll == window) {
      with (this._getWindowScroll(this.options.scroll)) {
        if (this.scrollSpeed[0] || this.scrollSpeed[1]) {
          var d = delta / 1000;
          this.options.scroll.scrollTo( left + d*this.scrollSpeed[0], top + d*this.scrollSpeed[1] );
        }
      }
    } else {
      this.options.scroll.scrollLeft += this.scrollSpeed[0] * delta / 1000;
      this.options.scroll.scrollTop  += this.scrollSpeed[1] * delta / 1000;
    }

    Position.prepare();
    Droppables.show(Draggables._lastPointer, this.element);
    Draggables.notify('onDrag', this);
    if (this._isScrollChild) {
      Draggables._lastScrollPointer = Draggables._lastScrollPointer || $A(Draggables._lastPointer);
      Draggables._lastScrollPointer[0] += this.scrollSpeed[0] * delta / 1000;
      Draggables._lastScrollPointer[1] += this.scrollSpeed[1] * delta / 1000;
      if (Draggables._lastScrollPointer[0] < 0)
        Draggables._lastScrollPointer[0] = 0;
      if (Draggables._lastScrollPointer[1] < 0)
        Draggables._lastScrollPointer[1] = 0;
      this.draw(Draggables._lastScrollPointer);
    }

    if(this.options.change) this.options.change(this);
  },

  _getWindowScroll: function(w) {
    var T, L, W, H;
    with (w.document) {
      if (w.document.documentElement && documentElement.scrollTop) {
        T = documentElement.scrollTop;
        L = documentElement.scrollLeft;
      } else if (w.document.body) {
        T = body.scrollTop;
        L = body.scrollLeft;
      }
      if (w.innerWidth) {
        W = w.innerWidth;
        H = w.innerHeight;
      } else if (w.document.documentElement && documentElement.clientWidth) {
        W = documentElement.clientWidth;
        H = documentElement.clientHeight;
      } else {
        W = body.offsetWidth;
        H = body.offsetHeight;
      }
    }
    return { top: T, left: L, width: W, height: H };
  }
});

Draggable._dragging = { };

/*--------------------------------------------------------------------------*/

var SortableObserver = Class.create({
  initialize: function(element, observer) {
    this.element   = $(element);
    this.observer  = observer;
    this.lastValue = Sortable.serialize(this.element);
  },

  onStart: function() {
    this.lastValue = Sortable.serialize(this.element);
  },

  onEnd: function() {
    Sortable.unmark();
    if(this.lastValue != Sortable.serialize(this.element))
      this.observer(this.element)
  }
});

var Sortable = {
  SERIALIZE_RULE: /^[^_\-](?:[A-Za-z0-9\-\_]*)[_](.*)$/,

  sortables: { },

  _findRootElement: function(element) {
    while (element.tagName.toUpperCase() != "BODY") {
      if(element.id && Sortable.sortables[element.id]) return element;
      element = element.parentNode;
    }
  },

  options: function(element) {
    element = Sortable._findRootElement($(element));
    if(!element) return;
    return Sortable.sortables[element.id];
  },

  destroy: function(element){
    element = $(element);
    var s = Sortable.sortables[element.id];

    if(s) {
      Draggables.removeObserver(s.element);
      s.droppables.each(function(d){ Droppables.remove(d) });
      s.draggables.invoke('destroy');

      delete Sortable.sortables[s.element.id];
    }
  },

  create: function(element) {
    element = $(element);
    var options = Object.extend({
      element:     element,
      tag:         'li',       // assumes li children, override with tag: 'tagname'
      dropOnEmpty: false,
      tree:        false,
      treeTag:     'ul',
      overlap:     'vertical', // one of 'vertical', 'horizontal'
      constraint:  'vertical', // one of 'vertical', 'horizontal', false
      containment: element,    // also takes array of elements (or id's); or false
      handle:      false,      // or a CSS class
      only:        false,
      delay:       0,
      hoverclass:  null,
      ghosting:    false,
      quiet:       false,
      scroll:      false,
      scrollSensitivity: 20,
      scrollSpeed: 15,
      format:      this.SERIALIZE_RULE,

      // these take arrays of elements or ids and can be
      // used for better initialization performance
      elements:    false,
      handles:     false,

      onChange:    Prototype.emptyFunction,
      onUpdate:    Prototype.emptyFunction
    }, arguments[1] || { });

    // clear any old sortable with same element
    this.destroy(element);

    // build options for the draggables
    var options_for_draggable = {
      revert:      true,
      quiet:       options.quiet,
      scroll:      options.scroll,
      scrollSpeed: options.scrollSpeed,
      scrollSensitivity: options.scrollSensitivity,
      delay:       options.delay,
      ghosting:    options.ghosting,
      constraint:  options.constraint,
      handle:      options.handle };

    if(options.starteffect)
      options_for_draggable.starteffect = options.starteffect;

    if(options.reverteffect)
      options_for_draggable.reverteffect = options.reverteffect;
    else
      if(options.ghosting) options_for_draggable.reverteffect = function(element) {
        element.style.top  = 0;
        element.style.left = 0;
      };

    if(options.endeffect)
      options_for_draggable.endeffect = options.endeffect;

    if(options.zindex)
      options_for_draggable.zindex = options.zindex;

    // build options for the droppables
    var options_for_droppable = {
      overlap:     options.overlap,
      containment: options.containment,
      tree:        options.tree,
      hoverclass:  options.hoverclass,
      onHover:     Sortable.onHover
    };

    var options_for_tree = {
      onHover:      Sortable.onEmptyHover,
      overlap:      options.overlap,
      containment:  options.containment,
      hoverclass:   options.hoverclass
    };

    // fix for gecko engine
    Element.cleanWhitespace(element);

    options.draggables = [];
    options.droppables = [];

    // drop on empty handling
    if(options.dropOnEmpty || options.tree) {
      Droppables.add(element, options_for_tree);
      options.droppables.push(element);
    }

    (options.elements || this.findElements(element, options) || []).each( function(e,i) {
      var handle = options.handles ? $(options.handles[i]) :
        (options.handle ? $(e).select('.' + options.handle)[0] : e);
      options.draggables.push(
        new Draggable(e, Object.extend(options_for_draggable, { handle: handle })));
      Droppables.add(e, options_for_droppable);
      if(options.tree) e.treeNode = element;
      options.droppables.push(e);
    });

    if(options.tree) {
      (Sortable.findTreeElements(element, options) || []).each( function(e) {
        Droppables.add(e, options_for_tree);
        e.treeNode = element;
        options.droppables.push(e);
      });
    }

    // keep reference
    this.sortables[element.id] = options;

    // for onupdate
    Draggables.addObserver(new SortableObserver(element, options.onUpdate));

  },

  // return all suitable-for-sortable elements in a guaranteed order
  findElements: function(element, options) {
    return Element.findChildren(
      element, options.only, options.tree ? true : false, options.tag);
  },

  findTreeElements: function(element, options) {
    return Element.findChildren(
      element, options.only, options.tree ? true : false, options.treeTag);
  },

  onHover: function(element, dropon, overlap) {
    if(Element.isParent(dropon, element)) return;

    if(overlap > .33 && overlap < .66 && Sortable.options(dropon).tree) {
      return;
    } else if(overlap>0.5) {
      Sortable.mark(dropon, 'before');
      if(dropon.previousSibling != element) {
        var oldParentNode = element.parentNode;
        element.style.visibility = "hidden"; // fix gecko rendering
        dropon.parentNode.insertBefore(element, dropon);
        if(dropon.parentNode!=oldParentNode)
          Sortable.options(oldParentNode).onChange(element);
        Sortable.options(dropon.parentNode).onChange(element);
      }
    } else {
      Sortable.mark(dropon, 'after');
      var nextElement = dropon.nextSibling || null;
      if(nextElement != element) {
        var oldParentNode = element.parentNode;
        element.style.visibility = "hidden"; // fix gecko rendering
        dropon.parentNode.insertBefore(element, nextElement);
        if(dropon.parentNode!=oldParentNode)
          Sortable.options(oldParentNode).onChange(element);
        Sortable.options(dropon.parentNode).onChange(element);
      }
    }
  },

  onEmptyHover: function(element, dropon, overlap) {
    var oldParentNode = element.parentNode;
    var droponOptions = Sortable.options(dropon);

    if(!Element.isParent(dropon, element)) {
      var index;

      var children = Sortable.findElements(dropon, {tag: droponOptions.tag, only: droponOptions.only});
      var child = null;

      if(children) {
        var offset = Element.offsetSize(dropon, droponOptions.overlap) * (1.0 - overlap);

        for (index = 0; index < children.length; index += 1) {
          if (offset - Element.offsetSize (children[index], droponOptions.overlap) >= 0) {
            offset -= Element.offsetSize (children[index], droponOptions.overlap);
          } else if (offset - (Element.offsetSize (children[index], droponOptions.overlap) / 2) >= 0) {
            child = index + 1 < children.length ? children[index + 1] : null;
            break;
          } else {
            child = children[index];
            break;
          }
        }
      }

      dropon.insertBefore(element, child);

      Sortable.options(oldParentNode).onChange(element);
      droponOptions.onChange(element);
    }
  },

  unmark: function() {
    if(Sortable._marker) Sortable._marker.hide();
  },

  mark: function(dropon, position) {
    // mark on ghosting only
    var sortable = Sortable.options(dropon.parentNode);
    if(sortable && !sortable.ghosting) return;

    if(!Sortable._marker) {
      Sortable._marker =
        ($('dropmarker') || Element.extend(document.createElement('DIV'))).
          hide().addClassName('dropmarker').setStyle({position:'absolute'});
      document.getElementsByTagName("body").item(0).appendChild(Sortable._marker);
    }
    var offsets = Position.cumulativeOffset(dropon);
    Sortable._marker.setStyle({left: offsets[0]+'px', top: offsets[1] + 'px'});

    if(position=='after')
      if(sortable.overlap == 'horizontal')
        Sortable._marker.setStyle({left: (offsets[0]+dropon.clientWidth) + 'px'});
      else
        Sortable._marker.setStyle({top: (offsets[1]+dropon.clientHeight) + 'px'});

    Sortable._marker.show();
  },

  _tree: function(element, options, parent) {
    var children = Sortable.findElements(element, options) || [];

    for (var i = 0; i < children.length; ++i) {
      var match = children[i].id.match(options.format);

      if (!match) continue;

      var child = {
        id: encodeURIComponent(match ? match[1] : null),
        element: element,
        parent: parent,
        children: [],
        position: parent.children.length,
        container: $(children[i]).down(options.treeTag)
      };

      /* Get the element containing the children and recurse over it */
      if (child.container)
        this._tree(child.container, options, child);

      parent.children.push (child);
    }

    return parent;
  },

  tree: function(element) {
    element = $(element);
    var sortableOptions = this.options(element);
    var options = Object.extend({
      tag: sortableOptions.tag,
      treeTag: sortableOptions.treeTag,
      only: sortableOptions.only,
      name: element.id,
      format: sortableOptions.format
    }, arguments[1] || { });

    var root = {
      id: null,
      parent: null,
      children: [],
      container: element,
      position: 0
    };

    return Sortable._tree(element, options, root);
  },

  /* Construct a [i] index for a particular node */
  _constructIndex: function(node) {
    var index = '';
    do {
      if (node.id) index = '[' + node.position + ']' + index;
    } while ((node = node.parent) != null);
    return index;
  },

  sequence: function(element) {
    element = $(element);
    var options = Object.extend(this.options(element), arguments[1] || { });

    return $(this.findElements(element, options) || []).map( function(item) {
      return item.id.match(options.format) ? item.id.match(options.format)[1] : '';
    });
  },

  setSequence: function(element, new_sequence) {
    element = $(element);
    var options = Object.extend(this.options(element), arguments[2] || { });

    var nodeMap = { };
    this.findElements(element, options).each( function(n) {
        if (n.id.match(options.format))
            nodeMap[n.id.match(options.format)[1]] = [n, n.parentNode];
        n.parentNode.removeChild(n);
    });

    new_sequence.each(function(ident) {
      var n = nodeMap[ident];
      if (n) {
        n[1].appendChild(n[0]);
        delete nodeMap[ident];
      }
    });
  },

  serialize: function(element) {
    element = $(element);
    var options = Object.extend(Sortable.options(element), arguments[1] || { });
    var name = encodeURIComponent(
      (arguments[1] && arguments[1].name) ? arguments[1].name : element.id);

    if (options.tree) {
      return Sortable.tree(element, arguments[1]).children.map( function (item) {
        return [name + Sortable._constructIndex(item) + "[id]=" +
                encodeURIComponent(item.id)].concat(item.children.map(arguments.callee));
      }).flatten().join('&');
    } else {
      return Sortable.sequence(element, arguments[1]).map( function(item) {
        return name + "[]=" + encodeURIComponent(item);
      }).join('&');
    }
  }
};

// Returns true if child is contained within element
Element.isParent = function(child, element) {
  if (!child.parentNode || child == element) return false;
  if (child.parentNode == element) return true;
  return Element.isParent(child.parentNode, element);
};

Element.findChildren = function(element, only, recursive, tagName) {
  if(!element.hasChildNodes()) return null;
  tagName = tagName.toUpperCase();
  if(only) only = [only].flatten();
  var elements = [];
  $A(element.childNodes).each( function(e) {
    if(e.tagName && e.tagName.toUpperCase()==tagName &&
      (!only || (Element.classNames(e).detect(function(v) { return only.include(v) }))))
        elements.push(e);
    if(recursive) {
      var grandchildren = Element.findChildren(e, only, recursive, tagName);
      if(grandchildren) elements.push(grandchildren);
    }
  });

  return (elements.length>0 ? elements.flatten() : []);
};

Element.offsetSize = function (element, type) {
  return element['offset' + ((type=='vertical' || type=='height') ? 'Height' : 'Width')];
};

// Copyright (c) 2005-2008 Thomas Fuchs (http://script.aculo.us, http://mir.aculo.us)
//           (c) 2005-2008 Ivan Krstic (http://blogs.law.harvard.edu/ivan)
//           (c) 2005-2008 Jon Tirsen (http://www.tirsen.com)
// Contributors:
//  Richard Livsey
//  Rahul Bhargava
//  Rob Wills
//
// script.aculo.us is freely distributable under the terms of an MIT-style license.
// For details, see the script.aculo.us web site: http://script.aculo.us/

// Autocompleter.Base handles all the autocompletion functionality
// that's independent of the data source for autocompletion. This
// includes drawing the autocompletion menu, observing keyboard
// and mouse events, and similar.
//
// Specific autocompleters need to provide, at the very least,
// a getUpdatedChoices function that will be invoked every time
// the text inside the monitored textbox changes. This method
// should get the text for which to provide autocompletion by
// invoking this.getToken(), NOT by directly accessing
// this.element.value. This is to allow incremental tokenized
// autocompletion. Specific auto-completion logic (AJAX, etc)
// belongs in getUpdatedChoices.
//
// Tokenized incremental autocompletion is enabled automatically
// when an autocompleter is instantiated with the 'tokens' option
// in the options parameter, e.g.:
// new Ajax.Autocompleter('id','upd', '/url/', { tokens: ',' });
// will incrementally autocomplete with a comma as the token.
// Additionally, ',' in the above example can be replaced with
// a token array, e.g. { tokens: [',', '\n'] } which
// enables autocompletion on multiple tokens. This is most
// useful when one of the tokens is \n (a newline), as it
// allows smart autocompletion after linebreaks.

if(typeof Effect == 'undefined')
  throw("controls.js requires including script.aculo.us' effects.js library");

var Autocompleter = { };
Autocompleter.Base = Class.create({
  baseInitialize: function(element, update, options) {
    element          = $(element);
    this.element     = element;
    this.update      = $(update);
    this.hasFocus    = false;
    this.changed     = false;
    this.active      = false;
    this.index       = 0;
    this.entryCount  = 0;
    this.oldElementValue = this.element.value;

    if(this.setOptions)
      this.setOptions(options);
    else
      this.options = options || { };

    this.options.paramName    = this.options.paramName || this.element.name;
    this.options.tokens       = this.options.tokens || [];
    this.options.frequency    = this.options.frequency || 0.4;
    this.options.minChars     = this.options.minChars || 1;
    this.options.onShow       = this.options.onShow ||
      function(element, update){
        if(!update.style.position || update.style.position=='absolute') {
          update.style.position = 'absolute';
          Position.clone(element, update, {
            setHeight: false,
            offsetTop: element.offsetHeight
          });
        }
        Effect.Appear(update,{duration:0.15});
      };
    this.options.onHide = this.options.onHide ||
      function(element, update){ new Effect.Fade(update,{duration:0.15}) };

    if(typeof(this.options.tokens) == 'string')
      this.options.tokens = new Array(this.options.tokens);
    // Force carriage returns as token delimiters anyway
    if (!this.options.tokens.include('\n'))
      this.options.tokens.push('\n');

    this.observer = null;

    this.element.setAttribute('autocomplete','off');

    Element.hide(this.update);

    Event.observe(this.element, 'blur', this.onBlur.bindAsEventListener(this));
    Event.observe(this.element, 'keydown', this.onKeyPress.bindAsEventListener(this));
  },

  show: function() {
    if(Element.getStyle(this.update, 'display')=='none') this.options.onShow(this.element, this.update);
    if(!this.iefix &&
      (Prototype.Browser.IE) &&
      (Element.getStyle(this.update, 'position')=='absolute')) {
      new Insertion.After(this.update,
       '<iframe id="' + this.update.id + '_iefix" '+
       'style="display:none;position:absolute;filter:progid:DXImageTransform.Microsoft.Alpha(opacity=0);" ' +
       'src="javascript:false;" frameborder="0" scrolling="no"></iframe>');
      this.iefix = $(this.update.id+'_iefix');
    }
    if(this.iefix) setTimeout(this.fixIEOverlapping.bind(this), 50);
  },

  fixIEOverlapping: function() {
    Position.clone(this.update, this.iefix, {setTop:(!this.update.style.height)});
    this.iefix.style.zIndex = 1;
    this.update.style.zIndex = 2;
    Element.show(this.iefix);
  },

  hide: function() {
    this.stopIndicator();
    if(Element.getStyle(this.update, 'display')!='none') this.options.onHide(this.element, this.update);
    if(this.iefix) Element.hide(this.iefix);
  },

  startIndicator: function() {
    if(this.options.indicator) Element.show(this.options.indicator);
  },

  stopIndicator: function() {
    if(this.options.indicator) Element.hide(this.options.indicator);
  },

  onKeyPress: function(event) {
    if(this.active)
      switch(event.keyCode) {
       case Event.KEY_TAB:
       case Event.KEY_RETURN:
         this.selectEntry();
         Event.stop(event);
       case Event.KEY_ESC:
         this.hide();
         this.active = false;
         Event.stop(event);
         return;
       case Event.KEY_LEFT:
       case Event.KEY_RIGHT:
         return;
       case Event.KEY_UP:
         this.markPrevious();
         this.render();
         Event.stop(event);
         return;
       case Event.KEY_DOWN:
         this.markNext();
         this.render();
         Event.stop(event);
         return;
      }
     else
       if(event.keyCode==Event.KEY_TAB || event.keyCode==Event.KEY_RETURN ||
         (Prototype.Browser.WebKit > 0 && event.keyCode == 0)) return;

    this.changed = true;
    this.hasFocus = true;

    if(this.observer) clearTimeout(this.observer);
      this.observer =
        setTimeout(this.onObserverEvent.bind(this), this.options.frequency*1000);
  },

  activate: function() {
    this.changed = false;
    this.hasFocus = true;
    this.getUpdatedChoices();
  },

  onHover: function(event) {
    var element = Event.findElement(event, 'LI');
    if(this.index != element.autocompleteIndex)
    {
        this.index = element.autocompleteIndex;
        this.render();
    }
    Event.stop(event);
  },

  onClick: function(event) {
    var element = Event.findElement(event, 'LI');
    this.index = element.autocompleteIndex;
    this.selectEntry();
    this.hide();
  },

  onBlur: function(event) {
    // needed to make click events working
    setTimeout(this.hide.bind(this), 250);
    this.hasFocus = false;
    this.active = false;
  },

  render: function() {
    if(this.entryCount > 0) {
      for (var i = 0; i < this.entryCount; i++)
        this.index==i ?
          Element.addClassName(this.getEntry(i),"selected") :
          Element.removeClassName(this.getEntry(i),"selected");
      if(this.hasFocus) {
        this.show();
        this.active = true;
      }
    } else {
      this.active = false;
      this.hide();
    }
  },

  markPrevious: function() {
    if(this.index > 0) this.index--;
      else this.index = this.entryCount-1;
    this.getEntry(this.index).scrollIntoView(true);
  },

  markNext: function() {
    if(this.index < this.entryCount-1) this.index++;
      else this.index = 0;
    this.getEntry(this.index).scrollIntoView(false);
  },

  getEntry: function(index) {
    return this.update.firstChild.childNodes[index];
  },

  getCurrentEntry: function() {
    return this.getEntry(this.index);
  },

  selectEntry: function() {
    this.active = false;
    this.updateElement(this.getCurrentEntry());
  },

  updateElement: function(selectedElement) {
    if (this.options.updateElement) {
      this.options.updateElement(selectedElement);
      return;
    }
    var value = '';
    if (this.options.select) {
      var nodes = $(selectedElement).select('.' + this.options.select) || [];
      if(nodes.length>0) value = Element.collectTextNodes(nodes[0], this.options.select);
    } else
      value = Element.collectTextNodesIgnoreClass(selectedElement, 'informal');

    var bounds = this.getTokenBounds();
    if (bounds[0] != -1) {
      var newValue = this.element.value.substr(0, bounds[0]);
      var whitespace = this.element.value.substr(bounds[0]).match(/^\s+/);
      if (whitespace)
        newValue += whitespace[0];
      this.element.value = newValue + value + this.element.value.substr(bounds[1]);
    } else {
      this.element.value = value;
    }
    this.oldElementValue = this.element.value;
    this.element.focus();

    if (this.options.afterUpdateElement)
      this.options.afterUpdateElement(this.element, selectedElement);
  },

  updateChoices: function(choices) {
    if(!this.changed && this.hasFocus) {
      this.update.innerHTML = choices;
      Element.cleanWhitespace(this.update);
      Element.cleanWhitespace(this.update.down());

      if(this.update.firstChild && this.update.down().childNodes) {
        this.entryCount =
          this.update.down().childNodes.length;
        for (var i = 0; i < this.entryCount; i++) {
          var entry = this.getEntry(i);
          entry.autocompleteIndex = i;
          this.addObservers(entry);
        }
      } else {
        this.entryCount = 0;
      }

      this.stopIndicator();
      this.index = 0;

      if(this.entryCount==1 && this.options.autoSelect) {
        this.selectEntry();
        this.hide();
      } else {
        this.render();
      }
    }
  },

  addObservers: function(element) {
    Event.observe(element, "mouseover", this.onHover.bindAsEventListener(this));
    Event.observe(element, "click", this.onClick.bindAsEventListener(this));
  },

  onObserverEvent: function() {
    this.changed = false;
    this.tokenBounds = null;
    if(this.getToken().length>=this.options.minChars) {
      this.getUpdatedChoices();
    } else {
      this.active = false;
      this.hide();
    }
    this.oldElementValue = this.element.value;
  },

  getToken: function() {
    var bounds = this.getTokenBounds();
    return this.element.value.substring(bounds[0], bounds[1]).strip();
  },

  getTokenBounds: function() {
    if (null != this.tokenBounds) return this.tokenBounds;
    var value = this.element.value;
    if (value.strip().empty()) return [-1, 0];
    var diff = arguments.callee.getFirstDifferencePos(value, this.oldElementValue);
    var offset = (diff == this.oldElementValue.length ? 1 : 0);
    var prevTokenPos = -1, nextTokenPos = value.length;
    var tp;
    for (var index = 0, l = this.options.tokens.length; index < l; ++index) {
      tp = value.lastIndexOf(this.options.tokens[index], diff + offset - 1);
      if (tp > prevTokenPos) prevTokenPos = tp;
      tp = value.indexOf(this.options.tokens[index], diff + offset);
      if (-1 != tp && tp < nextTokenPos) nextTokenPos = tp;
    }
    return (this.tokenBounds = [prevTokenPos + 1, nextTokenPos]);
  }
});

Autocompleter.Base.prototype.getTokenBounds.getFirstDifferencePos = function(newS, oldS) {
  var boundary = Math.min(newS.length, oldS.length);
  for (var index = 0; index < boundary; ++index)
    if (newS[index] != oldS[index])
      return index;
  return boundary;
};

Ajax.Autocompleter = Class.create(Autocompleter.Base, {
  initialize: function(element, update, url, options) {
    this.baseInitialize(element, update, options);
    this.options.asynchronous  = true;
    this.options.onComplete    = this.onComplete.bind(this);
    this.options.defaultParams = this.options.parameters || null;
    this.url                   = url;
  },

  getUpdatedChoices: function() {
    this.startIndicator();

    var entry = encodeURIComponent(this.options.paramName) + '=' +
      encodeURIComponent(this.getToken());

    this.options.parameters = this.options.callback ?
      this.options.callback(this.element, entry) : entry;

    if(this.options.defaultParams)
      this.options.parameters += '&' + this.options.defaultParams;

    new Ajax.Request(this.url, this.options);
  },

  onComplete: function(request) {
    this.updateChoices(request.responseText);
  }
});

// The local array autocompleter. Used when you'd prefer to
// inject an array of autocompletion options into the page, rather
// than sending out Ajax queries, which can be quite slow sometimes.
//
// The constructor takes four parameters. The first two are, as usual,
// the id of the monitored textbox, and id of the autocompletion menu.
// The third is the array you want to autocomplete from, and the fourth
// is the options block.
//
// Extra local autocompletion options:
// - choices - How many autocompletion choices to offer
//
// - partialSearch - If false, the autocompleter will match entered
//                    text only at the beginning of strings in the
//                    autocomplete array. Defaults to true, which will
//                    match text at the beginning of any *word* in the
//                    strings in the autocomplete array. If you want to
//                    search anywhere in the string, additionally set
//                    the option fullSearch to true (default: off).
//
// - fullSsearch - Search anywhere in autocomplete array strings.
//
// - partialChars - How many characters to enter before triggering
//                   a partial match (unlike minChars, which defines
//                   how many characters are required to do any match
//                   at all). Defaults to 2.
//
// - ignoreCase - Whether to ignore case when autocompleting.
//                 Defaults to true.
//
// It's possible to pass in a custom function as the 'selector'
// option, if you prefer to write your own autocompletion logic.
// In that case, the other options above will not apply unless
// you support them.

Autocompleter.Local = Class.create(Autocompleter.Base, {
  initialize: function(element, update, array, options) {
    this.baseInitialize(element, update, options);
    this.options.array = array;
  },

  getUpdatedChoices: function() {
    this.updateChoices(this.options.selector(this));
  },

  setOptions: function(options) {
    this.options = Object.extend({
      choices: 10,
      partialSearch: true,
      partialChars: 2,
      ignoreCase: true,
      fullSearch: false,
      selector: function(instance) {
        var ret       = []; // Beginning matches
        var partial   = []; // Inside matches
        var entry     = instance.getToken();
        var count     = 0;

        for (var i = 0; i < instance.options.array.length &&
          ret.length < instance.options.choices ; i++) {

          var elem = instance.options.array[i];
          var foundPos = instance.options.ignoreCase ?
            elem.toLowerCase().indexOf(entry.toLowerCase()) :
            elem.indexOf(entry);

          while (foundPos != -1) {
            if (foundPos == 0 && elem.length != entry.length) {
              ret.push("<li><strong>" + elem.substr(0, entry.length) + "</strong>" +
                elem.substr(entry.length) + "</li>");
              break;
            } else if (entry.length >= instance.options.partialChars &&
              instance.options.partialSearch && foundPos != -1) {
              if (instance.options.fullSearch || /\s/.test(elem.substr(foundPos-1,1))) {
                partial.push("<li>" + elem.substr(0, foundPos) + "<strong>" +
                  elem.substr(foundPos, entry.length) + "</strong>" + elem.substr(
                  foundPos + entry.length) + "</li>");
                break;
              }
            }

            foundPos = instance.options.ignoreCase ?
              elem.toLowerCase().indexOf(entry.toLowerCase(), foundPos + 1) :
              elem.indexOf(entry, foundPos + 1);

          }
        }
        if (partial.length)
          ret = ret.concat(partial.slice(0, instance.options.choices - ret.length));
        return "<ul>" + ret.join('') + "</ul>";
      }
    }, options || { });
  }
});

// AJAX in-place editor and collection editor
// Full rewrite by Christophe Porteneuve <tdd@tddsworld.com> (April 2007).

// Use this if you notice weird scrolling problems on some browsers,
// the DOM might be a bit confused when this gets called so do this
// waits 1 ms (with setTimeout) until it does the activation
Field.scrollFreeActivate = function(field) {
  setTimeout(function() {
    Field.activate(field);
  }, 1);
};

Ajax.InPlaceEditor = Class.create({
  initialize: function(element, url, options) {
    this.url = url;
    this.element = element = $(element);
    this.prepareOptions();
    this._controls = { };
    arguments.callee.dealWithDeprecatedOptions(options); // DEPRECATION LAYER!!!
    Object.extend(this.options, options || { });
    if (!this.options.formId && this.element.id) {
      this.options.formId = this.element.id + '-inplaceeditor';
      if ($(this.options.formId))
        this.options.formId = '';
    }
    if (this.options.externalControl)
      this.options.externalControl = $(this.options.externalControl);
    if (!this.options.externalControl)
      this.options.externalControlOnly = false;
    this._originalBackground = this.element.getStyle('background-color') || 'transparent';
    this.element.title = this.options.clickToEditText;
    this._boundCancelHandler = this.handleFormCancellation.bind(this);
    this._boundComplete = (this.options.onComplete || Prototype.emptyFunction).bind(this);
    this._boundFailureHandler = this.handleAJAXFailure.bind(this);
    this._boundSubmitHandler = this.handleFormSubmission.bind(this);
    this._boundWrapperHandler = this.wrapUp.bind(this);
    this.registerListeners();
  },
  checkForEscapeOrReturn: function(e) {
    if (!this._editing || e.ctrlKey || e.altKey || e.shiftKey) return;
    if (Event.KEY_ESC == e.keyCode)
      this.handleFormCancellation(e);
    else if (Event.KEY_RETURN == e.keyCode)
      this.handleFormSubmission(e);
  },
  createControl: function(mode, handler, extraClasses) {
    var control = this.options[mode + 'Control'];
    var text = this.options[mode + 'Text'];
    if ('button' == control) {
      var btn = document.createElement('input');
      btn.type = 'submit';
      btn.value = text;
      btn.className = 'editor_' + mode + '_button';
      if ('cancel' == mode)
        btn.onclick = this._boundCancelHandler;
      this._form.appendChild(btn);
      this._controls[mode] = btn;
    } else if ('link' == control) {
      var link = document.createElement('a');
      link.href = '#';
      link.appendChild(document.createTextNode(text));
      link.onclick = 'cancel' == mode ? this._boundCancelHandler : this._boundSubmitHandler;
      link.className = 'editor_' + mode + '_link';
      if (extraClasses)
        link.className += ' ' + extraClasses;
      this._form.appendChild(link);
      this._controls[mode] = link;
    }
  },
  createEditField: function() {
    var text = (this.options.loadTextURL ? this.options.loadingText : this.getText());
    var fld;
    if (1 >= this.options.rows && !/\r|\n/.test(this.getText())) {
      fld = document.createElement('input');
      fld.type = 'text';
      var size = this.options.size || this.options.cols || 0;
      if (0 < size) fld.size = size;
    } else {
      fld = document.createElement('textarea');
      fld.rows = (1 >= this.options.rows ? this.options.autoRows : this.options.rows);
      fld.cols = this.options.cols || 40;
    }
    fld.name = this.options.paramName;
    fld.value = text; // No HTML breaks conversion anymore
    fld.className = 'editor_field';
    if (this.options.submitOnBlur)
      fld.onblur = this._boundSubmitHandler;
    this._controls.editor = fld;
    if (this.options.loadTextURL)
      this.loadExternalText();
    this._form.appendChild(this._controls.editor);
  },
  createForm: function() {
    var ipe = this;
    function addText(mode, condition) {
      var text = ipe.options['text' + mode + 'Controls'];
      if (!text || condition === false) return;
      ipe._form.appendChild(document.createTextNode(text));
    };
    this._form = $(document.createElement('form'));
    this._form.id = this.options.formId;
    this._form.addClassName(this.options.formClassName);
    this._form.onsubmit = this._boundSubmitHandler;
    this.createEditField();
    if ('textarea' == this._controls.editor.tagName.toLowerCase())
      this._form.appendChild(document.createElement('br'));
    if (this.options.onFormCustomization)
      this.options.onFormCustomization(this, this._form);
    addText('Before', this.options.okControl || this.options.cancelControl);
    this.createControl('ok', this._boundSubmitHandler);
    addText('Between', this.options.okControl && this.options.cancelControl);
    this.createControl('cancel', this._boundCancelHandler, 'editor_cancel');
    addText('After', this.options.okControl || this.options.cancelControl);
  },
  destroy: function() {
    if (this._oldInnerHTML)
      this.element.innerHTML = this._oldInnerHTML;
    this.leaveEditMode();
    this.unregisterListeners();
  },
  enterEditMode: function(e) {
    if (this._saving || this._editing) return;
    this._editing = true;
    this.triggerCallback('onEnterEditMode');
    if (this.options.externalControl)
      this.options.externalControl.hide();
    this.element.hide();
    this.createForm();
    this.element.parentNode.insertBefore(this._form, this.element);
    if (!this.options.loadTextURL)
      this.postProcessEditField();
    if (e) Event.stop(e);
  },
  enterHover: function(e) {
    if (this.options.hoverClassName)
      this.element.addClassName(this.options.hoverClassName);
    if (this._saving) return;
    this.triggerCallback('onEnterHover');
  },
  getText: function() {
    return this.element.innerHTML.unescapeHTML();
  },
  handleAJAXFailure: function(transport) {
    this.triggerCallback('onFailure', transport);
    if (this._oldInnerHTML) {
      this.element.innerHTML = this._oldInnerHTML;
      this._oldInnerHTML = null;
    }
  },
  handleFormCancellation: function(e) {
    this.wrapUp();
    if (e) Event.stop(e);
  },
  handleFormSubmission: function(e) {
    var form = this._form;
    var value = $F(this._controls.editor);
    this.prepareSubmission();
    var params = this.options.callback(form, value) || '';
    if (Object.isString(params))
      params = params.toQueryParams();
    params.editorId = this.element.id;
    if (this.options.htmlResponse) {
      var options = Object.extend({ evalScripts: true }, this.options.ajaxOptions);
      Object.extend(options, {
        parameters: params,
        onComplete: this._boundWrapperHandler,
        onFailure: this._boundFailureHandler
      });
      new Ajax.Updater({ success: this.element }, this.url, options);
    } else {
      var options = Object.extend({ method: 'get' }, this.options.ajaxOptions);
      Object.extend(options, {
        parameters: params,
        onComplete: this._boundWrapperHandler,
        onFailure: this._boundFailureHandler
      });
      new Ajax.Request(this.url, options);
    }
    if (e) Event.stop(e);
  },
  leaveEditMode: function() {
    this.element.removeClassName(this.options.savingClassName);
    this.removeForm();
    this.leaveHover();
    this.element.style.backgroundColor = this._originalBackground;
    this.element.show();
    if (this.options.externalControl)
      this.options.externalControl.show();
    this._saving = false;
    this._editing = false;
    this._oldInnerHTML = null;
    this.triggerCallback('onLeaveEditMode');
  },
  leaveHover: function(e) {
    if (this.options.hoverClassName)
      this.element.removeClassName(this.options.hoverClassName);
    if (this._saving) return;
    this.triggerCallback('onLeaveHover');
  },
  loadExternalText: function() {
    this._form.addClassName(this.options.loadingClassName);
    this._controls.editor.disabled = true;
    var options = Object.extend({ method: 'get' }, this.options.ajaxOptions);
    Object.extend(options, {
      parameters: 'editorId=' + encodeURIComponent(this.element.id),
      onComplete: Prototype.emptyFunction,
      onSuccess: function(transport) {
        this._form.removeClassName(this.options.loadingClassName);
        var text = transport.responseText;
        if (this.options.stripLoadedTextTags)
          text = text.stripTags();
        this._controls.editor.value = text;
        this._controls.editor.disabled = false;
        this.postProcessEditField();
      }.bind(this),
      onFailure: this._boundFailureHandler
    });
    new Ajax.Request(this.options.loadTextURL, options);
  },
  postProcessEditField: function() {
    var fpc = this.options.fieldPostCreation;
    if (fpc)
      $(this._controls.editor)['focus' == fpc ? 'focus' : 'activate']();
  },
  prepareOptions: function() {
    this.options = Object.clone(Ajax.InPlaceEditor.DefaultOptions);
    Object.extend(this.options, Ajax.InPlaceEditor.DefaultCallbacks);
    [this._extraDefaultOptions].flatten().compact().each(function(defs) {
      Object.extend(this.options, defs);
    }.bind(this));
  },
  prepareSubmission: function() {
    this._saving = true;
    this.removeForm();
    this.leaveHover();
    this.showSaving();
  },
  registerListeners: function() {
    this._listeners = { };
    var listener;
    $H(Ajax.InPlaceEditor.Listeners).each(function(pair) {
      listener = this[pair.value].bind(this);
      this._listeners[pair.key] = listener;
      if (!this.options.externalControlOnly)
        this.element.observe(pair.key, listener);
      if (this.options.externalControl)
        this.options.externalControl.observe(pair.key, listener);
    }.bind(this));
  },
  removeForm: function() {
    if (!this._form) return;
    this._form.remove();
    this._form = null;
    this._controls = { };
  },
  showSaving: function() {
    this._oldInnerHTML = this.element.innerHTML;
    this.element.innerHTML = this.options.savingText;
    this.element.addClassName(this.options.savingClassName);
    this.element.style.backgroundColor = this._originalBackground;
    this.element.show();
  },
  triggerCallback: function(cbName, arg) {
    if ('function' == typeof this.options[cbName]) {
      this.options[cbName](this, arg);
    }
  },
  unregisterListeners: function() {
    $H(this._listeners).each(function(pair) {
      if (!this.options.externalControlOnly)
        this.element.stopObserving(pair.key, pair.value);
      if (this.options.externalControl)
        this.options.externalControl.stopObserving(pair.key, pair.value);
    }.bind(this));
  },
  wrapUp: function(transport) {
    this.leaveEditMode();
    // Can't use triggerCallback due to backward compatibility: requires
    // binding + direct element
    this._boundComplete(transport, this.element);
  }
});

Object.extend(Ajax.InPlaceEditor.prototype, {
  dispose: Ajax.InPlaceEditor.prototype.destroy
});

Ajax.InPlaceCollectionEditor = Class.create(Ajax.InPlaceEditor, {
  initialize: function($super, element, url, options) {
    this._extraDefaultOptions = Ajax.InPlaceCollectionEditor.DefaultOptions;
    $super(element, url, options);
  },

  createEditField: function() {
    var list = document.createElement('select');
    list.name = this.options.paramName;
    list.size = 1;
    this._controls.editor = list;
    this._collection = this.options.collection || [];
    if (this.options.loadCollectionURL)
      this.loadCollection();
    else
      this.checkForExternalText();
    this._form.appendChild(this._controls.editor);
  },

  loadCollection: function() {
    this._form.addClassName(this.options.loadingClassName);
    this.showLoadingText(this.options.loadingCollectionText);
    var options = Object.extend({ method: 'get' }, this.options.ajaxOptions);
    Object.extend(options, {
      parameters: 'editorId=' + encodeURIComponent(this.element.id),
      onComplete: Prototype.emptyFunction,
      onSuccess: function(transport) {
        var js = transport.responseText.strip();
        if (!/^\[.*\]$/.test(js)) // TODO: improve sanity check
          throw('Server returned an invalid collection representation.');
        this._collection = eval(js);
        this.checkForExternalText();
      }.bind(this),
      onFailure: this.onFailure
    });
    new Ajax.Request(this.options.loadCollectionURL, options);
  },

  showLoadingText: function(text) {
    this._controls.editor.disabled = true;
    var tempOption = this._controls.editor.firstChild;
    if (!tempOption) {
      tempOption = document.createElement('option');
      tempOption.value = '';
      this._controls.editor.appendChild(tempOption);
      tempOption.selected = true;
    }
    tempOption.update((text || '').stripScripts().stripTags());
  },

  checkForExternalText: function() {
    this._text = this.getText();
    if (this.options.loadTextURL)
      this.loadExternalText();
    else
      this.buildOptionList();
  },

  loadExternalText: function() {
    this.showLoadingText(this.options.loadingText);
    var options = Object.extend({ method: 'get' }, this.options.ajaxOptions);
    Object.extend(options, {
      parameters: 'editorId=' + encodeURIComponent(this.element.id),
      onComplete: Prototype.emptyFunction,
      onSuccess: function(transport) {
        this._text = transport.responseText.strip();
        this.buildOptionList();
      }.bind(this),
      onFailure: this.onFailure
    });
    new Ajax.Request(this.options.loadTextURL, options);
  },

  buildOptionList: function() {
    this._form.removeClassName(this.options.loadingClassName);
    this._collection = this._collection.map(function(entry) {
      return 2 === entry.length ? entry : [entry, entry].flatten();
    });
    var marker = ('value' in this.options) ? this.options.value : this._text;
    var textFound = this._collection.any(function(entry) {
      return entry[0] == marker;
    }.bind(this));
    this._controls.editor.update('');
    var option;
    this._collection.each(function(entry, index) {
      option = document.createElement('option');
      option.value = entry[0];
      option.selected = textFound ? entry[0] == marker : 0 == index;
      option.appendChild(document.createTextNode(entry[1]));
      this._controls.editor.appendChild(option);
    }.bind(this));
    this._controls.editor.disabled = false;
    Field.scrollFreeActivate(this._controls.editor);
  }
});

//**** DEPRECATION LAYER FOR InPlace[Collection]Editor! ****
//**** This only  exists for a while,  in order to  let ****
//**** users adapt to  the new API.  Read up on the new ****
//**** API and convert your code to it ASAP!            ****

Ajax.InPlaceEditor.prototype.initialize.dealWithDeprecatedOptions = function(options) {
  if (!options) return;
  function fallback(name, expr) {
    if (name in options || expr === undefined) return;
    options[name] = expr;
  };
  fallback('cancelControl', (options.cancelLink ? 'link' : (options.cancelButton ? 'button' :
    options.cancelLink == options.cancelButton == false ? false : undefined)));
  fallback('okControl', (options.okLink ? 'link' : (options.okButton ? 'button' :
    options.okLink == options.okButton == false ? false : undefined)));
  fallback('highlightColor', options.highlightcolor);
  fallback('highlightEndColor', options.highlightendcolor);
};

Object.extend(Ajax.InPlaceEditor, {
  DefaultOptions: {
    ajaxOptions: { },
    autoRows: 3,                                // Use when multi-line w/ rows == 1
    cancelControl: 'link',                      // 'link'|'button'|false
    cancelText: 'cancel',
    clickToEditText: 'Click to edit',
    externalControl: null,                      // id|elt
    externalControlOnly: false,
    fieldPostCreation: 'activate',              // 'activate'|'focus'|false
    formClassName: 'inplaceeditor-form',
    formId: null,                               // id|elt
    highlightColor: '#ffff99',
    highlightEndColor: '#ffffff',
    hoverClassName: '',
    htmlResponse: true,
    loadingClassName: 'inplaceeditor-loading',
    loadingText: 'Loading...',
    okControl: 'button',                        // 'link'|'button'|false
    okText: 'ok',
    paramName: 'value',
    rows: 1,                                    // If 1 and multi-line, uses autoRows
    savingClassName: 'inplaceeditor-saving',
    savingText: 'Saving...',
    size: 0,
    stripLoadedTextTags: false,
    submitOnBlur: false,
    textAfterControls: '',
    textBeforeControls: '',
    textBetweenControls: ''
  },
  DefaultCallbacks: {
    callback: function(form) {
      return Form.serialize(form);
    },
    onComplete: function(transport, element) {
      // For backward compatibility, this one is bound to the IPE, and passes
      // the element directly.  It was too often customized, so we don't break it.
      new Effect.Highlight(element, {
        startcolor: this.options.highlightColor, keepBackgroundImage: true });
    },
    onEnterEditMode: null,
    onEnterHover: function(ipe) {
      ipe.element.style.backgroundColor = ipe.options.highlightColor;
      if (ipe._effect)
        ipe._effect.cancel();
    },
    onFailure: function(transport, ipe) {
      alert('Error communication with the server: ' + transport.responseText.stripTags());
    },
    onFormCustomization: null, // Takes the IPE and its generated form, after editor, before controls.
    onLeaveEditMode: null,
    onLeaveHover: function(ipe) {
      ipe._effect = new Effect.Highlight(ipe.element, {
        startcolor: ipe.options.highlightColor, endcolor: ipe.options.highlightEndColor,
        restorecolor: ipe._originalBackground, keepBackgroundImage: true
      });
    }
  },
  Listeners: {
    click: 'enterEditMode',
    keydown: 'checkForEscapeOrReturn',
    mouseover: 'enterHover',
    mouseout: 'leaveHover'
  }
});

Ajax.InPlaceCollectionEditor.DefaultOptions = {
  loadingCollectionText: 'Loading options...'
};

// Delayed observer, like Form.Element.Observer,
// but waits for delay after last key input
// Ideal for live-search fields

Form.Element.DelayedObserver = Class.create({
  initialize: function(element, delay, callback) {
    this.delay     = delay || 0.5;
    this.element   = $(element);
    this.callback  = callback;
    this.timer     = null;
    this.lastValue = $F(this.element);
    Event.observe(this.element,'keyup',this.delayedListener.bindAsEventListener(this));
  },
  delayedListener: function(event) {
    if(this.lastValue == $F(this.element)) return;
    if(this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(this.onTimerEvent.bind(this), this.delay * 1000);
    this.lastValue = $F(this.element);
  },
  onTimerEvent: function() {
    this.timer = null;
    this.callback(this.element, $F(this.element));
  }
});

/*
Copyright (c) 2008, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://developer.yahoo.net/yui/license.txt
version: 2.6.0
*/
if(typeof YAHOO=="undefined"||!YAHOO){var YAHOO={};}YAHOO.namespace=function(){var A=arguments,E=null,C,B,D;for(C=0;C<A.length;C=C+1){D=A[C].split(".");E=YAHOO;for(B=(D[0]=="YAHOO")?1:0;B<D.length;B=B+1){E[D[B]]=E[D[B]]||{};E=E[D[B]];}}return E;};YAHOO.log=function(D,A,C){var B=YAHOO.widget.Logger;if(B&&B.log){return B.log(D,A,C);}else{return false;}};YAHOO.register=function(A,E,D){var I=YAHOO.env.modules;if(!I[A]){I[A]={versions:[],builds:[]};}var B=I[A],H=D.version,G=D.build,F=YAHOO.env.listeners;B.name=A;B.version=H;B.build=G;B.versions.push(H);B.builds.push(G);B.mainClass=E;for(var C=0;C<F.length;C=C+1){F[C](B);}if(E){E.VERSION=H;E.BUILD=G;}else{YAHOO.log("mainClass is undefined for module "+A,"warn");}};YAHOO.env=YAHOO.env||{modules:[],listeners:[]};YAHOO.env.getVersion=function(A){return YAHOO.env.modules[A]||null;};YAHOO.env.ua=function(){var C={ie:0,opera:0,gecko:0,webkit:0,mobile:null,air:0};var B=navigator.userAgent,A;if((/KHTML/).test(B)){C.webkit=1;}A=B.match(/AppleWebKit\/([^\s]*)/);if(A&&A[1]){C.webkit=parseFloat(A[1]);if(/ Mobile\//.test(B)){C.mobile="Apple";}else{A=B.match(/NokiaN[^\/]*/);if(A){C.mobile=A[0];}}A=B.match(/AdobeAIR\/([^\s]*)/);if(A){C.air=A[0];}}if(!C.webkit){A=B.match(/Opera[\s\/]([^\s]*)/);if(A&&A[1]){C.opera=parseFloat(A[1]);A=B.match(/Opera Mini[^;]*/);if(A){C.mobile=A[0];}}else{A=B.match(/MSIE\s([^;]*)/);if(A&&A[1]){C.ie=parseFloat(A[1]);}else{A=B.match(/Gecko\/([^\s]*)/);if(A){C.gecko=1;A=B.match(/rv:([^\s\)]*)/);if(A&&A[1]){C.gecko=parseFloat(A[1]);}}}}}return C;}();(function(){YAHOO.namespace("util","widget","example");if("undefined"!==typeof YAHOO_config){var B=YAHOO_config.listener,A=YAHOO.env.listeners,D=true,C;if(B){for(C=0;C<A.length;C=C+1){if(A[C]==B){D=false;break;}}if(D){A.push(B);}}}})();YAHOO.lang=YAHOO.lang||{};(function(){var A=YAHOO.lang,C=["toString","valueOf"],B={isArray:function(D){if(D){return A.isNumber(D.length)&&A.isFunction(D.splice);}return false;},isBoolean:function(D){return typeof D==="boolean";},isFunction:function(D){return typeof D==="function";},isNull:function(D){return D===null;},isNumber:function(D){return typeof D==="number"&&isFinite(D);},isObject:function(D){return(D&&(typeof D==="object"||A.isFunction(D)))||false;},isString:function(D){return typeof D==="string";},isUndefined:function(D){return typeof D==="undefined";},_IEEnumFix:(YAHOO.env.ua.ie)?function(F,E){for(var D=0;D<C.length;D=D+1){var H=C[D],G=E[H];if(A.isFunction(G)&&G!=Object.prototype[H]){F[H]=G;}}}:function(){},extend:function(H,I,G){if(!I||!H){throw new Error("extend failed, please check that "+"all dependencies are included.");}var E=function(){};E.prototype=I.prototype;H.prototype=new E();H.prototype.constructor=H;H.superclass=I.prototype;if(I.prototype.constructor==Object.prototype.constructor){I.prototype.constructor=I;}if(G){for(var D in G){if(A.hasOwnProperty(G,D)){H.prototype[D]=G[D];}}A._IEEnumFix(H.prototype,G);}},augmentObject:function(H,G){if(!G||!H){throw new Error("Absorb failed, verify dependencies.");}var D=arguments,F,I,E=D[2];if(E&&E!==true){for(F=2;F<D.length;F=F+1){H[D[F]]=G[D[F]];}}else{for(I in G){if(E||!(I in H)){H[I]=G[I];}}A._IEEnumFix(H,G);}},augmentProto:function(G,F){if(!F||!G){throw new Error("Augment failed, verify dependencies.");}var D=[G.prototype,F.prototype];for(var E=2;E<arguments.length;E=E+1){D.push(arguments[E]);}A.augmentObject.apply(this,D);},dump:function(D,I){var F,H,K=[],L="{...}",E="f(){...}",J=", ",G=" => ";if(!A.isObject(D)){return D+"";}else{if(D instanceof Date||("nodeType" in D&&"tagName" in D)){return D;}else{if(A.isFunction(D)){return E;}}}I=(A.isNumber(I))?I:3;if(A.isArray(D)){K.push("[");for(F=0,H=D.length;F<H;F=F+1){if(A.isObject(D[F])){K.push((I>0)?A.dump(D[F],I-1):L);}else{K.push(D[F]);}K.push(J);}if(K.length>1){K.pop();}K.push("]");}else{K.push("{");for(F in D){if(A.hasOwnProperty(D,F)){K.push(F+G);if(A.isObject(D[F])){K.push((I>0)?A.dump(D[F],I-1):L);}else{K.push(D[F]);}K.push(J);}}if(K.length>1){K.pop();}K.push("}");}return K.join("");},substitute:function(S,E,L){var I,H,G,O,P,R,N=[],F,J="dump",M=" ",D="{",Q="}";for(;;){I=S.lastIndexOf(D);if(I<0){break;}H=S.indexOf(Q,I);if(I+1>=H){break;}F=S.substring(I+1,H);O=F;R=null;G=O.indexOf(M);if(G>-1){R=O.substring(G+1);O=O.substring(0,G);}P=E[O];if(L){P=L(O,P,R);}if(A.isObject(P)){if(A.isArray(P)){P=A.dump(P,parseInt(R,10));}else{R=R||"";var K=R.indexOf(J);if(K>-1){R=R.substring(4);}if(P.toString===Object.prototype.toString||K>-1){P=A.dump(P,parseInt(R,10));}else{P=P.toString();}}}else{if(!A.isString(P)&&!A.isNumber(P)){P="~-"+N.length+"-~";N[N.length]=F;}}S=S.substring(0,I)+P+S.substring(H+1);}for(I=N.length-1;I>=0;I=I-1){S=S.replace(new RegExp("~-"+I+"-~"),"{"+N[I]+"}","g");}return S;},trim:function(D){try{return D.replace(/^\s+|\s+$/g,"");}catch(E){return D;}},merge:function(){var G={},E=arguments;for(var F=0,D=E.length;F<D;F=F+1){A.augmentObject(G,E[F],true);}return G;},later:function(K,E,L,G,H){K=K||0;E=E||{};var F=L,J=G,I,D;if(A.isString(L)){F=E[L];}if(!F){throw new TypeError("method undefined");}if(!A.isArray(J)){J=[G];}I=function(){F.apply(E,J);};D=(H)?setInterval(I,K):setTimeout(I,K);return{interval:H,cancel:function(){if(this.interval){clearInterval(D);}else{clearTimeout(D);}}};},isValue:function(D){return(A.isObject(D)||A.isString(D)||A.isNumber(D)||A.isBoolean(D));}};A.hasOwnProperty=(Object.prototype.hasOwnProperty)?function(D,E){return D&&D.hasOwnProperty(E);}:function(D,E){return !A.isUndefined(D[E])&&D.constructor.prototype[E]!==D[E];};B.augmentObject(A,B,true);YAHOO.util.Lang=A;A.augment=A.augmentProto;YAHOO.augment=A.augmentProto;YAHOO.extend=A.extend;})();YAHOO.register("yahoo",YAHOO,{version:"2.6.0",build:"1321"});(function(){var B=YAHOO.util,F=YAHOO.lang,L,J,K={},G={},N=window.document;YAHOO.env._id_counter=YAHOO.env._id_counter||0;var C=YAHOO.env.ua.opera,M=YAHOO.env.ua.webkit,A=YAHOO.env.ua.gecko,H=YAHOO.env.ua.ie;var E={HYPHEN:/(-[a-z])/i,ROOT_TAG:/^body|html$/i,OP_SCROLL:/^(?:inline|table-row)$/i};var O=function(Q){if(!E.HYPHEN.test(Q)){return Q;}if(K[Q]){return K[Q];}var R=Q;while(E.HYPHEN.exec(R)){R=R.replace(RegExp.$1,RegExp.$1.substr(1).toUpperCase());}K[Q]=R;return R;};var P=function(R){var Q=G[R];if(!Q){Q=new RegExp("(?:^|\\s+)"+R+"(?:\\s+|$)");G[R]=Q;}return Q;};if(N.defaultView&&N.defaultView.getComputedStyle){L=function(Q,T){var S=null;if(T=="float"){T="cssFloat";}var R=Q.ownerDocument.defaultView.getComputedStyle(Q,"");if(R){S=R[O(T)];}return Q.style[T]||S;};}else{if(N.documentElement.currentStyle&&H){L=function(Q,S){switch(O(S)){case"opacity":var U=100;try{U=Q.filters["DXImageTransform.Microsoft.Alpha"].opacity;}catch(T){try{U=Q.filters("alpha").opacity;}catch(T){}}return U/100;case"float":S="styleFloat";default:var R=Q.currentStyle?Q.currentStyle[S]:null;return(Q.style[S]||R);}};}else{L=function(Q,R){return Q.style[R];};}}if(H){J=function(Q,R,S){switch(R){case"opacity":if(F.isString(Q.style.filter)){Q.style.filter="alpha(opacity="+S*100+")";if(!Q.currentStyle||!Q.currentStyle.hasLayout){Q.style.zoom=1;}}break;case"float":R="styleFloat";default:Q.style[R]=S;}};}else{J=function(Q,R,S){if(R=="float"){R="cssFloat";}Q.style[R]=S;};}var D=function(Q,R){return Q&&Q.nodeType==1&&(!R||R(Q));};YAHOO.util.Dom={get:function(S){if(S){if(S.nodeType||S.item){return S;}if(typeof S==="string"){return N.getElementById(S);}if("length" in S){var T=[];for(var R=0,Q=S.length;R<Q;++R){T[T.length]=B.Dom.get(S[R]);}return T;}return S;}return null;},getStyle:function(Q,S){S=O(S);var R=function(T){return L(T,S);};return B.Dom.batch(Q,R,B.Dom,true);},setStyle:function(Q,S,T){S=O(S);var R=function(U){J(U,S,T);};B.Dom.batch(Q,R,B.Dom,true);},getXY:function(Q){var R=function(S){if((S.parentNode===null||S.offsetParent===null||this.getStyle(S,"display")=="none")&&S!=S.ownerDocument.body){return false;}return I(S);};return B.Dom.batch(Q,R,B.Dom,true);},getX:function(Q){var R=function(S){return B.Dom.getXY(S)[0];};return B.Dom.batch(Q,R,B.Dom,true);},getY:function(Q){var R=function(S){return B.Dom.getXY(S)[1];};return B.Dom.batch(Q,R,B.Dom,true);},setXY:function(Q,T,S){var R=function(W){var V=this.getStyle(W,"position");if(V=="static"){this.setStyle(W,"position","relative");V="relative";}var Y=this.getXY(W);if(Y===false){return false;}var X=[parseInt(this.getStyle(W,"left"),10),parseInt(this.getStyle(W,"top"),10)];if(isNaN(X[0])){X[0]=(V=="relative")?0:W.offsetLeft;}if(isNaN(X[1])){X[1]=(V=="relative")?0:W.offsetTop;}if(T[0]!==null){W.style.left=T[0]-Y[0]+X[0]+"px";}if(T[1]!==null){W.style.top=T[1]-Y[1]+X[1]+"px";}if(!S){var U=this.getXY(W);if((T[0]!==null&&U[0]!=T[0])||(T[1]!==null&&U[1]!=T[1])){this.setXY(W,T,true);}}};B.Dom.batch(Q,R,B.Dom,true);},setX:function(R,Q){B.Dom.setXY(R,[Q,null]);},setY:function(Q,R){B.Dom.setXY(Q,[null,R]);},getRegion:function(Q){var R=function(S){if((S.parentNode===null||S.offsetParent===null||this.getStyle(S,"display")=="none")&&S!=S.ownerDocument.body){return false;}var T=B.Region.getRegion(S);return T;};return B.Dom.batch(Q,R,B.Dom,true);},getClientWidth:function(){return B.Dom.getViewportWidth();},getClientHeight:function(){return B.Dom.getViewportHeight();},getElementsByClassName:function(U,Y,V,W){U=F.trim(U);Y=Y||"*";V=(V)?B.Dom.get(V):null||N;if(!V){return[];}var R=[],Q=V.getElementsByTagName(Y),X=P(U);for(var S=0,T=Q.length;S<T;++S){if(X.test(Q[S].className)){R[R.length]=Q[S];if(W){W.call(Q[S],Q[S]);}}}return R;},hasClass:function(S,R){var Q=P(R);var T=function(U){return Q.test(U.className);};return B.Dom.batch(S,T,B.Dom,true);},addClass:function(R,Q){var S=function(T){if(this.hasClass(T,Q)){return false;}T.className=F.trim([T.className,Q].join(" "));return true;};return B.Dom.batch(R,S,B.Dom,true);},removeClass:function(S,R){var Q=P(R);var T=function(W){var V=false,X=W.className;if(R&&X&&this.hasClass(W,R)){W.className=X.replace(Q," ");if(this.hasClass(W,R)){this.removeClass(W,R);}W.className=F.trim(W.className);if(W.className===""){var U=(W.hasAttribute)?"class":"className";W.removeAttribute(U);}V=true;}return V;};return B.Dom.batch(S,T,B.Dom,true);},replaceClass:function(T,R,Q){if(!Q||R===Q){return false;}var S=P(R);var U=function(V){if(!this.hasClass(V,R)){this.addClass(V,Q);return true;}V.className=V.className.replace(S," "+Q+" ");if(this.hasClass(V,R)){this.removeClass(V,R);}V.className=F.trim(V.className);return true;};return B.Dom.batch(T,U,B.Dom,true);},generateId:function(Q,S){S=S||"yui-gen";var R=function(T){if(T&&T.id){return T.id;}var U=S+YAHOO.env._id_counter++;if(T){T.id=U;}return U;};return B.Dom.batch(Q,R,B.Dom,true)||R.apply(B.Dom,arguments);},isAncestor:function(R,S){R=B.Dom.get(R);S=B.Dom.get(S);var Q=false;if((R&&S)&&(R.nodeType&&S.nodeType)){if(R.contains&&R!==S){Q=R.contains(S);}else{if(R.compareDocumentPosition){Q=!!(R.compareDocumentPosition(S)&16);}}}else{}return Q;},inDocument:function(Q){return this.isAncestor(N.documentElement,Q);},getElementsBy:function(X,R,S,U){R=R||"*";S=(S)?B.Dom.get(S):null||N;if(!S){return[];}var T=[],W=S.getElementsByTagName(R);for(var V=0,Q=W.length;V<Q;++V){if(X(W[V])){T[T.length]=W[V];if(U){U(W[V]);}}}return T;},batch:function(U,X,W,S){U=(U&&(U.tagName||U.item))?U:B.Dom.get(U);if(!U||!X){return false;}var T=(S)?W:window;if(U.tagName||U.length===undefined){return X.call(T,U,W);}var V=[];for(var R=0,Q=U.length;R<Q;++R){V[V.length]=X.call(T,U[R],W);}return V;},getDocumentHeight:function(){var R=(N.compatMode!="CSS1Compat")?N.body.scrollHeight:N.documentElement.scrollHeight;var Q=Math.max(R,B.Dom.getViewportHeight());return Q;},getDocumentWidth:function(){var R=(N.compatMode!="CSS1Compat")?N.body.scrollWidth:N.documentElement.scrollWidth;var Q=Math.max(R,B.Dom.getViewportWidth());return Q;},getViewportHeight:function(){var Q=self.innerHeight;
var R=N.compatMode;if((R||H)&&!C){Q=(R=="CSS1Compat")?N.documentElement.clientHeight:N.body.clientHeight;}return Q;},getViewportWidth:function(){var Q=self.innerWidth;var R=N.compatMode;if(R||H){Q=(R=="CSS1Compat")?N.documentElement.clientWidth:N.body.clientWidth;}return Q;},getAncestorBy:function(Q,R){while((Q=Q.parentNode)){if(D(Q,R)){return Q;}}return null;},getAncestorByClassName:function(R,Q){R=B.Dom.get(R);if(!R){return null;}var S=function(T){return B.Dom.hasClass(T,Q);};return B.Dom.getAncestorBy(R,S);},getAncestorByTagName:function(R,Q){R=B.Dom.get(R);if(!R){return null;}var S=function(T){return T.tagName&&T.tagName.toUpperCase()==Q.toUpperCase();};return B.Dom.getAncestorBy(R,S);},getPreviousSiblingBy:function(Q,R){while(Q){Q=Q.previousSibling;if(D(Q,R)){return Q;}}return null;},getPreviousSibling:function(Q){Q=B.Dom.get(Q);if(!Q){return null;}return B.Dom.getPreviousSiblingBy(Q);},getNextSiblingBy:function(Q,R){while(Q){Q=Q.nextSibling;if(D(Q,R)){return Q;}}return null;},getNextSibling:function(Q){Q=B.Dom.get(Q);if(!Q){return null;}return B.Dom.getNextSiblingBy(Q);},getFirstChildBy:function(Q,S){var R=(D(Q.firstChild,S))?Q.firstChild:null;return R||B.Dom.getNextSiblingBy(Q.firstChild,S);},getFirstChild:function(Q,R){Q=B.Dom.get(Q);if(!Q){return null;}return B.Dom.getFirstChildBy(Q);},getLastChildBy:function(Q,S){if(!Q){return null;}var R=(D(Q.lastChild,S))?Q.lastChild:null;return R||B.Dom.getPreviousSiblingBy(Q.lastChild,S);},getLastChild:function(Q){Q=B.Dom.get(Q);return B.Dom.getLastChildBy(Q);},getChildrenBy:function(R,T){var S=B.Dom.getFirstChildBy(R,T);var Q=S?[S]:[];B.Dom.getNextSiblingBy(S,function(U){if(!T||T(U)){Q[Q.length]=U;}return false;});return Q;},getChildren:function(Q){Q=B.Dom.get(Q);if(!Q){}return B.Dom.getChildrenBy(Q);},getDocumentScrollLeft:function(Q){Q=Q||N;return Math.max(Q.documentElement.scrollLeft,Q.body.scrollLeft);},getDocumentScrollTop:function(Q){Q=Q||N;return Math.max(Q.documentElement.scrollTop,Q.body.scrollTop);},insertBefore:function(R,Q){R=B.Dom.get(R);Q=B.Dom.get(Q);if(!R||!Q||!Q.parentNode){return null;}return Q.parentNode.insertBefore(R,Q);},insertAfter:function(R,Q){R=B.Dom.get(R);Q=B.Dom.get(Q);if(!R||!Q||!Q.parentNode){return null;}if(Q.nextSibling){return Q.parentNode.insertBefore(R,Q.nextSibling);}else{return Q.parentNode.appendChild(R);}},getClientRegion:function(){var S=B.Dom.getDocumentScrollTop(),R=B.Dom.getDocumentScrollLeft(),T=B.Dom.getViewportWidth()+R,Q=B.Dom.getViewportHeight()+S;return new B.Region(S,T,Q,R);}};var I=function(){if(N.documentElement.getBoundingClientRect){return function(S){var T=S.getBoundingClientRect(),R=Math.round;var Q=S.ownerDocument;return[R(T.left+B.Dom.getDocumentScrollLeft(Q)),R(T.top+B.Dom.getDocumentScrollTop(Q))];};}else{return function(S){var T=[S.offsetLeft,S.offsetTop];var R=S.offsetParent;var Q=(M&&B.Dom.getStyle(S,"position")=="absolute"&&S.offsetParent==S.ownerDocument.body);if(R!=S){while(R){T[0]+=R.offsetLeft;T[1]+=R.offsetTop;if(!Q&&M&&B.Dom.getStyle(R,"position")=="absolute"){Q=true;}R=R.offsetParent;}}if(Q){T[0]-=S.ownerDocument.body.offsetLeft;T[1]-=S.ownerDocument.body.offsetTop;}R=S.parentNode;while(R.tagName&&!E.ROOT_TAG.test(R.tagName)){if(R.scrollTop||R.scrollLeft){T[0]-=R.scrollLeft;T[1]-=R.scrollTop;}R=R.parentNode;}return T;};}}();})();YAHOO.util.Region=function(C,D,A,B){this.top=C;this[1]=C;this.right=D;this.bottom=A;this.left=B;this[0]=B;};YAHOO.util.Region.prototype.contains=function(A){return(A.left>=this.left&&A.right<=this.right&&A.top>=this.top&&A.bottom<=this.bottom);};YAHOO.util.Region.prototype.getArea=function(){return((this.bottom-this.top)*(this.right-this.left));};YAHOO.util.Region.prototype.intersect=function(E){var C=Math.max(this.top,E.top);var D=Math.min(this.right,E.right);var A=Math.min(this.bottom,E.bottom);var B=Math.max(this.left,E.left);if(A>=C&&D>=B){return new YAHOO.util.Region(C,D,A,B);}else{return null;}};YAHOO.util.Region.prototype.union=function(E){var C=Math.min(this.top,E.top);var D=Math.max(this.right,E.right);var A=Math.max(this.bottom,E.bottom);var B=Math.min(this.left,E.left);return new YAHOO.util.Region(C,D,A,B);};YAHOO.util.Region.prototype.toString=function(){return("Region {"+"top: "+this.top+", right: "+this.right+", bottom: "+this.bottom+", left: "+this.left+"}");};YAHOO.util.Region.getRegion=function(D){var F=YAHOO.util.Dom.getXY(D);var C=F[1];var E=F[0]+D.offsetWidth;var A=F[1]+D.offsetHeight;var B=F[0];return new YAHOO.util.Region(C,E,A,B);};YAHOO.util.Point=function(A,B){if(YAHOO.lang.isArray(A)){B=A[1];A=A[0];}this.x=this.right=this.left=this[0]=A;this.y=this.top=this.bottom=this[1]=B;};YAHOO.util.Point.prototype=new YAHOO.util.Region();YAHOO.register("dom",YAHOO.util.Dom,{version:"2.6.0",build:"1321"});YAHOO.util.CustomEvent=function(D,B,C,A){this.type=D;this.scope=B||window;this.silent=C;this.signature=A||YAHOO.util.CustomEvent.LIST;this.subscribers=[];if(!this.silent){}var E="_YUICEOnSubscribe";if(D!==E){this.subscribeEvent=new YAHOO.util.CustomEvent(E,this,true);}this.lastError=null;};YAHOO.util.CustomEvent.LIST=0;YAHOO.util.CustomEvent.FLAT=1;YAHOO.util.CustomEvent.prototype={subscribe:function(B,C,A){if(!B){throw new Error("Invalid callback for subscriber to '"+this.type+"'");}if(this.subscribeEvent){this.subscribeEvent.fire(B,C,A);}this.subscribers.push(new YAHOO.util.Subscriber(B,C,A));},unsubscribe:function(D,F){if(!D){return this.unsubscribeAll();}var E=false;for(var B=0,A=this.subscribers.length;B<A;++B){var C=this.subscribers[B];if(C&&C.contains(D,F)){this._delete(B);E=true;}}return E;},fire:function(){this.lastError=null;var K=[],E=this.subscribers.length;if(!E&&this.silent){return true;}var I=[].slice.call(arguments,0),G=true,D,J=false;if(!this.silent){}var C=this.subscribers.slice(),A=YAHOO.util.Event.throwErrors;for(D=0;D<E;++D){var M=C[D];if(!M){J=true;}else{if(!this.silent){}var L=M.getScope(this.scope);if(this.signature==YAHOO.util.CustomEvent.FLAT){var B=null;if(I.length>0){B=I[0];}try{G=M.fn.call(L,B,M.obj);}catch(F){this.lastError=F;if(A){throw F;}}}else{try{G=M.fn.call(L,this.type,I,M.obj);}catch(H){this.lastError=H;if(A){throw H;}}}if(false===G){if(!this.silent){}break;}}}return(G!==false);},unsubscribeAll:function(){for(var A=this.subscribers.length-1;A>-1;A--){this._delete(A);}this.subscribers=[];return A;},_delete:function(A){var B=this.subscribers[A];if(B){delete B.fn;delete B.obj;}this.subscribers.splice(A,1);},toString:function(){return"CustomEvent: "+"'"+this.type+"', "+"scope: "+this.scope;}};YAHOO.util.Subscriber=function(B,C,A){this.fn=B;this.obj=YAHOO.lang.isUndefined(C)?null:C;this.override=A;};YAHOO.util.Subscriber.prototype.getScope=function(A){if(this.override){if(this.override===true){return this.obj;}else{return this.override;}}return A;};YAHOO.util.Subscriber.prototype.contains=function(A,B){if(B){return(this.fn==A&&this.obj==B);}else{return(this.fn==A);}};YAHOO.util.Subscriber.prototype.toString=function(){return"Subscriber { obj: "+this.obj+", override: "+(this.override||"no")+" }";};if(!YAHOO.util.Event){YAHOO.util.Event=function(){var H=false;var I=[];var J=[];var G=[];var E=[];var C=0;var F=[];var B=[];var A=0;var D={63232:38,63233:40,63234:37,63235:39,63276:33,63277:34,25:9};var K=YAHOO.env.ua.ie?"focusin":"focus";var L=YAHOO.env.ua.ie?"focusout":"blur";return{POLL_RETRYS:2000,POLL_INTERVAL:20,EL:0,TYPE:1,FN:2,WFN:3,UNLOAD_OBJ:3,ADJ_SCOPE:4,OBJ:5,OVERRIDE:6,CAPTURE:7,lastError:null,isSafari:YAHOO.env.ua.webkit,webkit:YAHOO.env.ua.webkit,isIE:YAHOO.env.ua.ie,_interval:null,_dri:null,DOMReady:false,throwErrors:false,startInterval:function(){if(!this._interval){var M=this;var N=function(){M._tryPreloadAttach();};this._interval=setInterval(N,this.POLL_INTERVAL);}},onAvailable:function(R,O,S,Q,P){var M=(YAHOO.lang.isString(R))?[R]:R;for(var N=0;N<M.length;N=N+1){F.push({id:M[N],fn:O,obj:S,override:Q,checkReady:P});}C=this.POLL_RETRYS;this.startInterval();},onContentReady:function(O,M,P,N){this.onAvailable(O,M,P,N,true);},onDOMReady:function(M,O,N){if(this.DOMReady){setTimeout(function(){var P=window;if(N){if(N===true){P=O;}else{P=N;}}M.call(P,"DOMReady",[],O);},0);}else{this.DOMReadyEvent.subscribe(M,O,N);}},_addListener:function(O,M,X,S,N,a){if(!X||!X.call){return false;}if(this._isValidCollection(O)){var Y=true;for(var T=0,V=O.length;T<V;++T){Y=this._addListener(O[T],M,X,S,N,a)&&Y;}return Y;}else{if(YAHOO.lang.isString(O)){var R=this.getEl(O);if(R){O=R;}else{this.onAvailable(O,function(){YAHOO.util.Event._addListener(O,M,X,S,N,a);});return true;}}}if(!O){return false;}if("unload"==M&&S!==this){J[J.length]=[O,M,X,S,N,a];return true;}var b=O;if(N){if(N===true){b=S;}else{b=N;}}var P=function(c){return X.call(b,YAHOO.util.Event.getEvent(c,O),S);};var Z=[O,M,X,P,b,S,N,a];var U=I.length;I[U]=Z;if(this.useLegacyEvent(O,M)){var Q=this.getLegacyIndex(O,M);if(Q==-1||O!=G[Q][0]){Q=G.length;B[O.id+M]=Q;G[Q]=[O,M,O["on"+M]];E[Q]=[];O["on"+M]=function(c){YAHOO.util.Event.fireLegacyEvent(YAHOO.util.Event.getEvent(c),Q);};}E[Q].push(Z);}else{try{this._simpleAdd(O,M,P,a);}catch(W){this.lastError=W;this._removeListener(O,M,X,a);return false;}}return true;},addListener:function(O,Q,N,P,M){return this._addListener(O,Q,N,P,M,false);},addFocusListener:function(O,N,P,M){return this._addListener(O,K,N,P,M,true);},removeFocusListener:function(N,M){return this._removeListener(N,K,M,true);},addBlurListener:function(O,N,P,M){return this._addListener(O,L,N,P,M,true);},removeBlurListener:function(N,M){return this._removeListener(N,L,M,true);},fireLegacyEvent:function(Q,O){var S=true,M,U,T,V,R;U=E[O].slice();for(var N=0,P=U.length;N<P;++N){T=U[N];if(T&&T[this.WFN]){V=T[this.ADJ_SCOPE];R=T[this.WFN].call(V,Q);S=(S&&R);}}M=G[O];if(M&&M[2]){M[2](Q);}return S;},getLegacyIndex:function(N,O){var M=this.generateId(N)+O;if(typeof B[M]=="undefined"){return -1;}else{return B[M];}},useLegacyEvent:function(M,N){return(this.webkit&&this.webkit<419&&("click"==N||"dblclick"==N));},_removeListener:function(N,M,V,Y){var Q,T,X;if(typeof N=="string"){N=this.getEl(N);}else{if(this._isValidCollection(N)){var W=true;for(Q=N.length-1;Q>-1;Q--){W=(this._removeListener(N[Q],M,V,Y)&&W);}return W;}}if(!V||!V.call){return this.purgeElement(N,false,M);}if("unload"==M){for(Q=J.length-1;Q>-1;Q--){X=J[Q];if(X&&X[0]==N&&X[1]==M&&X[2]==V){J.splice(Q,1);return true;}}return false;}var R=null;var S=arguments[4];if("undefined"===typeof S){S=this._getCacheIndex(N,M,V);}if(S>=0){R=I[S];}if(!N||!R){return false;}if(this.useLegacyEvent(N,M)){var P=this.getLegacyIndex(N,M);var O=E[P];if(O){for(Q=0,T=O.length;Q<T;++Q){X=O[Q];if(X&&X[this.EL]==N&&X[this.TYPE]==M&&X[this.FN]==V){O.splice(Q,1);break;}}}}else{try{this._simpleRemove(N,M,R[this.WFN],Y);}catch(U){this.lastError=U;return false;}}delete I[S][this.WFN];delete I[S][this.FN];
I.splice(S,1);return true;},removeListener:function(N,O,M){return this._removeListener(N,O,M,false);},getTarget:function(O,N){var M=O.target||O.srcElement;return this.resolveTextNode(M);},resolveTextNode:function(N){try{if(N&&3==N.nodeType){return N.parentNode;}}catch(M){}return N;},getPageX:function(N){var M=N.pageX;if(!M&&0!==M){M=N.clientX||0;if(this.isIE){M+=this._getScrollLeft();}}return M;},getPageY:function(M){var N=M.pageY;if(!N&&0!==N){N=M.clientY||0;if(this.isIE){N+=this._getScrollTop();}}return N;},getXY:function(M){return[this.getPageX(M),this.getPageY(M)];},getRelatedTarget:function(N){var M=N.relatedTarget;if(!M){if(N.type=="mouseout"){M=N.toElement;}else{if(N.type=="mouseover"){M=N.fromElement;}}}return this.resolveTextNode(M);},getTime:function(O){if(!O.time){var N=new Date().getTime();try{O.time=N;}catch(M){this.lastError=M;return N;}}return O.time;},stopEvent:function(M){this.stopPropagation(M);this.preventDefault(M);},stopPropagation:function(M){if(M.stopPropagation){M.stopPropagation();}else{M.cancelBubble=true;}},preventDefault:function(M){if(M.preventDefault){M.preventDefault();}else{M.returnValue=false;}},getEvent:function(O,M){var N=O||window.event;if(!N){var P=this.getEvent.caller;while(P){N=P.arguments[0];if(N&&Event==N.constructor){break;}P=P.caller;}}return N;},getCharCode:function(N){var M=N.keyCode||N.charCode||0;if(YAHOO.env.ua.webkit&&(M in D)){M=D[M];}return M;},_getCacheIndex:function(Q,R,P){for(var O=0,N=I.length;O<N;O=O+1){var M=I[O];if(M&&M[this.FN]==P&&M[this.EL]==Q&&M[this.TYPE]==R){return O;}}return -1;},generateId:function(M){var N=M.id;if(!N){N="yuievtautoid-"+A;++A;M.id=N;}return N;},_isValidCollection:function(N){try{return(N&&typeof N!=="string"&&N.length&&!N.tagName&&!N.alert&&typeof N[0]!=="undefined");}catch(M){return false;}},elCache:{},getEl:function(M){return(typeof M==="string")?document.getElementById(M):M;},clearCache:function(){},DOMReadyEvent:new YAHOO.util.CustomEvent("DOMReady",this),_load:function(N){if(!H){H=true;var M=YAHOO.util.Event;M._ready();M._tryPreloadAttach();}},_ready:function(N){var M=YAHOO.util.Event;if(!M.DOMReady){M.DOMReady=true;M.DOMReadyEvent.fire();M._simpleRemove(document,"DOMContentLoaded",M._ready);}},_tryPreloadAttach:function(){if(F.length===0){C=0;clearInterval(this._interval);this._interval=null;return ;}if(this.locked){return ;}if(this.isIE){if(!this.DOMReady){this.startInterval();return ;}}this.locked=true;var S=!H;if(!S){S=(C>0&&F.length>0);}var R=[];var T=function(V,W){var U=V;if(W.override){if(W.override===true){U=W.obj;}else{U=W.override;}}W.fn.call(U,W.obj);};var N,M,Q,P,O=[];for(N=0,M=F.length;N<M;N=N+1){Q=F[N];if(Q){P=this.getEl(Q.id);if(P){if(Q.checkReady){if(H||P.nextSibling||!S){O.push(Q);F[N]=null;}}else{T(P,Q);F[N]=null;}}else{R.push(Q);}}}for(N=0,M=O.length;N<M;N=N+1){Q=O[N];T(this.getEl(Q.id),Q);}C--;if(S){for(N=F.length-1;N>-1;N--){Q=F[N];if(!Q||!Q.id){F.splice(N,1);}}this.startInterval();}else{clearInterval(this._interval);this._interval=null;}this.locked=false;},purgeElement:function(Q,R,T){var O=(YAHOO.lang.isString(Q))?this.getEl(Q):Q;var S=this.getListeners(O,T),P,M;if(S){for(P=S.length-1;P>-1;P--){var N=S[P];this._removeListener(O,N.type,N.fn,N.capture);}}if(R&&O&&O.childNodes){for(P=0,M=O.childNodes.length;P<M;++P){this.purgeElement(O.childNodes[P],R,T);}}},getListeners:function(O,M){var R=[],N;if(!M){N=[I,J];}else{if(M==="unload"){N=[J];}else{N=[I];}}var T=(YAHOO.lang.isString(O))?this.getEl(O):O;for(var Q=0;Q<N.length;Q=Q+1){var V=N[Q];if(V){for(var S=0,U=V.length;S<U;++S){var P=V[S];if(P&&P[this.EL]===T&&(!M||M===P[this.TYPE])){R.push({type:P[this.TYPE],fn:P[this.FN],obj:P[this.OBJ],adjust:P[this.OVERRIDE],scope:P[this.ADJ_SCOPE],capture:P[this.CAPTURE],index:S});}}}}return(R.length)?R:null;},_unload:function(S){var M=YAHOO.util.Event,P,O,N,R,Q,T=J.slice();for(P=0,R=J.length;P<R;++P){N=T[P];if(N){var U=window;if(N[M.ADJ_SCOPE]){if(N[M.ADJ_SCOPE]===true){U=N[M.UNLOAD_OBJ];}else{U=N[M.ADJ_SCOPE];}}N[M.FN].call(U,M.getEvent(S,N[M.EL]),N[M.UNLOAD_OBJ]);T[P]=null;N=null;U=null;}}J=null;if(I){for(O=I.length-1;O>-1;O--){N=I[O];if(N){M._removeListener(N[M.EL],N[M.TYPE],N[M.FN],N[M.CAPTURE],O);}}N=null;}G=null;M._simpleRemove(window,"unload",M._unload);},_getScrollLeft:function(){return this._getScroll()[1];},_getScrollTop:function(){return this._getScroll()[0];},_getScroll:function(){var M=document.documentElement,N=document.body;if(M&&(M.scrollTop||M.scrollLeft)){return[M.scrollTop,M.scrollLeft];}else{if(N){return[N.scrollTop,N.scrollLeft];}else{return[0,0];}}},regCE:function(){},_simpleAdd:function(){if(window.addEventListener){return function(O,P,N,M){O.addEventListener(P,N,(M));};}else{if(window.attachEvent){return function(O,P,N,M){O.attachEvent("on"+P,N);};}else{return function(){};}}}(),_simpleRemove:function(){if(window.removeEventListener){return function(O,P,N,M){O.removeEventListener(P,N,(M));};}else{if(window.detachEvent){return function(N,O,M){N.detachEvent("on"+O,M);};}else{return function(){};}}}()};}();(function(){var EU=YAHOO.util.Event;EU.on=EU.addListener;EU.onFocus=EU.addFocusListener;EU.onBlur=EU.addBlurListener;
/* DOMReady: based on work by: Dean Edwards/John Resig/Matthias Miller */
if(EU.isIE){YAHOO.util.Event.onDOMReady(YAHOO.util.Event._tryPreloadAttach,YAHOO.util.Event,true);var n=document.createElement("p");EU._dri=setInterval(function(){try{n.doScroll("left");clearInterval(EU._dri);EU._dri=null;EU._ready();n=null;}catch(ex){}},EU.POLL_INTERVAL);}else{if(EU.webkit&&EU.webkit<525){EU._dri=setInterval(function(){var rs=document.readyState;if("loaded"==rs||"complete"==rs){clearInterval(EU._dri);EU._dri=null;EU._ready();}},EU.POLL_INTERVAL);}else{EU._simpleAdd(document,"DOMContentLoaded",EU._ready);}}EU._simpleAdd(window,"load",EU._load);EU._simpleAdd(window,"unload",EU._unload);EU._tryPreloadAttach();})();}YAHOO.util.EventProvider=function(){};YAHOO.util.EventProvider.prototype={__yui_events:null,__yui_subscribers:null,subscribe:function(A,C,F,E){this.__yui_events=this.__yui_events||{};
var D=this.__yui_events[A];if(D){D.subscribe(C,F,E);}else{this.__yui_subscribers=this.__yui_subscribers||{};var B=this.__yui_subscribers;if(!B[A]){B[A]=[];}B[A].push({fn:C,obj:F,override:E});}},unsubscribe:function(C,E,G){this.__yui_events=this.__yui_events||{};var A=this.__yui_events;if(C){var F=A[C];if(F){return F.unsubscribe(E,G);}}else{var B=true;for(var D in A){if(YAHOO.lang.hasOwnProperty(A,D)){B=B&&A[D].unsubscribe(E,G);}}return B;}return false;},unsubscribeAll:function(A){return this.unsubscribe(A);},createEvent:function(G,D){this.__yui_events=this.__yui_events||{};var A=D||{};var I=this.__yui_events;if(I[G]){}else{var H=A.scope||this;var E=(A.silent);var B=new YAHOO.util.CustomEvent(G,H,E,YAHOO.util.CustomEvent.FLAT);I[G]=B;if(A.onSubscribeCallback){B.subscribeEvent.subscribe(A.onSubscribeCallback);}this.__yui_subscribers=this.__yui_subscribers||{};var F=this.__yui_subscribers[G];if(F){for(var C=0;C<F.length;++C){B.subscribe(F[C].fn,F[C].obj,F[C].override);}}}return I[G];},fireEvent:function(E,D,A,C){this.__yui_events=this.__yui_events||{};var G=this.__yui_events[E];if(!G){return null;}var B=[];for(var F=1;F<arguments.length;++F){B.push(arguments[F]);}return G.fire.apply(G,B);},hasEvent:function(A){if(this.__yui_events){if(this.__yui_events[A]){return true;}}return false;}};YAHOO.util.KeyListener=function(A,F,B,C){if(!A){}else{if(!F){}else{if(!B){}}}if(!C){C=YAHOO.util.KeyListener.KEYDOWN;}var D=new YAHOO.util.CustomEvent("keyPressed");this.enabledEvent=new YAHOO.util.CustomEvent("enabled");this.disabledEvent=new YAHOO.util.CustomEvent("disabled");if(typeof A=="string"){A=document.getElementById(A);}if(typeof B=="function"){D.subscribe(B);}else{D.subscribe(B.fn,B.scope,B.correctScope);}function E(J,I){if(!F.shift){F.shift=false;}if(!F.alt){F.alt=false;}if(!F.ctrl){F.ctrl=false;}if(J.shiftKey==F.shift&&J.altKey==F.alt&&J.ctrlKey==F.ctrl){var G;if(F.keys instanceof Array){for(var H=0;H<F.keys.length;H++){G=F.keys[H];if(G==J.charCode){D.fire(J.charCode,J);break;}else{if(G==J.keyCode){D.fire(J.keyCode,J);break;}}}}else{G=F.keys;if(G==J.charCode){D.fire(J.charCode,J);}else{if(G==J.keyCode){D.fire(J.keyCode,J);}}}}}this.enable=function(){if(!this.enabled){YAHOO.util.Event.addListener(A,C,E);this.enabledEvent.fire(F);}this.enabled=true;};this.disable=function(){if(this.enabled){YAHOO.util.Event.removeListener(A,C,E);this.disabledEvent.fire(F);}this.enabled=false;};this.toString=function(){return"KeyListener ["+F.keys+"] "+A.tagName+(A.id?"["+A.id+"]":"");};};YAHOO.util.KeyListener.KEYDOWN="keydown";YAHOO.util.KeyListener.KEYUP="keyup";YAHOO.util.KeyListener.KEY={ALT:18,BACK_SPACE:8,CAPS_LOCK:20,CONTROL:17,DELETE:46,DOWN:40,END:35,ENTER:13,ESCAPE:27,HOME:36,LEFT:37,META:224,NUM_LOCK:144,PAGE_DOWN:34,PAGE_UP:33,PAUSE:19,PRINTSCREEN:44,RIGHT:39,SCROLL_LOCK:145,SHIFT:16,SPACE:32,TAB:9,UP:38};YAHOO.register("event",YAHOO.util.Event,{version:"2.6.0",build:"1321"});YAHOO.register("yahoo-dom-event", YAHOO, {version: "2.6.0", build: "1321"});


/*
Copyright (c) 2008, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://developer.yahoo.net/yui/license.txt
version: 2.6.0
*/
(function(){YAHOO.util.Config=function(D){if(D){this.init(D);}};var B=YAHOO.lang,C=YAHOO.util.CustomEvent,A=YAHOO.util.Config;A.CONFIG_CHANGED_EVENT="configChanged";A.BOOLEAN_TYPE="boolean";A.prototype={owner:null,queueInProgress:false,config:null,initialConfig:null,eventQueue:null,configChangedEvent:null,init:function(D){this.owner=D;this.configChangedEvent=this.createEvent(A.CONFIG_CHANGED_EVENT);this.configChangedEvent.signature=C.LIST;this.queueInProgress=false;this.config={};this.initialConfig={};this.eventQueue=[];},checkBoolean:function(D){return(typeof D==A.BOOLEAN_TYPE);},checkNumber:function(D){return(!isNaN(D));},fireEvent:function(D,F){var E=this.config[D];if(E&&E.event){E.event.fire(F);}},addProperty:function(E,D){E=E.toLowerCase();this.config[E]=D;D.event=this.createEvent(E,{scope:this.owner});D.event.signature=C.LIST;D.key=E;if(D.handler){D.event.subscribe(D.handler,this.owner);}this.setProperty(E,D.value,true);if(!D.suppressEvent){this.queueProperty(E,D.value);}},getConfig:function(){var D={},F=this.config,G,E;for(G in F){if(B.hasOwnProperty(F,G)){E=F[G];if(E&&E.event){D[G]=E.value;}}}return D;},getProperty:function(D){var E=this.config[D.toLowerCase()];if(E&&E.event){return E.value;}else{return undefined;}},resetProperty:function(D){D=D.toLowerCase();var E=this.config[D];if(E&&E.event){if(this.initialConfig[D]&&!B.isUndefined(this.initialConfig[D])){this.setProperty(D,this.initialConfig[D]);return true;}}else{return false;}},setProperty:function(E,G,D){var F;E=E.toLowerCase();if(this.queueInProgress&&!D){this.queueProperty(E,G);return true;}else{F=this.config[E];if(F&&F.event){if(F.validator&&!F.validator(G)){return false;}else{F.value=G;if(!D){this.fireEvent(E,G);this.configChangedEvent.fire([E,G]);}return true;}}else{return false;}}},queueProperty:function(S,P){S=S.toLowerCase();var R=this.config[S],K=false,J,G,H,I,O,Q,F,M,N,D,L,T,E;if(R&&R.event){if(!B.isUndefined(P)&&R.validator&&!R.validator(P)){return false;}else{if(!B.isUndefined(P)){R.value=P;}else{P=R.value;}K=false;J=this.eventQueue.length;for(L=0;L<J;L++){G=this.eventQueue[L];if(G){H=G[0];I=G[1];if(H==S){this.eventQueue[L]=null;this.eventQueue.push([S,(!B.isUndefined(P)?P:I)]);K=true;break;}}}if(!K&&!B.isUndefined(P)){this.eventQueue.push([S,P]);}}if(R.supercedes){O=R.supercedes.length;for(T=0;T<O;T++){Q=R.supercedes[T];F=this.eventQueue.length;for(E=0;E<F;E++){M=this.eventQueue[E];if(M){N=M[0];D=M[1];if(N==Q.toLowerCase()){this.eventQueue.push([N,D]);this.eventQueue[E]=null;break;}}}}}return true;}else{return false;}},refireEvent:function(D){D=D.toLowerCase();var E=this.config[D];if(E&&E.event&&!B.isUndefined(E.value)){if(this.queueInProgress){this.queueProperty(D);}else{this.fireEvent(D,E.value);}}},applyConfig:function(D,G){var F,E;if(G){E={};for(F in D){if(B.hasOwnProperty(D,F)){E[F.toLowerCase()]=D[F];}}this.initialConfig=E;}for(F in D){if(B.hasOwnProperty(D,F)){this.queueProperty(F,D[F]);}}},refresh:function(){var D;for(D in this.config){if(B.hasOwnProperty(this.config,D)){this.refireEvent(D);}}},fireQueue:function(){var E,H,D,G,F;this.queueInProgress=true;for(E=0;E<this.eventQueue.length;E++){H=this.eventQueue[E];if(H){D=H[0];G=H[1];F=this.config[D];F.value=G;this.eventQueue[E]=null;this.fireEvent(D,G);}}this.queueInProgress=false;this.eventQueue=[];},subscribeToConfigEvent:function(E,F,H,D){var G=this.config[E.toLowerCase()];if(G&&G.event){if(!A.alreadySubscribed(G.event,F,H)){G.event.subscribe(F,H,D);}return true;}else{return false;}},unsubscribeFromConfigEvent:function(D,E,G){var F=this.config[D.toLowerCase()];if(F&&F.event){return F.event.unsubscribe(E,G);}else{return false;}},toString:function(){var D="Config";if(this.owner){D+=" ["+this.owner.toString()+"]";}return D;},outputEventQueue:function(){var D="",G,E,F=this.eventQueue.length;for(E=0;E<F;E++){G=this.eventQueue[E];if(G){D+=G[0]+"="+G[1]+", ";}}return D;},destroy:function(){var E=this.config,D,F;for(D in E){if(B.hasOwnProperty(E,D)){F=E[D];F.event.unsubscribeAll();F.event=null;}}this.configChangedEvent.unsubscribeAll();this.configChangedEvent=null;this.owner=null;this.config=null;this.initialConfig=null;this.eventQueue=null;}};A.alreadySubscribed=function(E,H,I){var F=E.subscribers.length,D,G;if(F>0){G=F-1;do{D=E.subscribers[G];if(D&&D.obj==I&&D.fn==H){return true;}}while(G--);}return false;};YAHOO.lang.augmentProto(A,YAHOO.util.EventProvider);}());(function(){YAHOO.widget.Module=function(Q,P){if(Q){this.init(Q,P);}else{}};var F=YAHOO.util.Dom,D=YAHOO.util.Config,M=YAHOO.util.Event,L=YAHOO.util.CustomEvent,G=YAHOO.widget.Module,H,O,N,E,A={"BEFORE_INIT":"beforeInit","INIT":"init","APPEND":"append","BEFORE_RENDER":"beforeRender","RENDER":"render","CHANGE_HEADER":"changeHeader","CHANGE_BODY":"changeBody","CHANGE_FOOTER":"changeFooter","CHANGE_CONTENT":"changeContent","DESTORY":"destroy","BEFORE_SHOW":"beforeShow","SHOW":"show","BEFORE_HIDE":"beforeHide","HIDE":"hide"},I={"VISIBLE":{key:"visible",value:true,validator:YAHOO.lang.isBoolean},"EFFECT":{key:"effect",suppressEvent:true,supercedes:["visible"]},"MONITOR_RESIZE":{key:"monitorresize",value:true},"APPEND_TO_DOCUMENT_BODY":{key:"appendtodocumentbody",value:false}};G.IMG_ROOT=null;G.IMG_ROOT_SSL=null;G.CSS_MODULE="yui-module";G.CSS_HEADER="hd";G.CSS_BODY="bd";G.CSS_FOOTER="ft";G.RESIZE_MONITOR_SECURE_URL="javascript:false;";G.textResizeEvent=new L("textResize");function K(){if(!H){H=document.createElement("div");H.innerHTML=('<div class="'+G.CSS_HEADER+'"></div>'+'<div class="'+G.CSS_BODY+'"></div><div class="'+G.CSS_FOOTER+'"></div>');O=H.firstChild;N=O.nextSibling;E=N.nextSibling;}return H;}function J(){if(!O){K();}return(O.cloneNode(false));}function B(){if(!N){K();}return(N.cloneNode(false));}function C(){if(!E){K();}return(E.cloneNode(false));}G.prototype={constructor:G,element:null,header:null,body:null,footer:null,id:null,imageRoot:G.IMG_ROOT,initEvents:function(){var P=L.LIST;this.beforeInitEvent=this.createEvent(A.BEFORE_INIT);this.beforeInitEvent.signature=P;this.initEvent=this.createEvent(A.INIT);
this.initEvent.signature=P;this.appendEvent=this.createEvent(A.APPEND);this.appendEvent.signature=P;this.beforeRenderEvent=this.createEvent(A.BEFORE_RENDER);this.beforeRenderEvent.signature=P;this.renderEvent=this.createEvent(A.RENDER);this.renderEvent.signature=P;this.changeHeaderEvent=this.createEvent(A.CHANGE_HEADER);this.changeHeaderEvent.signature=P;this.changeBodyEvent=this.createEvent(A.CHANGE_BODY);this.changeBodyEvent.signature=P;this.changeFooterEvent=this.createEvent(A.CHANGE_FOOTER);this.changeFooterEvent.signature=P;this.changeContentEvent=this.createEvent(A.CHANGE_CONTENT);this.changeContentEvent.signature=P;this.destroyEvent=this.createEvent(A.DESTORY);this.destroyEvent.signature=P;this.beforeShowEvent=this.createEvent(A.BEFORE_SHOW);this.beforeShowEvent.signature=P;this.showEvent=this.createEvent(A.SHOW);this.showEvent.signature=P;this.beforeHideEvent=this.createEvent(A.BEFORE_HIDE);this.beforeHideEvent.signature=P;this.hideEvent=this.createEvent(A.HIDE);this.hideEvent.signature=P;},platform:function(){var P=navigator.userAgent.toLowerCase();if(P.indexOf("windows")!=-1||P.indexOf("win32")!=-1){return"windows";}else{if(P.indexOf("macintosh")!=-1){return"mac";}else{return false;}}}(),browser:function(){var P=navigator.userAgent.toLowerCase();if(P.indexOf("opera")!=-1){return"opera";}else{if(P.indexOf("msie 7")!=-1){return"ie7";}else{if(P.indexOf("msie")!=-1){return"ie";}else{if(P.indexOf("safari")!=-1){return"safari";}else{if(P.indexOf("gecko")!=-1){return"gecko";}else{return false;}}}}}}(),isSecure:function(){if(window.location.href.toLowerCase().indexOf("https")===0){return true;}else{return false;}}(),initDefaultConfig:function(){this.cfg.addProperty(I.VISIBLE.key,{handler:this.configVisible,value:I.VISIBLE.value,validator:I.VISIBLE.validator});this.cfg.addProperty(I.EFFECT.key,{suppressEvent:I.EFFECT.suppressEvent,supercedes:I.EFFECT.supercedes});this.cfg.addProperty(I.MONITOR_RESIZE.key,{handler:this.configMonitorResize,value:I.MONITOR_RESIZE.value});this.cfg.addProperty(I.APPEND_TO_DOCUMENT_BODY.key,{value:I.APPEND_TO_DOCUMENT_BODY.value});},init:function(U,T){var R,V;this.initEvents();this.beforeInitEvent.fire(G);this.cfg=new D(this);if(this.isSecure){this.imageRoot=G.IMG_ROOT_SSL;}if(typeof U=="string"){R=U;U=document.getElementById(U);if(!U){U=(K()).cloneNode(false);U.id=R;}}this.element=U;if(U.id){this.id=U.id;}V=this.element.firstChild;if(V){var Q=false,P=false,S=false;do{if(1==V.nodeType){if(!Q&&F.hasClass(V,G.CSS_HEADER)){this.header=V;Q=true;}else{if(!P&&F.hasClass(V,G.CSS_BODY)){this.body=V;P=true;}else{if(!S&&F.hasClass(V,G.CSS_FOOTER)){this.footer=V;S=true;}}}}}while((V=V.nextSibling));}this.initDefaultConfig();F.addClass(this.element,G.CSS_MODULE);if(T){this.cfg.applyConfig(T,true);}if(!D.alreadySubscribed(this.renderEvent,this.cfg.fireQueue,this.cfg)){this.renderEvent.subscribe(this.cfg.fireQueue,this.cfg,true);}this.initEvent.fire(G);},initResizeMonitor:function(){var Q=(YAHOO.env.ua.gecko&&this.platform=="windows");if(Q){var P=this;setTimeout(function(){P._initResizeMonitor();},0);}else{this._initResizeMonitor();}},_initResizeMonitor:function(){var P,R,T;function V(){G.textResizeEvent.fire();}if(!YAHOO.env.ua.opera){R=F.get("_yuiResizeMonitor");var U=this._supportsCWResize();if(!R){R=document.createElement("iframe");if(this.isSecure&&G.RESIZE_MONITOR_SECURE_URL&&YAHOO.env.ua.ie){R.src=G.RESIZE_MONITOR_SECURE_URL;}if(!U){T=["<html><head><script ",'type="text/javascript">',"window.onresize=function(){window.parent.","YAHOO.widget.Module.textResizeEvent.","fire();};<","/script></head>","<body></body></html>"].join("");R.src="data:text/html;charset=utf-8,"+encodeURIComponent(T);}R.id="_yuiResizeMonitor";R.title="Text Resize Monitor";R.style.position="absolute";R.style.visibility="hidden";var Q=document.body,S=Q.firstChild;if(S){Q.insertBefore(R,S);}else{Q.appendChild(R);}R.style.width="10em";R.style.height="10em";R.style.top=(-1*R.offsetHeight)+"px";R.style.left=(-1*R.offsetWidth)+"px";R.style.borderWidth="0";R.style.visibility="visible";if(YAHOO.env.ua.webkit){P=R.contentWindow.document;P.open();P.close();}}if(R&&R.contentWindow){G.textResizeEvent.subscribe(this.onDomResize,this,true);if(!G.textResizeInitialized){if(U){if(!M.on(R.contentWindow,"resize",V)){M.on(R,"resize",V);}}G.textResizeInitialized=true;}this.resizeMonitor=R;}}},_supportsCWResize:function(){var P=true;if(YAHOO.env.ua.gecko&&YAHOO.env.ua.gecko<=1.8){P=false;}return P;},onDomResize:function(S,R){var Q=-1*this.resizeMonitor.offsetWidth,P=-1*this.resizeMonitor.offsetHeight;this.resizeMonitor.style.top=P+"px";this.resizeMonitor.style.left=Q+"px";},setHeader:function(Q){var P=this.header||(this.header=J());if(Q.nodeName){P.innerHTML="";P.appendChild(Q);}else{P.innerHTML=Q;}this.changeHeaderEvent.fire(Q);this.changeContentEvent.fire();},appendToHeader:function(Q){var P=this.header||(this.header=J());P.appendChild(Q);this.changeHeaderEvent.fire(Q);this.changeContentEvent.fire();},setBody:function(Q){var P=this.body||(this.body=B());if(Q.nodeName){P.innerHTML="";P.appendChild(Q);}else{P.innerHTML=Q;}this.changeBodyEvent.fire(Q);this.changeContentEvent.fire();},appendToBody:function(Q){var P=this.body||(this.body=B());P.appendChild(Q);this.changeBodyEvent.fire(Q);this.changeContentEvent.fire();},setFooter:function(Q){var P=this.footer||(this.footer=C());if(Q.nodeName){P.innerHTML="";P.appendChild(Q);}else{P.innerHTML=Q;}this.changeFooterEvent.fire(Q);this.changeContentEvent.fire();},appendToFooter:function(Q){var P=this.footer||(this.footer=C());P.appendChild(Q);this.changeFooterEvent.fire(Q);this.changeContentEvent.fire();},render:function(R,P){var S=this,T;function Q(U){if(typeof U=="string"){U=document.getElementById(U);}if(U){S._addToParent(U,S.element);S.appendEvent.fire();}}this.beforeRenderEvent.fire();if(!P){P=this.element;}if(R){Q(R);}else{if(!F.inDocument(this.element)){return false;}}if(this.header&&!F.inDocument(this.header)){T=P.firstChild;if(T){P.insertBefore(this.header,T);}else{P.appendChild(this.header);
}}if(this.body&&!F.inDocument(this.body)){if(this.footer&&F.isAncestor(this.moduleElement,this.footer)){P.insertBefore(this.body,this.footer);}else{P.appendChild(this.body);}}if(this.footer&&!F.inDocument(this.footer)){P.appendChild(this.footer);}this.renderEvent.fire();return true;},destroy:function(){var P,Q;if(this.element){M.purgeElement(this.element,true);P=this.element.parentNode;}if(P){P.removeChild(this.element);}this.element=null;this.header=null;this.body=null;this.footer=null;G.textResizeEvent.unsubscribe(this.onDomResize,this);this.cfg.destroy();this.cfg=null;this.destroyEvent.fire();},show:function(){this.cfg.setProperty("visible",true);},hide:function(){this.cfg.setProperty("visible",false);},configVisible:function(Q,P,R){var S=P[0];if(S){this.beforeShowEvent.fire();F.setStyle(this.element,"display","block");this.showEvent.fire();}else{this.beforeHideEvent.fire();F.setStyle(this.element,"display","none");this.hideEvent.fire();}},configMonitorResize:function(R,Q,S){var P=Q[0];if(P){this.initResizeMonitor();}else{G.textResizeEvent.unsubscribe(this.onDomResize,this,true);this.resizeMonitor=null;}},_addToParent:function(P,Q){if(!this.cfg.getProperty("appendtodocumentbody")&&P===document.body&&P.firstChild){P.insertBefore(Q,P.firstChild);}else{P.appendChild(Q);}},toString:function(){return"Module "+this.id;}};YAHOO.lang.augmentProto(G,YAHOO.util.EventProvider);}());(function(){YAHOO.widget.Overlay=function(O,N){YAHOO.widget.Overlay.superclass.constructor.call(this,O,N);};var H=YAHOO.lang,L=YAHOO.util.CustomEvent,F=YAHOO.widget.Module,M=YAHOO.util.Event,E=YAHOO.util.Dom,C=YAHOO.util.Config,J=YAHOO.env.ua,B=YAHOO.widget.Overlay,G="subscribe",D="unsubscribe",I,A={"BEFORE_MOVE":"beforeMove","MOVE":"move"},K={"X":{key:"x",validator:H.isNumber,suppressEvent:true,supercedes:["iframe"]},"Y":{key:"y",validator:H.isNumber,suppressEvent:true,supercedes:["iframe"]},"XY":{key:"xy",suppressEvent:true,supercedes:["iframe"]},"CONTEXT":{key:"context",suppressEvent:true,supercedes:["iframe"]},"FIXED_CENTER":{key:"fixedcenter",value:false,validator:H.isBoolean,supercedes:["iframe","visible"]},"WIDTH":{key:"width",suppressEvent:true,supercedes:["context","fixedcenter","iframe"]},"HEIGHT":{key:"height",suppressEvent:true,supercedes:["context","fixedcenter","iframe"]},"AUTO_FILL_HEIGHT":{key:"autofillheight",supressEvent:true,supercedes:["height"],value:"body"},"ZINDEX":{key:"zindex",value:null},"CONSTRAIN_TO_VIEWPORT":{key:"constraintoviewport",value:false,validator:H.isBoolean,supercedes:["iframe","x","y","xy"]},"IFRAME":{key:"iframe",value:(J.ie==6?true:false),validator:H.isBoolean,supercedes:["zindex"]},"PREVENT_CONTEXT_OVERLAP":{key:"preventcontextoverlap",value:false,validator:H.isBoolean,supercedes:["constraintoviewport"]}};B.IFRAME_SRC="javascript:false;";B.IFRAME_OFFSET=3;B.VIEWPORT_OFFSET=10;B.TOP_LEFT="tl";B.TOP_RIGHT="tr";B.BOTTOM_LEFT="bl";B.BOTTOM_RIGHT="br";B.CSS_OVERLAY="yui-overlay";B.STD_MOD_RE=/^\s*?(body|footer|header)\s*?$/i;B.windowScrollEvent=new L("windowScroll");B.windowResizeEvent=new L("windowResize");B.windowScrollHandler=function(O){var N=M.getTarget(O);if(!N||N===window||N===window.document){if(J.ie){if(!window.scrollEnd){window.scrollEnd=-1;}clearTimeout(window.scrollEnd);window.scrollEnd=setTimeout(function(){B.windowScrollEvent.fire();},1);}else{B.windowScrollEvent.fire();}}};B.windowResizeHandler=function(N){if(J.ie){if(!window.resizeEnd){window.resizeEnd=-1;}clearTimeout(window.resizeEnd);window.resizeEnd=setTimeout(function(){B.windowResizeEvent.fire();},100);}else{B.windowResizeEvent.fire();}};B._initialized=null;if(B._initialized===null){M.on(window,"scroll",B.windowScrollHandler);M.on(window,"resize",B.windowResizeHandler);B._initialized=true;}B._TRIGGER_MAP={"windowScroll":B.windowScrollEvent,"windowResize":B.windowResizeEvent,"textResize":F.textResizeEvent};YAHOO.extend(B,F,{CONTEXT_TRIGGERS:[],init:function(O,N){B.superclass.init.call(this,O);this.beforeInitEvent.fire(B);E.addClass(this.element,B.CSS_OVERLAY);if(N){this.cfg.applyConfig(N,true);}if(this.platform=="mac"&&J.gecko){if(!C.alreadySubscribed(this.showEvent,this.showMacGeckoScrollbars,this)){this.showEvent.subscribe(this.showMacGeckoScrollbars,this,true);}if(!C.alreadySubscribed(this.hideEvent,this.hideMacGeckoScrollbars,this)){this.hideEvent.subscribe(this.hideMacGeckoScrollbars,this,true);}}this.initEvent.fire(B);},initEvents:function(){B.superclass.initEvents.call(this);var N=L.LIST;this.beforeMoveEvent=this.createEvent(A.BEFORE_MOVE);this.beforeMoveEvent.signature=N;this.moveEvent=this.createEvent(A.MOVE);this.moveEvent.signature=N;},initDefaultConfig:function(){B.superclass.initDefaultConfig.call(this);var N=this.cfg;N.addProperty(K.X.key,{handler:this.configX,validator:K.X.validator,suppressEvent:K.X.suppressEvent,supercedes:K.X.supercedes});N.addProperty(K.Y.key,{handler:this.configY,validator:K.Y.validator,suppressEvent:K.Y.suppressEvent,supercedes:K.Y.supercedes});N.addProperty(K.XY.key,{handler:this.configXY,suppressEvent:K.XY.suppressEvent,supercedes:K.XY.supercedes});N.addProperty(K.CONTEXT.key,{handler:this.configContext,suppressEvent:K.CONTEXT.suppressEvent,supercedes:K.CONTEXT.supercedes});N.addProperty(K.FIXED_CENTER.key,{handler:this.configFixedCenter,value:K.FIXED_CENTER.value,validator:K.FIXED_CENTER.validator,supercedes:K.FIXED_CENTER.supercedes});N.addProperty(K.WIDTH.key,{handler:this.configWidth,suppressEvent:K.WIDTH.suppressEvent,supercedes:K.WIDTH.supercedes});N.addProperty(K.HEIGHT.key,{handler:this.configHeight,suppressEvent:K.HEIGHT.suppressEvent,supercedes:K.HEIGHT.supercedes});N.addProperty(K.AUTO_FILL_HEIGHT.key,{handler:this.configAutoFillHeight,value:K.AUTO_FILL_HEIGHT.value,validator:this._validateAutoFill,suppressEvent:K.AUTO_FILL_HEIGHT.suppressEvent,supercedes:K.AUTO_FILL_HEIGHT.supercedes});N.addProperty(K.ZINDEX.key,{handler:this.configzIndex,value:K.ZINDEX.value});N.addProperty(K.CONSTRAIN_TO_VIEWPORT.key,{handler:this.configConstrainToViewport,value:K.CONSTRAIN_TO_VIEWPORT.value,validator:K.CONSTRAIN_TO_VIEWPORT.validator,supercedes:K.CONSTRAIN_TO_VIEWPORT.supercedes});
N.addProperty(K.IFRAME.key,{handler:this.configIframe,value:K.IFRAME.value,validator:K.IFRAME.validator,supercedes:K.IFRAME.supercedes});N.addProperty(K.PREVENT_CONTEXT_OVERLAP.key,{value:K.PREVENT_CONTEXT_OVERLAP.value,validator:K.PREVENT_CONTEXT_OVERLAP.validator,supercedes:K.PREVENT_CONTEXT_OVERLAP.supercedes});},moveTo:function(N,O){this.cfg.setProperty("xy",[N,O]);},hideMacGeckoScrollbars:function(){E.replaceClass(this.element,"show-scrollbars","hide-scrollbars");},showMacGeckoScrollbars:function(){E.replaceClass(this.element,"hide-scrollbars","show-scrollbars");},configVisible:function(Q,N,W){var P=N[0],R=E.getStyle(this.element,"visibility"),X=this.cfg.getProperty("effect"),U=[],T=(this.platform=="mac"&&J.gecko),f=C.alreadySubscribed,V,O,d,b,a,Z,c,Y,S;if(R=="inherit"){d=this.element.parentNode;while(d.nodeType!=9&&d.nodeType!=11){R=E.getStyle(d,"visibility");if(R!="inherit"){break;}d=d.parentNode;}if(R=="inherit"){R="visible";}}if(X){if(X instanceof Array){Y=X.length;for(b=0;b<Y;b++){V=X[b];U[U.length]=V.effect(this,V.duration);}}else{U[U.length]=X.effect(this,X.duration);}}if(P){if(T){this.showMacGeckoScrollbars();}if(X){if(P){if(R!="visible"||R===""){this.beforeShowEvent.fire();S=U.length;for(a=0;a<S;a++){O=U[a];if(a===0&&!f(O.animateInCompleteEvent,this.showEvent.fire,this.showEvent)){O.animateInCompleteEvent.subscribe(this.showEvent.fire,this.showEvent,true);}O.animateIn();}}}}else{if(R!="visible"||R===""){this.beforeShowEvent.fire();E.setStyle(this.element,"visibility","visible");this.cfg.refireEvent("iframe");this.showEvent.fire();}}}else{if(T){this.hideMacGeckoScrollbars();}if(X){if(R=="visible"){this.beforeHideEvent.fire();S=U.length;for(Z=0;Z<S;Z++){c=U[Z];if(Z===0&&!f(c.animateOutCompleteEvent,this.hideEvent.fire,this.hideEvent)){c.animateOutCompleteEvent.subscribe(this.hideEvent.fire,this.hideEvent,true);}c.animateOut();}}else{if(R===""){E.setStyle(this.element,"visibility","hidden");}}}else{if(R=="visible"||R===""){this.beforeHideEvent.fire();E.setStyle(this.element,"visibility","hidden");this.hideEvent.fire();}}}},doCenterOnDOMEvent:function(){if(this.cfg.getProperty("visible")){this.center();}},configFixedCenter:function(R,P,S){var T=P[0],O=C.alreadySubscribed,Q=B.windowResizeEvent,N=B.windowScrollEvent;if(T){this.center();if(!O(this.beforeShowEvent,this.center,this)){this.beforeShowEvent.subscribe(this.center);}if(!O(Q,this.doCenterOnDOMEvent,this)){Q.subscribe(this.doCenterOnDOMEvent,this,true);}if(!O(N,this.doCenterOnDOMEvent,this)){N.subscribe(this.doCenterOnDOMEvent,this,true);}}else{this.beforeShowEvent.unsubscribe(this.center);Q.unsubscribe(this.doCenterOnDOMEvent,this);N.unsubscribe(this.doCenterOnDOMEvent,this);}},configHeight:function(Q,O,R){var N=O[0],P=this.element;E.setStyle(P,"height",N);this.cfg.refireEvent("iframe");},configAutoFillHeight:function(Q,P,R){var O=P[0],N=this.cfg.getProperty("autofillheight");this.cfg.unsubscribeFromConfigEvent("height",this._autoFillOnHeightChange);F.textResizeEvent.unsubscribe("height",this._autoFillOnHeightChange);if(N&&O!==N&&this[N]){E.setStyle(this[N],"height","");}if(O){O=H.trim(O.toLowerCase());this.cfg.subscribeToConfigEvent("height",this._autoFillOnHeightChange,this[O],this);F.textResizeEvent.subscribe(this._autoFillOnHeightChange,this[O],this);this.cfg.setProperty("autofillheight",O,true);}},configWidth:function(Q,N,R){var P=N[0],O=this.element;E.setStyle(O,"width",P);this.cfg.refireEvent("iframe");},configzIndex:function(P,N,Q){var R=N[0],O=this.element;if(!R){R=E.getStyle(O,"zIndex");if(!R||isNaN(R)){R=0;}}if(this.iframe||this.cfg.getProperty("iframe")===true){if(R<=0){R=1;}}E.setStyle(O,"zIndex",R);this.cfg.setProperty("zIndex",R,true);if(this.iframe){this.stackIframe();}},configXY:function(P,O,Q){var S=O[0],N=S[0],R=S[1];this.cfg.setProperty("x",N);this.cfg.setProperty("y",R);this.beforeMoveEvent.fire([N,R]);N=this.cfg.getProperty("x");R=this.cfg.getProperty("y");this.cfg.refireEvent("iframe");this.moveEvent.fire([N,R]);},configX:function(P,O,Q){var N=O[0],R=this.cfg.getProperty("y");this.cfg.setProperty("x",N,true);this.cfg.setProperty("y",R,true);this.beforeMoveEvent.fire([N,R]);N=this.cfg.getProperty("x");R=this.cfg.getProperty("y");E.setX(this.element,N,true);this.cfg.setProperty("xy",[N,R],true);this.cfg.refireEvent("iframe");this.moveEvent.fire([N,R]);},configY:function(P,O,Q){var N=this.cfg.getProperty("x"),R=O[0];this.cfg.setProperty("x",N,true);this.cfg.setProperty("y",R,true);this.beforeMoveEvent.fire([N,R]);N=this.cfg.getProperty("x");R=this.cfg.getProperty("y");E.setY(this.element,R,true);this.cfg.setProperty("xy",[N,R],true);this.cfg.refireEvent("iframe");this.moveEvent.fire([N,R]);},showIframe:function(){var O=this.iframe,N;if(O){N=this.element.parentNode;if(N!=O.parentNode){this._addToParent(N,O);}O.style.display="block";}},hideIframe:function(){if(this.iframe){this.iframe.style.display="none";}},syncIframe:function(){var N=this.iframe,P=this.element,R=B.IFRAME_OFFSET,O=(R*2),Q;if(N){N.style.width=(P.offsetWidth+O+"px");N.style.height=(P.offsetHeight+O+"px");Q=this.cfg.getProperty("xy");if(!H.isArray(Q)||(isNaN(Q[0])||isNaN(Q[1]))){this.syncPosition();Q=this.cfg.getProperty("xy");}E.setXY(N,[(Q[0]-R),(Q[1]-R)]);}},stackIframe:function(){if(this.iframe){var N=E.getStyle(this.element,"zIndex");if(!YAHOO.lang.isUndefined(N)&&!isNaN(N)){E.setStyle(this.iframe,"zIndex",(N-1));}}},configIframe:function(Q,P,R){var N=P[0];function S(){var U=this.iframe,V=this.element,W;if(!U){if(!I){I=document.createElement("iframe");if(this.isSecure){I.src=B.IFRAME_SRC;}if(J.ie){I.style.filter="alpha(opacity=0)";I.frameBorder=0;}else{I.style.opacity="0";}I.style.position="absolute";I.style.border="none";I.style.margin="0";I.style.padding="0";I.style.display="none";}U=I.cloneNode(false);W=V.parentNode;var T=W||document.body;this._addToParent(T,U);this.iframe=U;}this.showIframe();this.syncIframe();this.stackIframe();if(!this._hasIframeEventListeners){this.showEvent.subscribe(this.showIframe);this.hideEvent.subscribe(this.hideIframe);
this.changeContentEvent.subscribe(this.syncIframe);this._hasIframeEventListeners=true;}}function O(){S.call(this);this.beforeShowEvent.unsubscribe(O);this._iframeDeferred=false;}if(N){if(this.cfg.getProperty("visible")){S.call(this);}else{if(!this._iframeDeferred){this.beforeShowEvent.subscribe(O);this._iframeDeferred=true;}}}else{this.hideIframe();if(this._hasIframeEventListeners){this.showEvent.unsubscribe(this.showIframe);this.hideEvent.unsubscribe(this.hideIframe);this.changeContentEvent.unsubscribe(this.syncIframe);this._hasIframeEventListeners=false;}}},_primeXYFromDOM:function(){if(YAHOO.lang.isUndefined(this.cfg.getProperty("xy"))){this.syncPosition();this.cfg.refireEvent("xy");this.beforeShowEvent.unsubscribe(this._primeXYFromDOM);}},configConstrainToViewport:function(O,N,P){var Q=N[0];if(Q){if(!C.alreadySubscribed(this.beforeMoveEvent,this.enforceConstraints,this)){this.beforeMoveEvent.subscribe(this.enforceConstraints,this,true);}if(!C.alreadySubscribed(this.beforeShowEvent,this._primeXYFromDOM)){this.beforeShowEvent.subscribe(this._primeXYFromDOM);}}else{this.beforeShowEvent.unsubscribe(this._primeXYFromDOM);this.beforeMoveEvent.unsubscribe(this.enforceConstraints,this);}},configContext:function(S,R,O){var V=R[0],P,N,T,Q,U=this.CONTEXT_TRIGGERS;if(V){P=V[0];N=V[1];T=V[2];Q=V[3];if(U&&U.length>0){Q=(Q||[]).concat(U);}if(P){if(typeof P=="string"){this.cfg.setProperty("context",[document.getElementById(P),N,T,Q],true);}if(N&&T){this.align(N,T);}if(this._contextTriggers){this._processTriggers(this._contextTriggers,D,this._alignOnTrigger);}if(Q){this._processTriggers(Q,G,this._alignOnTrigger);this._contextTriggers=Q;}}}},_alignOnTrigger:function(O,N){this.align();},_findTriggerCE:function(N){var O=null;if(N instanceof L){O=N;}else{if(B._TRIGGER_MAP[N]){O=B._TRIGGER_MAP[N];}}return O;},_processTriggers:function(R,T,Q){var P,S;for(var O=0,N=R.length;O<N;++O){P=R[O];S=this._findTriggerCE(P);if(S){S[T](Q,this,true);}else{this[T](P,Q);}}},align:function(O,N){var T=this.cfg.getProperty("context"),S=this,R,Q,U;function P(V,W){switch(O){case B.TOP_LEFT:S.moveTo(W,V);break;case B.TOP_RIGHT:S.moveTo((W-Q.offsetWidth),V);break;case B.BOTTOM_LEFT:S.moveTo(W,(V-Q.offsetHeight));break;case B.BOTTOM_RIGHT:S.moveTo((W-Q.offsetWidth),(V-Q.offsetHeight));break;}}if(T){R=T[0];Q=this.element;S=this;if(!O){O=T[1];}if(!N){N=T[2];}if(Q&&R){U=E.getRegion(R);switch(N){case B.TOP_LEFT:P(U.top,U.left);break;case B.TOP_RIGHT:P(U.top,U.right);break;case B.BOTTOM_LEFT:P(U.bottom,U.left);break;case B.BOTTOM_RIGHT:P(U.bottom,U.right);break;}}}},enforceConstraints:function(O,N,P){var R=N[0];var Q=this.getConstrainedXY(R[0],R[1]);this.cfg.setProperty("x",Q[0],true);this.cfg.setProperty("y",Q[1],true);this.cfg.setProperty("xy",Q,true);},getConstrainedX:function(U){var R=this,N=R.element,d=N.offsetWidth,b=B.VIEWPORT_OFFSET,g=E.getViewportWidth(),c=E.getDocumentScrollLeft(),X=(d+b<g),a=this.cfg.getProperty("context"),P,W,i,S=false,e,V,f,O,h=U,T={"tltr":true,"blbr":true,"brbl":true,"trtl":true};var Y=function(){var j;if((R.cfg.getProperty("x")-c)>W){j=(W-d);}else{j=(W+i);}R.cfg.setProperty("x",(j+c),true);return j;};var Q=function(){if((R.cfg.getProperty("x")-c)>W){return(V-b);}else{return(e-b);}};var Z=function(){var j=Q(),k;if(d>j){if(S){Y();}else{Y();S=true;k=Z();}}return k;};if(this.cfg.getProperty("preventcontextoverlap")&&a&&T[(a[1]+a[2])]){if(X){P=a[0];W=E.getX(P)-c;i=P.offsetWidth;e=W;V=(g-(W+i));Z();}h=this.cfg.getProperty("x");}else{if(X){f=c+b;O=c+g-d-b;if(U<f){h=f;}else{if(U>O){h=O;}}}else{h=b+c;}}return h;},getConstrainedY:function(Y){var V=this,O=V.element,h=O.offsetHeight,g=B.VIEWPORT_OFFSET,c=E.getViewportHeight(),f=E.getDocumentScrollTop(),d=(h+g<c),e=this.cfg.getProperty("context"),T,Z,a,W=false,U,P,b,R,N=Y,X={"trbr":true,"tlbl":true,"bltl":true,"brtr":true};var S=function(){var j;if((V.cfg.getProperty("y")-f)>Z){j=(Z-h);}else{j=(Z+a);}V.cfg.setProperty("y",(j+f),true);return j;};var Q=function(){if((V.cfg.getProperty("y")-f)>Z){return(P-g);}else{return(U-g);}};var i=function(){var k=Q(),j;if(h>k){if(W){S();}else{S();W=true;j=i();}}return j;};if(this.cfg.getProperty("preventcontextoverlap")&&e&&X[(e[1]+e[2])]){if(d){T=e[0];a=T.offsetHeight;Z=(E.getY(T)-f);U=Z;P=(c-(Z+a));i();}N=V.cfg.getProperty("y");}else{if(d){b=f+g;R=f+c-h-g;if(Y<b){N=b;}else{if(Y>R){N=R;}}}else{N=g+f;}}return N;},getConstrainedXY:function(N,O){return[this.getConstrainedX(N),this.getConstrainedY(O)];},center:function(){var Q=B.VIEWPORT_OFFSET,R=this.element.offsetWidth,P=this.element.offsetHeight,O=E.getViewportWidth(),S=E.getViewportHeight(),N,T;if(R<O){N=(O/2)-(R/2)+E.getDocumentScrollLeft();}else{N=Q+E.getDocumentScrollLeft();}if(P<S){T=(S/2)-(P/2)+E.getDocumentScrollTop();}else{T=Q+E.getDocumentScrollTop();}this.cfg.setProperty("xy",[parseInt(N,10),parseInt(T,10)]);this.cfg.refireEvent("iframe");},syncPosition:function(){var N=E.getXY(this.element);this.cfg.setProperty("x",N[0],true);this.cfg.setProperty("y",N[1],true);this.cfg.setProperty("xy",N,true);},onDomResize:function(P,O){var N=this;B.superclass.onDomResize.call(this,P,O);setTimeout(function(){N.syncPosition();N.cfg.refireEvent("iframe");N.cfg.refireEvent("context");},0);},_getComputedHeight:(function(){if(document.defaultView&&document.defaultView.getComputedStyle){return function(O){var N=null;if(O.ownerDocument&&O.ownerDocument.defaultView){var P=O.ownerDocument.defaultView.getComputedStyle(O,"");if(P){N=parseInt(P.height,10);}}return(H.isNumber(N))?N:null;};}else{return function(O){var N=null;if(O.style.pixelHeight){N=O.style.pixelHeight;}return(H.isNumber(N))?N:null;};}})(),_validateAutoFillHeight:function(N){return(!N)||(H.isString(N)&&B.STD_MOD_RE.test(N));},_autoFillOnHeightChange:function(P,N,O){this.fillHeight(O);},_getPreciseHeight:function(O){var N=O.offsetHeight;if(O.getBoundingClientRect){var P=O.getBoundingClientRect();N=P.bottom-P.top;}return N;},fillHeight:function(Q){if(Q){var O=this.innerElement||this.element,N=[this.header,this.body,this.footer],U,V=0,W=0,S=0,P=false;
for(var T=0,R=N.length;T<R;T++){U=N[T];if(U){if(Q!==U){W+=this._getPreciseHeight(U);}else{P=true;}}}if(P){if(J.ie||J.opera){E.setStyle(Q,"height",0+"px");}V=this._getComputedHeight(O);if(V===null){E.addClass(O,"yui-override-padding");V=O.clientHeight;E.removeClass(O,"yui-override-padding");}S=V-W;E.setStyle(Q,"height",S+"px");if(Q.offsetHeight!=S){S=S-(Q.offsetHeight-S);}E.setStyle(Q,"height",S+"px");}}},bringToTop:function(){var R=[],Q=this.element;function U(Y,X){var a=E.getStyle(Y,"zIndex"),Z=E.getStyle(X,"zIndex"),W=(!a||isNaN(a))?0:parseInt(a,10),V=(!Z||isNaN(Z))?0:parseInt(Z,10);if(W>V){return -1;}else{if(W<V){return 1;}else{return 0;}}}function P(X){var W=E.hasClass(X,B.CSS_OVERLAY),V=YAHOO.widget.Panel;if(W&&!E.isAncestor(Q,X)){if(V&&E.hasClass(X,V.CSS_PANEL)){R[R.length]=X.parentNode;}else{R[R.length]=X;}}}E.getElementsBy(P,"DIV",document.body);R.sort(U);var N=R[0],T;if(N){T=E.getStyle(N,"zIndex");if(!isNaN(T)){var S=false;if(N!=Q){S=true;}else{if(R.length>1){var O=E.getStyle(R[1],"zIndex");if(!isNaN(O)&&(T==O)){S=true;}}}if(S){this.cfg.setProperty("zindex",(parseInt(T,10)+2));}}}},destroy:function(){if(this.iframe){this.iframe.parentNode.removeChild(this.iframe);}this.iframe=null;B.windowResizeEvent.unsubscribe(this.doCenterOnDOMEvent,this);B.windowScrollEvent.unsubscribe(this.doCenterOnDOMEvent,this);F.textResizeEvent.unsubscribe(this._autoFillOnHeightChange);B.superclass.destroy.call(this);},toString:function(){return"Overlay "+this.id;}});}());(function(){YAHOO.widget.OverlayManager=function(G){this.init(G);};var D=YAHOO.widget.Overlay,C=YAHOO.util.Event,E=YAHOO.util.Dom,B=YAHOO.util.Config,F=YAHOO.util.CustomEvent,A=YAHOO.widget.OverlayManager;A.CSS_FOCUSED="focused";A.prototype={constructor:A,overlays:null,initDefaultConfig:function(){this.cfg.addProperty("overlays",{suppressEvent:true});this.cfg.addProperty("focusevent",{value:"mousedown"});},init:function(I){this.cfg=new B(this);this.initDefaultConfig();if(I){this.cfg.applyConfig(I,true);}this.cfg.fireQueue();var H=null;this.getActive=function(){return H;};this.focus=function(J){var K=this.find(J);if(K){K.focus();}};this.remove=function(K){var M=this.find(K),J;if(M){if(H==M){H=null;}var L=(M.element===null&&M.cfg===null)?true:false;if(!L){J=E.getStyle(M.element,"zIndex");M.cfg.setProperty("zIndex",-1000,true);}this.overlays.sort(this.compareZIndexDesc);this.overlays=this.overlays.slice(0,(this.overlays.length-1));M.hideEvent.unsubscribe(M.blur);M.destroyEvent.unsubscribe(this._onOverlayDestroy,M);M.focusEvent.unsubscribe(this._onOverlayFocusHandler,M);M.blurEvent.unsubscribe(this._onOverlayBlurHandler,M);if(!L){C.removeListener(M.element,this.cfg.getProperty("focusevent"),this._onOverlayElementFocus);M.cfg.setProperty("zIndex",J,true);M.cfg.setProperty("manager",null);}if(M.focusEvent._managed){M.focusEvent=null;}if(M.blurEvent._managed){M.blurEvent=null;}if(M.focus._managed){M.focus=null;}if(M.blur._managed){M.blur=null;}}};this.blurAll=function(){var K=this.overlays.length,J;if(K>0){J=K-1;do{this.overlays[J].blur();}while(J--);}};this._manageBlur=function(J){var K=false;if(H==J){E.removeClass(H.element,A.CSS_FOCUSED);H=null;K=true;}return K;};this._manageFocus=function(J){var K=false;if(H!=J){if(H){H.blur();}H=J;this.bringToTop(H);E.addClass(H.element,A.CSS_FOCUSED);K=true;}return K;};var G=this.cfg.getProperty("overlays");if(!this.overlays){this.overlays=[];}if(G){this.register(G);this.overlays.sort(this.compareZIndexDesc);}},_onOverlayElementFocus:function(I){var G=C.getTarget(I),H=this.close;if(H&&(G==H||E.isAncestor(H,G))){this.blur();}else{this.focus();}},_onOverlayDestroy:function(H,G,I){this.remove(I);},_onOverlayFocusHandler:function(H,G,I){this._manageFocus(I);},_onOverlayBlurHandler:function(H,G,I){this._manageBlur(I);},_bindFocus:function(G){var H=this;if(!G.focusEvent){G.focusEvent=G.createEvent("focus");G.focusEvent.signature=F.LIST;G.focusEvent._managed=true;}else{G.focusEvent.subscribe(H._onOverlayFocusHandler,G,H);}if(!G.focus){C.on(G.element,H.cfg.getProperty("focusevent"),H._onOverlayElementFocus,null,G);G.focus=function(){if(H._manageFocus(this)){if(this.cfg.getProperty("visible")&&this.focusFirst){this.focusFirst();}this.focusEvent.fire();}};G.focus._managed=true;}},_bindBlur:function(G){var H=this;if(!G.blurEvent){G.blurEvent=G.createEvent("blur");G.blurEvent.signature=F.LIST;G.focusEvent._managed=true;}else{G.blurEvent.subscribe(H._onOverlayBlurHandler,G,H);}if(!G.blur){G.blur=function(){if(H._manageBlur(this)){this.blurEvent.fire();}};G.blur._managed=true;}G.hideEvent.subscribe(G.blur);},_bindDestroy:function(G){var H=this;G.destroyEvent.subscribe(H._onOverlayDestroy,G,H);},_syncZIndex:function(G){var H=E.getStyle(G.element,"zIndex");if(!isNaN(H)){G.cfg.setProperty("zIndex",parseInt(H,10));}else{G.cfg.setProperty("zIndex",0);}},register:function(G){var K,J=false,H,I;if(G instanceof D){G.cfg.addProperty("manager",{value:this});this._bindFocus(G);this._bindBlur(G);this._bindDestroy(G);this._syncZIndex(G);this.overlays.push(G);this.bringToTop(G);J=true;}else{if(G instanceof Array){for(H=0,I=G.length;H<I;H++){J=this.register(G[H])||J;}}}return J;},bringToTop:function(M){var I=this.find(M),L,G,J;if(I){J=this.overlays;J.sort(this.compareZIndexDesc);G=J[0];if(G){L=E.getStyle(G.element,"zIndex");if(!isNaN(L)){var K=false;if(G!==I){K=true;}else{if(J.length>1){var H=E.getStyle(J[1].element,"zIndex");if(!isNaN(H)&&(L==H)){K=true;}}}if(K){I.cfg.setProperty("zindex",(parseInt(L,10)+2));}}J.sort(this.compareZIndexDesc);}}},find:function(G){var K=G instanceof D,I=this.overlays,M=I.length,J=null,L,H;if(K||typeof G=="string"){for(H=M-1;H>=0;H--){L=I[H];if((K&&(L===G))||(L.id==G)){J=L;break;}}}return J;},compareZIndexDesc:function(J,I){var H=(J.cfg)?J.cfg.getProperty("zIndex"):null,G=(I.cfg)?I.cfg.getProperty("zIndex"):null;if(H===null&&G===null){return 0;}else{if(H===null){return 1;}else{if(G===null){return -1;}else{if(H>G){return -1;}else{if(H<G){return 1;}else{return 0;}}}}}},showAll:function(){var H=this.overlays,I=H.length,G;
for(G=I-1;G>=0;G--){H[G].show();}},hideAll:function(){var H=this.overlays,I=H.length,G;for(G=I-1;G>=0;G--){H[G].hide();}},toString:function(){return"OverlayManager";}};}());(function(){YAHOO.widget.Tooltip=function(N,M){YAHOO.widget.Tooltip.superclass.constructor.call(this,N,M);};var E=YAHOO.lang,L=YAHOO.util.Event,K=YAHOO.util.CustomEvent,C=YAHOO.util.Dom,G=YAHOO.widget.Tooltip,F,H={"PREVENT_OVERLAP":{key:"preventoverlap",value:true,validator:E.isBoolean,supercedes:["x","y","xy"]},"SHOW_DELAY":{key:"showdelay",value:200,validator:E.isNumber},"AUTO_DISMISS_DELAY":{key:"autodismissdelay",value:5000,validator:E.isNumber},"HIDE_DELAY":{key:"hidedelay",value:250,validator:E.isNumber},"TEXT":{key:"text",suppressEvent:true},"CONTAINER":{key:"container"},"DISABLED":{key:"disabled",value:false,suppressEvent:true}},A={"CONTEXT_MOUSE_OVER":"contextMouseOver","CONTEXT_MOUSE_OUT":"contextMouseOut","CONTEXT_TRIGGER":"contextTrigger"};G.CSS_TOOLTIP="yui-tt";function I(N,M,O){var R=O[0],P=O[1],Q=this.cfg,S=Q.getProperty("width");if(S==P){Q.setProperty("width",R);}}function D(N,M){var O=document.body,S=this.cfg,R=S.getProperty("width"),P,Q;if((!R||R=="auto")&&(S.getProperty("container")!=O||S.getProperty("x")>=C.getViewportWidth()||S.getProperty("y")>=C.getViewportHeight())){Q=this.element.cloneNode(true);Q.style.visibility="hidden";Q.style.top="0px";Q.style.left="0px";O.appendChild(Q);P=(Q.offsetWidth+"px");O.removeChild(Q);Q=null;S.setProperty("width",P);S.refireEvent("xy");this.subscribe("hide",I,[(R||""),P]);}}function B(N,M,O){this.render(O);}function J(){L.onDOMReady(B,this.cfg.getProperty("container"),this);}YAHOO.extend(G,YAHOO.widget.Overlay,{init:function(N,M){G.superclass.init.call(this,N);this.beforeInitEvent.fire(G);C.addClass(this.element,G.CSS_TOOLTIP);if(M){this.cfg.applyConfig(M,true);}this.cfg.queueProperty("visible",false);this.cfg.queueProperty("constraintoviewport",true);this.setBody("");this.subscribe("beforeShow",D);this.subscribe("init",J);this.subscribe("render",this.onRender);this.initEvent.fire(G);},initEvents:function(){G.superclass.initEvents.call(this);var M=K.LIST;this.contextMouseOverEvent=this.createEvent(A.CONTEXT_MOUSE_OVER);this.contextMouseOverEvent.signature=M;this.contextMouseOutEvent=this.createEvent(A.CONTEXT_MOUSE_OUT);this.contextMouseOutEvent.signature=M;this.contextTriggerEvent=this.createEvent(A.CONTEXT_TRIGGER);this.contextTriggerEvent.signature=M;},initDefaultConfig:function(){G.superclass.initDefaultConfig.call(this);this.cfg.addProperty(H.PREVENT_OVERLAP.key,{value:H.PREVENT_OVERLAP.value,validator:H.PREVENT_OVERLAP.validator,supercedes:H.PREVENT_OVERLAP.supercedes});this.cfg.addProperty(H.SHOW_DELAY.key,{handler:this.configShowDelay,value:200,validator:H.SHOW_DELAY.validator});this.cfg.addProperty(H.AUTO_DISMISS_DELAY.key,{handler:this.configAutoDismissDelay,value:H.AUTO_DISMISS_DELAY.value,validator:H.AUTO_DISMISS_DELAY.validator});this.cfg.addProperty(H.HIDE_DELAY.key,{handler:this.configHideDelay,value:H.HIDE_DELAY.value,validator:H.HIDE_DELAY.validator});this.cfg.addProperty(H.TEXT.key,{handler:this.configText,suppressEvent:H.TEXT.suppressEvent});this.cfg.addProperty(H.CONTAINER.key,{handler:this.configContainer,value:document.body});this.cfg.addProperty(H.DISABLED.key,{handler:this.configContainer,value:H.DISABLED.value,supressEvent:H.DISABLED.suppressEvent});},configText:function(N,M,O){var P=M[0];if(P){this.setBody(P);}},configContainer:function(O,N,P){var M=N[0];if(typeof M=="string"){this.cfg.setProperty("container",document.getElementById(M),true);}},_removeEventListeners:function(){var P=this._context,M,O,N;if(P){M=P.length;if(M>0){N=M-1;do{O=P[N];L.removeListener(O,"mouseover",this.onContextMouseOver);L.removeListener(O,"mousemove",this.onContextMouseMove);L.removeListener(O,"mouseout",this.onContextMouseOut);}while(N--);}}},configContext:function(R,N,S){var Q=N[0],T,M,P,O;if(Q){if(!(Q instanceof Array)){if(typeof Q=="string"){this.cfg.setProperty("context",[document.getElementById(Q)],true);}else{this.cfg.setProperty("context",[Q],true);}Q=this.cfg.getProperty("context");}this._removeEventListeners();this._context=Q;T=this._context;if(T){M=T.length;if(M>0){O=M-1;do{P=T[O];L.on(P,"mouseover",this.onContextMouseOver,this);L.on(P,"mousemove",this.onContextMouseMove,this);L.on(P,"mouseout",this.onContextMouseOut,this);}while(O--);}}}},onContextMouseMove:function(N,M){M.pageX=L.getPageX(N);M.pageY=L.getPageY(N);},onContextMouseOver:function(O,N){var M=this;if(M.title){N._tempTitle=M.title;M.title="";}if(N.fireEvent("contextMouseOver",M,O)!==false&&!N.cfg.getProperty("disabled")){if(N.hideProcId){clearTimeout(N.hideProcId);N.hideProcId=null;}L.on(M,"mousemove",N.onContextMouseMove,N);N.showProcId=N.doShow(O,M);}},onContextMouseOut:function(O,N){var M=this;if(N._tempTitle){M.title=N._tempTitle;N._tempTitle=null;}if(N.showProcId){clearTimeout(N.showProcId);N.showProcId=null;}if(N.hideProcId){clearTimeout(N.hideProcId);N.hideProcId=null;}N.fireEvent("contextMouseOut",M,O);N.hideProcId=setTimeout(function(){N.hide();},N.cfg.getProperty("hidedelay"));},doShow:function(O,M){var P=25,N=this;if(YAHOO.env.ua.opera&&M.tagName&&M.tagName.toUpperCase()=="A"){P+=12;}return setTimeout(function(){var Q=N.cfg.getProperty("text");if(N._tempTitle&&(Q===""||YAHOO.lang.isUndefined(Q)||YAHOO.lang.isNull(Q))){N.setBody(N._tempTitle);}else{N.cfg.refireEvent("text");}N.moveTo(N.pageX,N.pageY+P);if(N.cfg.getProperty("preventoverlap")){N.preventOverlap(N.pageX,N.pageY);}L.removeListener(M,"mousemove",N.onContextMouseMove);N.contextTriggerEvent.fire(M);N.show();N.hideProcId=N.doHide();},this.cfg.getProperty("showdelay"));},doHide:function(){var M=this;return setTimeout(function(){M.hide();},this.cfg.getProperty("autodismissdelay"));},preventOverlap:function(Q,P){var M=this.element.offsetHeight,O=new YAHOO.util.Point(Q,P),N=C.getRegion(this.element);N.top-=5;N.left-=5;N.right+=5;N.bottom+=5;if(N.contains(O)){this.cfg.setProperty("y",(P-M-5));}},onRender:function(Q,P){function R(){var U=this.element,T=this._shadow;
if(T){T.style.width=(U.offsetWidth+6)+"px";T.style.height=(U.offsetHeight+1)+"px";}}function N(){C.addClass(this._shadow,"yui-tt-shadow-visible");}function M(){C.removeClass(this._shadow,"yui-tt-shadow-visible");}function S(){var V=this._shadow,U,T,X,W;if(!V){U=this.element;T=YAHOO.widget.Module;X=YAHOO.env.ua.ie;W=this;if(!F){F=document.createElement("div");F.className="yui-tt-shadow";}V=F.cloneNode(false);U.appendChild(V);this._shadow=V;N.call(this);this.subscribe("beforeShow",N);this.subscribe("beforeHide",M);if(X==6||(X==7&&document.compatMode=="BackCompat")){window.setTimeout(function(){R.call(W);},0);this.cfg.subscribeToConfigEvent("width",R);this.cfg.subscribeToConfigEvent("height",R);this.subscribe("changeContent",R);T.textResizeEvent.subscribe(R,this,true);this.subscribe("destroy",function(){T.textResizeEvent.unsubscribe(R,this);});}}}function O(){S.call(this);this.unsubscribe("beforeShow",O);}if(this.cfg.getProperty("visible")){S.call(this);}else{this.subscribe("beforeShow",O);}},destroy:function(){this._removeEventListeners();G.superclass.destroy.call(this);},toString:function(){return"Tooltip "+this.id;}});}());(function(){YAHOO.widget.Panel=function(V,U){YAHOO.widget.Panel.superclass.constructor.call(this,V,U);};var S=null;var E=YAHOO.lang,F=YAHOO.util,A=F.Dom,T=F.Event,M=F.CustomEvent,K=YAHOO.util.KeyListener,I=F.Config,H=YAHOO.widget.Overlay,O=YAHOO.widget.Panel,L=YAHOO.env.ua,P=(L.ie==6||(L.ie==7&&document.compatMode=="BackCompat")),G,Q,C,D={"SHOW_MASK":"showMask","HIDE_MASK":"hideMask","DRAG":"drag"},N={"CLOSE":{key:"close",value:true,validator:E.isBoolean,supercedes:["visible"]},"DRAGGABLE":{key:"draggable",value:(F.DD?true:false),validator:E.isBoolean,supercedes:["visible"]},"DRAG_ONLY":{key:"dragonly",value:false,validator:E.isBoolean,supercedes:["draggable"]},"UNDERLAY":{key:"underlay",value:"shadow",supercedes:["visible"]},"MODAL":{key:"modal",value:false,validator:E.isBoolean,supercedes:["visible","zindex"]},"KEY_LISTENERS":{key:"keylisteners",suppressEvent:true,supercedes:["visible"]},"STRINGS":{key:"strings",supercedes:["close"],validator:E.isObject,value:{close:"Close"}}};O.CSS_PANEL="yui-panel";O.CSS_PANEL_CONTAINER="yui-panel-container";O.FOCUSABLE=["a","button","select","textarea","input","iframe"];function J(V,U){if(!this.header&&this.cfg.getProperty("draggable")){this.setHeader("&#160;");}}function R(V,U,W){var Z=W[0],X=W[1],Y=this.cfg,a=Y.getProperty("width");if(a==X){Y.setProperty("width",Z);}this.unsubscribe("hide",R,W);}function B(V,U){var Z=YAHOO.env.ua.ie,Y,X,W;if(Z==6||(Z==7&&document.compatMode=="BackCompat")){Y=this.cfg;X=Y.getProperty("width");if(!X||X=="auto"){W=(this.element.offsetWidth+"px");Y.setProperty("width",W);this.subscribe("hide",R,[(X||""),W]);}}}YAHOO.extend(O,H,{init:function(V,U){O.superclass.init.call(this,V);this.beforeInitEvent.fire(O);A.addClass(this.element,O.CSS_PANEL);this.buildWrapper();if(U){this.cfg.applyConfig(U,true);}this.subscribe("showMask",this._addFocusHandlers);this.subscribe("hideMask",this._removeFocusHandlers);this.subscribe("beforeRender",J);this.subscribe("render",function(){this.setFirstLastFocusable();this.subscribe("changeContent",this.setFirstLastFocusable);});this.subscribe("show",this.focusFirst);this.initEvent.fire(O);},_onElementFocus:function(X){var W=T.getTarget(X);if(W!==this.element&&!A.isAncestor(this.element,W)&&S==this){try{if(this.firstElement){this.firstElement.focus();}else{if(this._modalFocus){this._modalFocus.focus();}else{this.innerElement.focus();}}}catch(V){try{if(W!==document&&W!==document.body&&W!==window){W.blur();}}catch(U){}}}},_addFocusHandlers:function(V,U){if(!this.firstElement){if(L.webkit||L.opera){if(!this._modalFocus){this._createHiddenFocusElement();}}else{this.innerElement.tabIndex=0;}}this.setTabLoop(this.firstElement,this.lastElement);T.onFocus(document.documentElement,this._onElementFocus,this,true);S=this;},_createHiddenFocusElement:function(){var U=document.createElement("button");U.style.height="1px";U.style.width="1px";U.style.position="absolute";U.style.left="-10000em";U.style.opacity=0;U.tabIndex="-1";this.innerElement.appendChild(U);this._modalFocus=U;},_removeFocusHandlers:function(V,U){T.removeFocusListener(document.documentElement,this._onElementFocus,this);if(S==this){S=null;}},focusFirst:function(W,U,Y){var V=this.firstElement;if(U&&U[1]){T.stopEvent(U[1]);}if(V){try{V.focus();}catch(X){}}},focusLast:function(W,U,Y){var V=this.lastElement;if(U&&U[1]){T.stopEvent(U[1]);}if(V){try{V.focus();}catch(X){}}},setTabLoop:function(X,Z){var V=this.preventBackTab,W=this.preventTabOut,U=this.showEvent,Y=this.hideEvent;if(V){V.disable();U.unsubscribe(V.enable,V);Y.unsubscribe(V.disable,V);V=this.preventBackTab=null;}if(W){W.disable();U.unsubscribe(W.enable,W);Y.unsubscribe(W.disable,W);W=this.preventTabOut=null;}if(X){this.preventBackTab=new K(X,{shift:true,keys:9},{fn:this.focusLast,scope:this,correctScope:true});V=this.preventBackTab;U.subscribe(V.enable,V,true);Y.subscribe(V.disable,V,true);}if(Z){this.preventTabOut=new K(Z,{shift:false,keys:9},{fn:this.focusFirst,scope:this,correctScope:true});W=this.preventTabOut;U.subscribe(W.enable,W,true);Y.subscribe(W.disable,W,true);}},getFocusableElements:function(U){U=U||this.innerElement;var X={};for(var W=0;W<O.FOCUSABLE.length;W++){X[O.FOCUSABLE[W]]=true;}function V(Y){if(Y.focus&&Y.type!=="hidden"&&!Y.disabled&&X[Y.tagName.toLowerCase()]){return true;}return false;}return A.getElementsBy(V,null,U);},setFirstLastFocusable:function(){this.firstElement=null;this.lastElement=null;var U=this.getFocusableElements();this.focusableElements=U;if(U.length>0){this.firstElement=U[0];this.lastElement=U[U.length-1];}if(this.cfg.getProperty("modal")){this.setTabLoop(this.firstElement,this.lastElement);}},initEvents:function(){O.superclass.initEvents.call(this);var U=M.LIST;this.showMaskEvent=this.createEvent(D.SHOW_MASK);this.showMaskEvent.signature=U;this.hideMaskEvent=this.createEvent(D.HIDE_MASK);this.hideMaskEvent.signature=U;this.dragEvent=this.createEvent(D.DRAG);
this.dragEvent.signature=U;},initDefaultConfig:function(){O.superclass.initDefaultConfig.call(this);this.cfg.addProperty(N.CLOSE.key,{handler:this.configClose,value:N.CLOSE.value,validator:N.CLOSE.validator,supercedes:N.CLOSE.supercedes});this.cfg.addProperty(N.DRAGGABLE.key,{handler:this.configDraggable,value:(F.DD)?true:false,validator:N.DRAGGABLE.validator,supercedes:N.DRAGGABLE.supercedes});this.cfg.addProperty(N.DRAG_ONLY.key,{value:N.DRAG_ONLY.value,validator:N.DRAG_ONLY.validator,supercedes:N.DRAG_ONLY.supercedes});this.cfg.addProperty(N.UNDERLAY.key,{handler:this.configUnderlay,value:N.UNDERLAY.value,supercedes:N.UNDERLAY.supercedes});this.cfg.addProperty(N.MODAL.key,{handler:this.configModal,value:N.MODAL.value,validator:N.MODAL.validator,supercedes:N.MODAL.supercedes});this.cfg.addProperty(N.KEY_LISTENERS.key,{handler:this.configKeyListeners,suppressEvent:N.KEY_LISTENERS.suppressEvent,supercedes:N.KEY_LISTENERS.supercedes});this.cfg.addProperty(N.STRINGS.key,{value:N.STRINGS.value,handler:this.configStrings,validator:N.STRINGS.validator,supercedes:N.STRINGS.supercedes});},configClose:function(X,V,Y){var Z=V[0],W=this.close,U=this.cfg.getProperty("strings");if(Z){if(!W){if(!C){C=document.createElement("a");C.className="container-close";C.href="#";}W=C.cloneNode(true);this.innerElement.appendChild(W);W.innerHTML=(U&&U.close)?U.close:"&#160;";T.on(W,"click",this._doClose,this,true);this.close=W;}else{W.style.display="block";}}else{if(W){W.style.display="none";}}},_doClose:function(U){T.preventDefault(U);this.hide();},configDraggable:function(V,U,W){var X=U[0];if(X){if(!F.DD){this.cfg.setProperty("draggable",false);return ;}if(this.header){A.setStyle(this.header,"cursor","move");this.registerDragDrop();}this.subscribe("beforeShow",B);}else{if(this.dd){this.dd.unreg();}if(this.header){A.setStyle(this.header,"cursor","auto");}this.unsubscribe("beforeShow",B);}},configUnderlay:function(d,c,Z){var b=(this.platform=="mac"&&L.gecko),e=c[0].toLowerCase(),V=this.underlay,W=this.element;function f(){var g=this.underlay;A.addClass(g,"yui-force-redraw");window.setTimeout(function(){A.removeClass(g,"yui-force-redraw");},0);}function X(){var g=false;if(!V){if(!Q){Q=document.createElement("div");Q.className="underlay";}V=Q.cloneNode(false);this.element.appendChild(V);this.underlay=V;if(P){this.sizeUnderlay();this.cfg.subscribeToConfigEvent("width",this.sizeUnderlay);this.cfg.subscribeToConfigEvent("height",this.sizeUnderlay);this.changeContentEvent.subscribe(this.sizeUnderlay);YAHOO.widget.Module.textResizeEvent.subscribe(this.sizeUnderlay,this,true);}if(L.webkit&&L.webkit<420){this.changeContentEvent.subscribe(f);}g=true;}}function a(){var g=X.call(this);if(!g&&P){this.sizeUnderlay();}this._underlayDeferred=false;this.beforeShowEvent.unsubscribe(a);}function Y(){if(this._underlayDeferred){this.beforeShowEvent.unsubscribe(a);this._underlayDeferred=false;}if(V){this.cfg.unsubscribeFromConfigEvent("width",this.sizeUnderlay);this.cfg.unsubscribeFromConfigEvent("height",this.sizeUnderlay);this.changeContentEvent.unsubscribe(this.sizeUnderlay);this.changeContentEvent.unsubscribe(f);YAHOO.widget.Module.textResizeEvent.unsubscribe(this.sizeUnderlay,this,true);this.element.removeChild(V);this.underlay=null;}}switch(e){case"shadow":A.removeClass(W,"matte");A.addClass(W,"shadow");break;case"matte":if(!b){Y.call(this);}A.removeClass(W,"shadow");A.addClass(W,"matte");break;default:if(!b){Y.call(this);}A.removeClass(W,"shadow");A.removeClass(W,"matte");break;}if((e=="shadow")||(b&&!V)){if(this.cfg.getProperty("visible")){var U=X.call(this);if(!U&&P){this.sizeUnderlay();}}else{if(!this._underlayDeferred){this.beforeShowEvent.subscribe(a);this._underlayDeferred=true;}}}},configModal:function(V,U,X){var W=U[0];if(W){if(!this._hasModalityEventListeners){this.subscribe("beforeShow",this.buildMask);this.subscribe("beforeShow",this.bringToTop);this.subscribe("beforeShow",this.showMask);this.subscribe("hide",this.hideMask);H.windowResizeEvent.subscribe(this.sizeMask,this,true);this._hasModalityEventListeners=true;}}else{if(this._hasModalityEventListeners){if(this.cfg.getProperty("visible")){this.hideMask();this.removeMask();}this.unsubscribe("beforeShow",this.buildMask);this.unsubscribe("beforeShow",this.bringToTop);this.unsubscribe("beforeShow",this.showMask);this.unsubscribe("hide",this.hideMask);H.windowResizeEvent.unsubscribe(this.sizeMask,this);this._hasModalityEventListeners=false;}}},removeMask:function(){var V=this.mask,U;if(V){this.hideMask();U=V.parentNode;if(U){U.removeChild(V);}this.mask=null;}},configKeyListeners:function(X,U,a){var W=U[0],Z,Y,V;if(W){if(W instanceof Array){Y=W.length;for(V=0;V<Y;V++){Z=W[V];if(!I.alreadySubscribed(this.showEvent,Z.enable,Z)){this.showEvent.subscribe(Z.enable,Z,true);}if(!I.alreadySubscribed(this.hideEvent,Z.disable,Z)){this.hideEvent.subscribe(Z.disable,Z,true);this.destroyEvent.subscribe(Z.disable,Z,true);}}}else{if(!I.alreadySubscribed(this.showEvent,W.enable,W)){this.showEvent.subscribe(W.enable,W,true);}if(!I.alreadySubscribed(this.hideEvent,W.disable,W)){this.hideEvent.subscribe(W.disable,W,true);this.destroyEvent.subscribe(W.disable,W,true);}}}},configStrings:function(V,U,W){var X=E.merge(N.STRINGS.value,U[0]);this.cfg.setProperty(N.STRINGS.key,X,true);},configHeight:function(X,V,Y){var U=V[0],W=this.innerElement;A.setStyle(W,"height",U);this.cfg.refireEvent("iframe");},_autoFillOnHeightChange:function(W,U,V){O.superclass._autoFillOnHeightChange.apply(this,arguments);if(P){this.sizeUnderlay();}},configWidth:function(X,U,Y){var W=U[0],V=this.innerElement;A.setStyle(V,"width",W);this.cfg.refireEvent("iframe");},configzIndex:function(V,U,X){O.superclass.configzIndex.call(this,V,U,X);if(this.mask||this.cfg.getProperty("modal")===true){var W=A.getStyle(this.element,"zIndex");if(!W||isNaN(W)){W=0;}if(W===0){this.cfg.setProperty("zIndex",1);}else{this.stackMask();}}},buildWrapper:function(){var W=this.element.parentNode,U=this.element,V=document.createElement("div");V.className=O.CSS_PANEL_CONTAINER;
V.id=U.id+"_c";if(W){W.insertBefore(V,U);}V.appendChild(U);this.element=V;this.innerElement=U;A.setStyle(this.innerElement,"visibility","inherit");},sizeUnderlay:function(){var V=this.underlay,U;if(V){U=this.element;V.style.width=U.offsetWidth+"px";V.style.height=U.offsetHeight+"px";}},registerDragDrop:function(){var V=this;if(this.header){if(!F.DD){return ;}var U=(this.cfg.getProperty("dragonly")===true);this.dd=new F.DD(this.element.id,this.id,{dragOnly:U});if(!this.header.id){this.header.id=this.id+"_h";}this.dd.startDrag=function(){var X,Z,W,c,b,a;if(YAHOO.env.ua.ie==6){A.addClass(V.element,"drag");}if(V.cfg.getProperty("constraintoviewport")){var Y=H.VIEWPORT_OFFSET;X=V.element.offsetHeight;Z=V.element.offsetWidth;W=A.getViewportWidth();c=A.getViewportHeight();b=A.getDocumentScrollLeft();a=A.getDocumentScrollTop();if(X+Y<c){this.minY=a+Y;this.maxY=a+c-X-Y;}else{this.minY=a+Y;this.maxY=a+Y;}if(Z+Y<W){this.minX=b+Y;this.maxX=b+W-Z-Y;}else{this.minX=b+Y;this.maxX=b+Y;}this.constrainX=true;this.constrainY=true;}else{this.constrainX=false;this.constrainY=false;}V.dragEvent.fire("startDrag",arguments);};this.dd.onDrag=function(){V.syncPosition();V.cfg.refireEvent("iframe");if(this.platform=="mac"&&YAHOO.env.ua.gecko){this.showMacGeckoScrollbars();}V.dragEvent.fire("onDrag",arguments);};this.dd.endDrag=function(){if(YAHOO.env.ua.ie==6){A.removeClass(V.element,"drag");}V.dragEvent.fire("endDrag",arguments);V.moveEvent.fire(V.cfg.getProperty("xy"));};this.dd.setHandleElId(this.header.id);this.dd.addInvalidHandleType("INPUT");this.dd.addInvalidHandleType("SELECT");this.dd.addInvalidHandleType("TEXTAREA");}},buildMask:function(){var U=this.mask;if(!U){if(!G){G=document.createElement("div");G.className="mask";G.innerHTML="&#160;";}U=G.cloneNode(true);U.id=this.id+"_mask";document.body.insertBefore(U,document.body.firstChild);this.mask=U;if(YAHOO.env.ua.gecko&&this.platform=="mac"){A.addClass(this.mask,"block-scrollbars");}this.stackMask();}},hideMask:function(){if(this.cfg.getProperty("modal")&&this.mask){this.mask.style.display="none";A.removeClass(document.body,"masked");this.hideMaskEvent.fire();}},showMask:function(){if(this.cfg.getProperty("modal")&&this.mask){A.addClass(document.body,"masked");this.sizeMask();this.mask.style.display="block";this.showMaskEvent.fire();}},sizeMask:function(){if(this.mask){var V=this.mask,W=A.getViewportWidth(),U=A.getViewportHeight();if(this.mask.offsetHeight>U){this.mask.style.height=U+"px";}if(this.mask.offsetWidth>W){this.mask.style.width=W+"px";}this.mask.style.height=A.getDocumentHeight()+"px";this.mask.style.width=A.getDocumentWidth()+"px";}},stackMask:function(){if(this.mask){var U=A.getStyle(this.element,"zIndex");if(!YAHOO.lang.isUndefined(U)&&!isNaN(U)){A.setStyle(this.mask,"zIndex",U-1);}}},render:function(U){return O.superclass.render.call(this,U,this.innerElement);},destroy:function(){H.windowResizeEvent.unsubscribe(this.sizeMask,this);this.removeMask();if(this.close){T.purgeElement(this.close);}O.superclass.destroy.call(this);},toString:function(){return"Panel "+this.id;}});}());(function(){YAHOO.widget.Dialog=function(J,I){YAHOO.widget.Dialog.superclass.constructor.call(this,J,I);};var B=YAHOO.util.Event,G=YAHOO.util.CustomEvent,E=YAHOO.util.Dom,A=YAHOO.widget.Dialog,F=YAHOO.lang,H={"BEFORE_SUBMIT":"beforeSubmit","SUBMIT":"submit","MANUAL_SUBMIT":"manualSubmit","ASYNC_SUBMIT":"asyncSubmit","FORM_SUBMIT":"formSubmit","CANCEL":"cancel"},C={"POST_METHOD":{key:"postmethod",value:"async"},"BUTTONS":{key:"buttons",value:"none",supercedes:["visible"]},"HIDEAFTERSUBMIT":{key:"hideaftersubmit",value:true}};A.CSS_DIALOG="yui-dialog";function D(){var L=this._aButtons,J,K,I;if(F.isArray(L)){J=L.length;if(J>0){I=J-1;do{K=L[I];if(YAHOO.widget.Button&&K instanceof YAHOO.widget.Button){K.destroy();}else{if(K.tagName.toUpperCase()=="BUTTON"){B.purgeElement(K);B.purgeElement(K,false);}}}while(I--);}}}YAHOO.extend(A,YAHOO.widget.Panel,{form:null,initDefaultConfig:function(){A.superclass.initDefaultConfig.call(this);this.callback={success:null,failure:null,argument:null};this.cfg.addProperty(C.POST_METHOD.key,{handler:this.configPostMethod,value:C.POST_METHOD.value,validator:function(I){if(I!="form"&&I!="async"&&I!="none"&&I!="manual"){return false;}else{return true;}}});this.cfg.addProperty(C.HIDEAFTERSUBMIT.key,{value:C.HIDEAFTERSUBMIT.value});this.cfg.addProperty(C.BUTTONS.key,{handler:this.configButtons,value:C.BUTTONS.value,supercedes:C.BUTTONS.supercedes});},initEvents:function(){A.superclass.initEvents.call(this);var I=G.LIST;this.beforeSubmitEvent=this.createEvent(H.BEFORE_SUBMIT);this.beforeSubmitEvent.signature=I;this.submitEvent=this.createEvent(H.SUBMIT);this.submitEvent.signature=I;this.manualSubmitEvent=this.createEvent(H.MANUAL_SUBMIT);this.manualSubmitEvent.signature=I;this.asyncSubmitEvent=this.createEvent(H.ASYNC_SUBMIT);this.asyncSubmitEvent.signature=I;this.formSubmitEvent=this.createEvent(H.FORM_SUBMIT);this.formSubmitEvent.signature=I;this.cancelEvent=this.createEvent(H.CANCEL);this.cancelEvent.signature=I;},init:function(J,I){A.superclass.init.call(this,J);this.beforeInitEvent.fire(A);E.addClass(this.element,A.CSS_DIALOG);this.cfg.setProperty("visible",false);if(I){this.cfg.applyConfig(I,true);}this.showEvent.subscribe(this.focusFirst,this,true);this.beforeHideEvent.subscribe(this.blurButtons,this,true);this.subscribe("changeBody",this.registerForm);this.initEvent.fire(A);},doSubmit:function(){var J=YAHOO.util.Connect,P=this.form,N=false,M=false,O,I,L,K;switch(this.cfg.getProperty("postmethod")){case"async":O=P.elements;I=O.length;if(I>0){L=I-1;do{if(O[L].type=="file"){N=true;break;}}while(L--);}if(N&&YAHOO.env.ua.ie&&this.isSecure){M=true;}K=this._getFormAttributes(P);J.setForm(P,N,M);J.asyncRequest(K.method,K.action,this.callback);this.asyncSubmitEvent.fire();break;case"form":P.submit();this.formSubmitEvent.fire();break;case"none":case"manual":this.manualSubmitEvent.fire();break;}},_getFormAttributes:function(K){var I={method:null,action:null};
if(K){if(K.getAttributeNode){var J=K.getAttributeNode("action");var L=K.getAttributeNode("method");if(J){I.action=J.value;}if(L){I.method=L.value;}}else{I.action=K.getAttribute("action");I.method=K.getAttribute("method");}}I.method=(F.isString(I.method)?I.method:"POST").toUpperCase();I.action=F.isString(I.action)?I.action:"";return I;},registerForm:function(){var I=this.element.getElementsByTagName("form")[0];if(this.form){if(this.form==I&&E.isAncestor(this.element,this.form)){return ;}else{B.purgeElement(this.form);this.form=null;}}if(!I){I=document.createElement("form");I.name="frm_"+this.id;this.body.appendChild(I);}if(I){this.form=I;B.on(I,"submit",this._submitHandler,this,true);}},_submitHandler:function(I){B.stopEvent(I);this.submit();this.form.blur();},setTabLoop:function(I,J){I=I||this.firstButton;J=this.lastButton||J;A.superclass.setTabLoop.call(this,I,J);},setFirstLastFocusable:function(){A.superclass.setFirstLastFocusable.call(this);var J,I,K,L=this.focusableElements;this.firstFormElement=null;this.lastFormElement=null;if(this.form&&L&&L.length>0){I=L.length;for(J=0;J<I;++J){K=L[J];if(this.form===K.form){this.firstFormElement=K;break;}}for(J=I-1;J>=0;--J){K=L[J];if(this.form===K.form){this.lastFormElement=K;break;}}}},configClose:function(J,I,K){A.superclass.configClose.apply(this,arguments);},_doClose:function(I){B.preventDefault(I);this.cancel();},configButtons:function(S,R,M){var N=YAHOO.widget.Button,U=R[0],K=this.innerElement,T,P,J,Q,O,I,L;D.call(this);this._aButtons=null;if(F.isArray(U)){O=document.createElement("span");O.className="button-group";Q=U.length;this._aButtons=[];this.defaultHtmlButton=null;for(L=0;L<Q;L++){T=U[L];if(N){J=new N({label:T.text});J.appendTo(O);P=J.get("element");if(T.isDefault){J.addClass("default");this.defaultHtmlButton=P;}if(F.isFunction(T.handler)){J.set("onclick",{fn:T.handler,obj:this,scope:this});}else{if(F.isObject(T.handler)&&F.isFunction(T.handler.fn)){J.set("onclick",{fn:T.handler.fn,obj:((!F.isUndefined(T.handler.obj))?T.handler.obj:this),scope:(T.handler.scope||this)});}}this._aButtons[this._aButtons.length]=J;}else{P=document.createElement("button");P.setAttribute("type","button");if(T.isDefault){P.className="default";this.defaultHtmlButton=P;}P.innerHTML=T.text;if(F.isFunction(T.handler)){B.on(P,"click",T.handler,this,true);}else{if(F.isObject(T.handler)&&F.isFunction(T.handler.fn)){B.on(P,"click",T.handler.fn,((!F.isUndefined(T.handler.obj))?T.handler.obj:this),(T.handler.scope||this));}}O.appendChild(P);this._aButtons[this._aButtons.length]=P;}T.htmlButton=P;if(L===0){this.firstButton=P;}if(L==(Q-1)){this.lastButton=P;}}this.setFooter(O);I=this.footer;if(E.inDocument(this.element)&&!E.isAncestor(K,I)){K.appendChild(I);}this.buttonSpan=O;}else{O=this.buttonSpan;I=this.footer;if(O&&I){I.removeChild(O);this.buttonSpan=null;this.firstButton=null;this.lastButton=null;this.defaultHtmlButton=null;}}this.setFirstLastFocusable();this.cfg.refireEvent("iframe");this.cfg.refireEvent("underlay");},getButtons:function(){return this._aButtons||null;},focusFirst:function(K,I,M){var J=this.firstFormElement;if(I&&I[1]){B.stopEvent(I[1]);}if(J){try{J.focus();}catch(L){}}else{this.focusFirstButton();}},focusLast:function(K,I,M){var N=this.cfg.getProperty("buttons"),J=this.lastFormElement;if(I&&I[1]){B.stopEvent(I[1]);}if(N&&F.isArray(N)){this.focusLastButton();}else{if(J){try{J.focus();}catch(L){}}}},_getButton:function(J){var I=YAHOO.widget.Button;if(I&&J&&J.nodeName&&J.id){J=I.getButton(J.id)||J;}return J;},focusDefaultButton:function(){var I=this._getButton(this.defaultHtmlButton);if(I){try{I.focus();}catch(J){}}},blurButtons:function(){var N=this.cfg.getProperty("buttons"),K,M,J,I;if(N&&F.isArray(N)){K=N.length;if(K>0){I=(K-1);do{M=N[I];if(M){J=this._getButton(M.htmlButton);if(J){try{J.blur();}catch(L){}}}}while(I--);}}},focusFirstButton:function(){var L=this.cfg.getProperty("buttons"),K,I;if(L&&F.isArray(L)){K=L[0];if(K){I=this._getButton(K.htmlButton);if(I){try{I.focus();}catch(J){}}}}},focusLastButton:function(){var M=this.cfg.getProperty("buttons"),J,L,I;if(M&&F.isArray(M)){J=M.length;if(J>0){L=M[(J-1)];if(L){I=this._getButton(L.htmlButton);if(I){try{I.focus();}catch(K){}}}}}},configPostMethod:function(J,I,K){this.registerForm();},validate:function(){return true;},submit:function(){if(this.validate()){this.beforeSubmitEvent.fire();this.doSubmit();this.submitEvent.fire();if(this.cfg.getProperty("hideaftersubmit")){this.hide();}return true;}else{return false;}},cancel:function(){this.cancelEvent.fire();this.hide();},getData:function(){var Y=this.form,K,R,U,M,S,P,O,J,V,L,W,Z,I,N,a,X,T;function Q(c){var b=c.tagName.toUpperCase();return((b=="INPUT"||b=="TEXTAREA"||b=="SELECT")&&c.name==M);}if(Y){K=Y.elements;R=K.length;U={};for(X=0;X<R;X++){M=K[X].name;S=E.getElementsBy(Q,"*",Y);P=S.length;if(P>0){if(P==1){S=S[0];O=S.type;J=S.tagName.toUpperCase();switch(J){case"INPUT":if(O=="checkbox"){U[M]=S.checked;}else{if(O!="radio"){U[M]=S.value;}}break;case"TEXTAREA":U[M]=S.value;break;case"SELECT":V=S.options;L=V.length;W=[];for(T=0;T<L;T++){Z=V[T];if(Z.selected){I=Z.value;if(!I||I===""){I=Z.text;}W[W.length]=I;}}U[M]=W;break;}}else{O=S[0].type;switch(O){case"radio":for(T=0;T<P;T++){N=S[T];if(N.checked){U[M]=N.value;break;}}break;case"checkbox":W=[];for(T=0;T<P;T++){a=S[T];if(a.checked){W[W.length]=a.value;}}U[M]=W;break;}}}}}return U;},destroy:function(){D.call(this);this._aButtons=null;var I=this.element.getElementsByTagName("form"),J;if(I.length>0){J=I[0];if(J){B.purgeElement(J);if(J.parentNode){J.parentNode.removeChild(J);}this.form=null;}}A.superclass.destroy.call(this);},toString:function(){return"Dialog "+this.id;}});}());(function(){YAHOO.widget.SimpleDialog=function(E,D){YAHOO.widget.SimpleDialog.superclass.constructor.call(this,E,D);};var C=YAHOO.util.Dom,B=YAHOO.widget.SimpleDialog,A={"ICON":{key:"icon",value:"none",suppressEvent:true},"TEXT":{key:"text",value:"",suppressEvent:true,supercedes:["icon"]}};B.ICON_BLOCK="blckicon";B.ICON_ALARM="alrticon";
B.ICON_HELP="hlpicon";B.ICON_INFO="infoicon";B.ICON_WARN="warnicon";B.ICON_TIP="tipicon";B.ICON_CSS_CLASSNAME="yui-icon";B.CSS_SIMPLEDIALOG="yui-simple-dialog";YAHOO.extend(B,YAHOO.widget.Dialog,{initDefaultConfig:function(){B.superclass.initDefaultConfig.call(this);this.cfg.addProperty(A.ICON.key,{handler:this.configIcon,value:A.ICON.value,suppressEvent:A.ICON.suppressEvent});this.cfg.addProperty(A.TEXT.key,{handler:this.configText,value:A.TEXT.value,suppressEvent:A.TEXT.suppressEvent,supercedes:A.TEXT.supercedes});},init:function(E,D){B.superclass.init.call(this,E);this.beforeInitEvent.fire(B);C.addClass(this.element,B.CSS_SIMPLEDIALOG);this.cfg.queueProperty("postmethod","manual");if(D){this.cfg.applyConfig(D,true);}this.beforeRenderEvent.subscribe(function(){if(!this.body){this.setBody("");}},this,true);this.initEvent.fire(B);},registerForm:function(){B.superclass.registerForm.call(this);this.form.innerHTML+='<input type="hidden" name="'+this.id+'" value=""/>';},configIcon:function(F,E,J){var K=E[0],D=this.body,I=B.ICON_CSS_CLASSNAME,H,G;if(K&&K!="none"){H=C.getElementsByClassName(I,"*",D);if(H){G=H.parentNode;if(G){G.removeChild(H);H=null;}}if(K.indexOf(".")==-1){H=document.createElement("span");H.className=(I+" "+K);H.innerHTML="&#160;";}else{H=document.createElement("img");H.src=(this.imageRoot+K);H.className=I;}if(H){D.insertBefore(H,D.firstChild);}}},configText:function(E,D,F){var G=D[0];if(G){this.setBody(G);this.cfg.refireEvent("icon");}},toString:function(){return"SimpleDialog "+this.id;}});}());(function(){YAHOO.widget.ContainerEffect=function(E,H,G,D,F){if(!F){F=YAHOO.util.Anim;}this.overlay=E;this.attrIn=H;this.attrOut=G;this.targetElement=D||E.element;this.animClass=F;};var B=YAHOO.util.Dom,C=YAHOO.util.CustomEvent,A=YAHOO.widget.ContainerEffect;A.FADE=function(D,F){var G=YAHOO.util.Easing,I={attributes:{opacity:{from:0,to:1}},duration:F,method:G.easeIn},E={attributes:{opacity:{to:0}},duration:F,method:G.easeOut},H=new A(D,I,E,D.element);H.handleUnderlayStart=function(){var K=this.overlay.underlay;if(K&&YAHOO.env.ua.ie){var J=(K.filters&&K.filters.length>0);if(J){B.addClass(D.element,"yui-effect-fade");}}};H.handleUnderlayComplete=function(){var J=this.overlay.underlay;if(J&&YAHOO.env.ua.ie){B.removeClass(D.element,"yui-effect-fade");}};H.handleStartAnimateIn=function(K,J,L){B.addClass(L.overlay.element,"hide-select");if(!L.overlay.underlay){L.overlay.cfg.refireEvent("underlay");}L.handleUnderlayStart();B.setStyle(L.overlay.element,"visibility","visible");B.setStyle(L.overlay.element,"opacity",0);};H.handleCompleteAnimateIn=function(K,J,L){B.removeClass(L.overlay.element,"hide-select");if(L.overlay.element.style.filter){L.overlay.element.style.filter=null;}L.handleUnderlayComplete();L.overlay.cfg.refireEvent("iframe");L.animateInCompleteEvent.fire();};H.handleStartAnimateOut=function(K,J,L){B.addClass(L.overlay.element,"hide-select");L.handleUnderlayStart();};H.handleCompleteAnimateOut=function(K,J,L){B.removeClass(L.overlay.element,"hide-select");if(L.overlay.element.style.filter){L.overlay.element.style.filter=null;}B.setStyle(L.overlay.element,"visibility","hidden");B.setStyle(L.overlay.element,"opacity",1);L.handleUnderlayComplete();L.overlay.cfg.refireEvent("iframe");L.animateOutCompleteEvent.fire();};H.init();return H;};A.SLIDE=function(F,D){var I=YAHOO.util.Easing,L=F.cfg.getProperty("x")||B.getX(F.element),K=F.cfg.getProperty("y")||B.getY(F.element),M=B.getClientWidth(),H=F.element.offsetWidth,J={attributes:{points:{to:[L,K]}},duration:D,method:I.easeIn},E={attributes:{points:{to:[(M+25),K]}},duration:D,method:I.easeOut},G=new A(F,J,E,F.element,YAHOO.util.Motion);G.handleStartAnimateIn=function(O,N,P){P.overlay.element.style.left=((-25)-H)+"px";P.overlay.element.style.top=K+"px";};G.handleTweenAnimateIn=function(Q,P,R){var S=B.getXY(R.overlay.element),O=S[0],N=S[1];if(B.getStyle(R.overlay.element,"visibility")=="hidden"&&O<L){B.setStyle(R.overlay.element,"visibility","visible");}R.overlay.cfg.setProperty("xy",[O,N],true);R.overlay.cfg.refireEvent("iframe");};G.handleCompleteAnimateIn=function(O,N,P){P.overlay.cfg.setProperty("xy",[L,K],true);P.startX=L;P.startY=K;P.overlay.cfg.refireEvent("iframe");P.animateInCompleteEvent.fire();};G.handleStartAnimateOut=function(O,N,R){var P=B.getViewportWidth(),S=B.getXY(R.overlay.element),Q=S[1];R.animOut.attributes.points.to=[(P+25),Q];};G.handleTweenAnimateOut=function(P,O,Q){var S=B.getXY(Q.overlay.element),N=S[0],R=S[1];Q.overlay.cfg.setProperty("xy",[N,R],true);Q.overlay.cfg.refireEvent("iframe");};G.handleCompleteAnimateOut=function(O,N,P){B.setStyle(P.overlay.element,"visibility","hidden");P.overlay.cfg.setProperty("xy",[L,K]);P.animateOutCompleteEvent.fire();};G.init();return G;};A.prototype={init:function(){this.beforeAnimateInEvent=this.createEvent("beforeAnimateIn");this.beforeAnimateInEvent.signature=C.LIST;this.beforeAnimateOutEvent=this.createEvent("beforeAnimateOut");this.beforeAnimateOutEvent.signature=C.LIST;this.animateInCompleteEvent=this.createEvent("animateInComplete");this.animateInCompleteEvent.signature=C.LIST;this.animateOutCompleteEvent=this.createEvent("animateOutComplete");this.animateOutCompleteEvent.signature=C.LIST;this.animIn=new this.animClass(this.targetElement,this.attrIn.attributes,this.attrIn.duration,this.attrIn.method);this.animIn.onStart.subscribe(this.handleStartAnimateIn,this);this.animIn.onTween.subscribe(this.handleTweenAnimateIn,this);this.animIn.onComplete.subscribe(this.handleCompleteAnimateIn,this);this.animOut=new this.animClass(this.targetElement,this.attrOut.attributes,this.attrOut.duration,this.attrOut.method);this.animOut.onStart.subscribe(this.handleStartAnimateOut,this);this.animOut.onTween.subscribe(this.handleTweenAnimateOut,this);this.animOut.onComplete.subscribe(this.handleCompleteAnimateOut,this);},animateIn:function(){this.beforeAnimateInEvent.fire();this.animIn.animate();},animateOut:function(){this.beforeAnimateOutEvent.fire();this.animOut.animate();},handleStartAnimateIn:function(E,D,F){},handleTweenAnimateIn:function(E,D,F){},handleCompleteAnimateIn:function(E,D,F){},handleStartAnimateOut:function(E,D,F){},handleTweenAnimateOut:function(E,D,F){},handleCompleteAnimateOut:function(E,D,F){},toString:function(){var D="ContainerEffect";
if(this.overlay){D+=" ["+this.overlay.toString()+"]";}return D;}};YAHOO.lang.augmentProto(A,YAHOO.util.EventProvider);})();YAHOO.register("container",YAHOO.widget.Module,{version:"2.6.0",build:"1321"});

/*
Copyright (c) 2008, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://developer.yahoo.net/yui/license.txt
version: 2.6.0
*/
YAHOO.util.Attribute=function(B,A){if(A){this.owner=A;this.configure(B,true);}};YAHOO.util.Attribute.prototype={name:undefined,value:null,owner:null,readOnly:false,writeOnce:false,_initialConfig:null,_written:false,method:null,validator:null,getValue:function(){return this.value;},setValue:function(F,B){var E;var A=this.owner;var C=this.name;var D={type:C,prevValue:this.getValue(),newValue:F};if(this.readOnly||(this.writeOnce&&this._written)){return false;}if(this.validator&&!this.validator.call(A,F)){return false;}if(!B){E=A.fireBeforeChangeEvent(D);if(E===false){return false;}}if(this.method){this.method.call(A,F);}this.value=F;this._written=true;D.type=C;if(!B){this.owner.fireChangeEvent(D);}return true;},configure:function(B,C){B=B||{};this._written=false;this._initialConfig=this._initialConfig||{};for(var A in B){if(B.hasOwnProperty(A)){this[A]=B[A];if(C){this._initialConfig[A]=B[A];}}}},resetValue:function(){return this.setValue(this._initialConfig.value);},resetConfig:function(){this.configure(this._initialConfig);},refresh:function(A){this.setValue(this.value,A);}};(function(){var A=YAHOO.util.Lang;YAHOO.util.AttributeProvider=function(){};YAHOO.util.AttributeProvider.prototype={_configs:null,get:function(C){this._configs=this._configs||{};var B=this._configs[C];if(!B||!this._configs.hasOwnProperty(C)){return undefined;}return B.value;},set:function(D,E,B){this._configs=this._configs||{};var C=this._configs[D];if(!C){return false;}return C.setValue(E,B);},getAttributeKeys:function(){this._configs=this._configs;var D=[];var B;for(var C in this._configs){B=this._configs[C];if(A.hasOwnProperty(this._configs,C)&&!A.isUndefined(B)){D[D.length]=C;}}return D;},setAttributes:function(D,B){for(var C in D){if(A.hasOwnProperty(D,C)){this.set(C,D[C],B);}}},resetValue:function(C,B){this._configs=this._configs||{};if(this._configs[C]){this.set(C,this._configs[C]._initialConfig.value,B);return true;}return false;},refresh:function(E,C){this._configs=this._configs||{};var F=this._configs;E=((A.isString(E))?[E]:E)||this.getAttributeKeys();for(var D=0,B=E.length;D<B;++D){if(F.hasOwnProperty(E[D])){this._configs[E[D]].refresh(C);}}},register:function(B,C){this.setAttributeConfig(B,C);},getAttributeConfig:function(C){this._configs=this._configs||{};var B=this._configs[C]||{};var D={};for(C in B){if(A.hasOwnProperty(B,C)){D[C]=B[C];}}return D;},setAttributeConfig:function(B,C,D){this._configs=this._configs||{};C=C||{};if(!this._configs[B]){C.name=B;this._configs[B]=this.createAttribute(C);}else{this._configs[B].configure(C,D);}},configureAttribute:function(B,C,D){this.setAttributeConfig(B,C,D);},resetAttributeConfig:function(B){this._configs=this._configs||{};this._configs[B].resetConfig();},subscribe:function(B,C){this._events=this._events||{};if(!(B in this._events)){this._events[B]=this.createEvent(B);}YAHOO.util.EventProvider.prototype.subscribe.apply(this,arguments);},on:function(){this.subscribe.apply(this,arguments);},addListener:function(){this.subscribe.apply(this,arguments);},fireBeforeChangeEvent:function(C){var B="before";B+=C.type.charAt(0).toUpperCase()+C.type.substr(1)+"Change";C.type=B;return this.fireEvent(C.type,C);},fireChangeEvent:function(B){B.type+="Change";return this.fireEvent(B.type,B);},createAttribute:function(B){return new YAHOO.util.Attribute(B,this);}};YAHOO.augment(YAHOO.util.AttributeProvider,YAHOO.util.EventProvider);})();(function(){var D=YAHOO.util.Dom,F=YAHOO.util.AttributeProvider;YAHOO.util.Element=function(G,H){if(arguments.length){this.init(G,H);}};YAHOO.util.Element.prototype={DOM_EVENTS:null,appendChild:function(G){G=G.get?G.get("element"):G;return this.get("element").appendChild(G);},getElementsByTagName:function(G){return this.get("element").getElementsByTagName(G);},hasChildNodes:function(){return this.get("element").hasChildNodes();},insertBefore:function(G,H){G=G.get?G.get("element"):G;H=(H&&H.get)?H.get("element"):H;return this.get("element").insertBefore(G,H);},removeChild:function(G){G=G.get?G.get("element"):G;return this.get("element").removeChild(G);},replaceChild:function(G,H){G=G.get?G.get("element"):G;H=H.get?H.get("element"):H;return this.get("element").replaceChild(G,H);},initAttributes:function(G){},addListener:function(K,J,L,I){var H=this.get("element")||this.get("id");I=I||this;var G=this;if(!this._events[K]){if(H&&this.DOM_EVENTS[K]){YAHOO.util.Event.addListener(H,K,function(M){if(M.srcElement&&!M.target){M.target=M.srcElement;}G.fireEvent(K,M);},L,I);}this.createEvent(K,this);}return YAHOO.util.EventProvider.prototype.subscribe.apply(this,arguments);},on:function(){return this.addListener.apply(this,arguments);},subscribe:function(){return this.addListener.apply(this,arguments);},removeListener:function(H,G){return this.unsubscribe.apply(this,arguments);},addClass:function(G){D.addClass(this.get("element"),G);},getElementsByClassName:function(H,G){return D.getElementsByClassName(H,G,this.get("element"));},hasClass:function(G){return D.hasClass(this.get("element"),G);},removeClass:function(G){return D.removeClass(this.get("element"),G);},replaceClass:function(H,G){return D.replaceClass(this.get("element"),H,G);},setStyle:function(I,H){var G=this.get("element");if(!G){return this._queue[this._queue.length]=["setStyle",arguments];}return D.setStyle(G,I,H);},getStyle:function(G){return D.getStyle(this.get("element"),G);},fireQueue:function(){var H=this._queue;for(var I=0,G=H.length;I<G;++I){this[H[I][0]].apply(this,H[I][1]);}},appendTo:function(H,I){H=(H.get)?H.get("element"):D.get(H);this.fireEvent("beforeAppendTo",{type:"beforeAppendTo",target:H});I=(I&&I.get)?I.get("element"):D.get(I);var G=this.get("element");if(!G){return false;}if(!H){return false;}if(G.parent!=H){if(I){H.insertBefore(G,I);}else{H.appendChild(G);}}this.fireEvent("appendTo",{type:"appendTo",target:H});return G;},get:function(G){var I=this._configs||{};var H=I.element;if(H&&!I[G]&&!YAHOO.lang.isUndefined(H.value[G])){return H.value[G];}return F.prototype.get.call(this,G);},setAttributes:function(L,H){var K=this.get("element");
for(var J in L){if(!this._configs[J]&&!YAHOO.lang.isUndefined(K[J])){this.setAttributeConfig(J);}}for(var I=0,G=this._configOrder.length;I<G;++I){if(L[this._configOrder[I]]!==undefined){this.set(this._configOrder[I],L[this._configOrder[I]],H);}}},set:function(H,J,G){var I=this.get("element");if(!I){this._queue[this._queue.length]=["set",arguments];if(this._configs[H]){this._configs[H].value=J;}return ;}if(!this._configs[H]&&!YAHOO.lang.isUndefined(I[H])){C.call(this,H);}return F.prototype.set.apply(this,arguments);},setAttributeConfig:function(G,I,J){var H=this.get("element");if(H&&!this._configs[G]&&!YAHOO.lang.isUndefined(H[G])){C.call(this,G,I);}else{F.prototype.setAttributeConfig.apply(this,arguments);}this._configOrder.push(G);},getAttributeKeys:function(){var H=this.get("element");var I=F.prototype.getAttributeKeys.call(this);for(var G in H){if(!this._configs[G]){I[G]=I[G]||H[G];}}return I;},createEvent:function(H,G){this._events[H]=true;F.prototype.createEvent.apply(this,arguments);},init:function(H,G){A.apply(this,arguments);}};var A=function(H,G){this._queue=this._queue||[];this._events=this._events||{};this._configs=this._configs||{};this._configOrder=[];G=G||{};G.element=G.element||H||null;this.DOM_EVENTS={"click":true,"dblclick":true,"keydown":true,"keypress":true,"keyup":true,"mousedown":true,"mousemove":true,"mouseout":true,"mouseover":true,"mouseup":true,"focus":true,"blur":true,"submit":true};var I=false;if(typeof G.element==="string"){C.call(this,"id",{value:G.element});}if(D.get(G.element)){I=true;E.call(this,G);B.call(this,G);}YAHOO.util.Event.onAvailable(G.element,function(){if(!I){E.call(this,G);}this.fireEvent("available",{type:"available",target:D.get(G.element)});},this,true);YAHOO.util.Event.onContentReady(G.element,function(){if(!I){B.call(this,G);}this.fireEvent("contentReady",{type:"contentReady",target:D.get(G.element)});},this,true);};var E=function(G){this.setAttributeConfig("element",{value:D.get(G.element),readOnly:true});};var B=function(G){this.initAttributes(G);this.setAttributes(G,true);this.fireQueue();};var C=function(G,I){var H=this.get("element");I=I||{};I.name=G;I.method=I.method||function(J){if(H){H[G]=J;}};I.value=I.value||H[G];this._configs[G]=new YAHOO.util.Attribute(I,this);};YAHOO.augment(YAHOO.util.Element,F);})();YAHOO.register("element",YAHOO.util.Element,{version:"2.6.0",build:"1321"});

/*
Copyright (c) 2008, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://developer.yahoo.net/yui/license.txt
version: 2.6.0
*/
(function(){var S="DIV",O="hd",K="bd",N="ft",X="LI",A="disabled",D="mouseover",F="mouseout",U="mousedown",G="mouseup",R=YAHOO.env.ua.ie?"focusin":"focus",V="click",B="keydown",M="keyup",I="keypress",L="clicktohide",T="position",P="dynamic",Y="showdelay",J="selected",E="visible",W="UL",Q="MenuManager",C=YAHOO.util.Dom,Z=YAHOO.util.Event,H=YAHOO.lang;YAHOO.widget.MenuManager=function(){var a=false,c={},r={},d={},n={"click":"clickEvent","mousedown":"mouseDownEvent","mouseup":"mouseUpEvent","mouseover":"mouseOverEvent","mouseout":"mouseOutEvent","keydown":"keyDownEvent","keyup":"keyUpEvent","keypress":"keyPressEvent","focus":"focusEvent","focusin":"focusEvent","blur":"blurEvent","focusout":"blurEvent"},m=null,k=null;function o(u){var s,t;if(u&&u.tagName){switch(u.tagName.toUpperCase()){case S:s=u.parentNode;if((C.hasClass(u,O)||C.hasClass(u,K)||C.hasClass(u,N))&&s&&s.tagName&&s.tagName.toUpperCase()==S){t=s;}else{t=u;}break;case X:t=u;break;default:s=u.parentNode;if(s){t=o(s);}break;}}return t;}function q(w){var s=Z.getTarget(w),t=o(s),y,u,v,AA,z;if(t){u=t.tagName.toUpperCase();if(u==X){v=t.id;if(v&&d[v]){AA=d[v];z=AA.parent;}}else{if(u==S){if(t.id){z=c[t.id];}}}}if(z){y=n[w.type];if(AA&&!AA.cfg.getProperty(A)){AA[y].fire(w);}z[y].fire(w,AA);}else{if(w.type==U){for(var x in r){if(H.hasOwnProperty(r,x)){z=r[x];if(z.cfg.getProperty(L)&&!(z instanceof YAHOO.widget.MenuBar)&&z.cfg.getProperty(T)==P){z.hide();}else{if(z.cfg.getProperty(Y)>0){z._cancelShowDelay();}if(z.activeItem){z.activeItem.blur();z.activeItem.cfg.setProperty(J,false);z.activeItem=null;}}}}}else{if(w.type==R){m=s;}}}}function f(t,s,u){if(c[u.id]){this.removeMenu(u);}}function j(t,s){var u=s[1];if(u){k=u;}}function i(t,s){k=null;}function b(t,s,v){if(v&&v.focus){try{v.focus();}catch(u){}}this.hideEvent.unsubscribe(b,v);}function l(t,s){if(this===this.getRoot()&&this.cfg.getProperty(T)===P){this.hideEvent.subscribe(b,m);this.focus();}}function g(u,t){var s=t[0],v=this.id;if(s){r[v]=this;}else{if(r[v]){delete r[v];}}}function h(t,s){p(this);}function p(t){var s=t.id;if(s&&d[s]){if(k==t){k=null;}delete d[s];t.destroyEvent.unsubscribe(h);}}function e(t,s){var v=s[0],u;if(v instanceof YAHOO.widget.MenuItem){u=v.id;if(!d[u]){d[u]=v;v.destroyEvent.subscribe(h);}}}return{addMenu:function(t){var s;if(t instanceof YAHOO.widget.Menu&&t.id&&!c[t.id]){c[t.id]=t;if(!a){s=document;Z.on(s,D,q,this,true);Z.on(s,F,q,this,true);Z.on(s,U,q,this,true);Z.on(s,G,q,this,true);Z.on(s,V,q,this,true);Z.on(s,B,q,this,true);Z.on(s,M,q,this,true);Z.on(s,I,q,this,true);Z.onFocus(s,q,this,true);Z.onBlur(s,q,this,true);a=true;}t.cfg.subscribeToConfigEvent(E,g);t.destroyEvent.subscribe(f,t,this);t.itemAddedEvent.subscribe(e);t.focusEvent.subscribe(j);t.blurEvent.subscribe(i);t.showEvent.subscribe(l);}},removeMenu:function(v){var t,s,u;if(v){t=v.id;if((t in c)&&(c[t]==v)){s=v.getItems();if(s&&s.length>0){u=s.length-1;do{p(s[u]);}while(u--);}delete c[t];if((t in r)&&(r[t]==v)){delete r[t];}if(v.cfg){v.cfg.unsubscribeFromConfigEvent(E,g);}v.destroyEvent.unsubscribe(f,v);v.itemAddedEvent.unsubscribe(e);v.focusEvent.unsubscribe(j);v.blurEvent.unsubscribe(i);}}},hideVisible:function(){var s;for(var t in r){if(H.hasOwnProperty(r,t)){s=r[t];if(!(s instanceof YAHOO.widget.MenuBar)&&s.cfg.getProperty(T)==P){s.hide();}}}},getVisible:function(){return r;},getMenus:function(){return c;},getMenu:function(t){var s;if(t in c){s=c[t];}return s;},getMenuItem:function(t){var s;if(t in d){s=d[t];}return s;},getMenuItemGroup:function(w){var t=C.get(w),s,y,x,u,v;if(t&&t.tagName&&t.tagName.toUpperCase()==W){y=t.firstChild;if(y){s=[];do{u=y.id;if(u){x=this.getMenuItem(u);if(x){s[s.length]=x;}}}while((y=y.nextSibling));if(s.length>0){v=s;}}}return v;},getFocusedMenuItem:function(){return k;},getFocusedMenu:function(){var s;if(k){s=k.parent.getRoot();}return s;},toString:function(){return Q;}};}();})();(function(){var AN=YAHOO.lang,Ao="Menu",H="DIV",K="div",Ak="id",AI="SELECT",f="xy",R="y",Av="UL",L="ul",AK="first-of-type",l="LI",i="OPTGROUP",Ax="OPTION",Af="disabled",AY="none",z="selected",Ar="groupindex",j="index",O="submenu",As="visible",AX="hidedelay",Ab="position",AE="dynamic",C="static",Al=AE+","+C,Y="windows",Q="url",M="#",V="target",AU="maxheight",T="topscrollbar",y="bottomscrollbar",e="_",P=T+e+Af,E=y+e+Af,c="mousemove",At="showdelay",d="submenuhidedelay",AG="iframe",x="constraintoviewport",A2="preventcontextoverlap",AP="submenualignment",a="autosubmenudisplay",AD="clicktohide",h="container",k="scrollincrement",Ah="minscrollheight",A0="classname",Ae="shadow",Ap="keepopen",Ay="hd",D="hastitle",q="context",v="",Ai="mousedown",Ac="keydown",Am="height",U="width",AR="px",Aw="effect",AF="monitorresize",AW="display",AV="block",J="visibility",AA="absolute",AT="zindex",m="yui-menu-body-scrolled",AL="&#32;",Az=" ",Ag="mouseover",G="mouseout",AS="itemAdded",o="itemRemoved",AM="hidden",t="yui-menu-shadow",AH=t+"-visible",n=t+Az+AH;YAHOO.widget.Menu=function(A4,A3){if(A3){this.parent=A3.parent;this.lazyLoad=A3.lazyLoad||A3.lazyload;this.itemData=A3.itemData||A3.itemdata;}YAHOO.widget.Menu.superclass.constructor.call(this,A4,A3);};function B(A4){var A3=false;if(AN.isString(A4)){A3=(Al.indexOf((A4.toLowerCase()))!=-1);}return A3;}var g=YAHOO.util.Dom,AB=YAHOO.util.Event,Au=YAHOO.widget.Module,AC=YAHOO.widget.Overlay,s=YAHOO.widget.Menu,A1=YAHOO.widget.MenuManager,F=YAHOO.util.CustomEvent,Aq=YAHOO.env.ua,An,Aa=[["mouseOverEvent",Ag],["mouseOutEvent",G],["mouseDownEvent",Ai],["mouseUpEvent","mouseup"],["clickEvent","click"],["keyPressEvent","keypress"],["keyDownEvent",Ac],["keyUpEvent","keyup"],["focusEvent","focus"],["blurEvent","blur"],["itemAddedEvent",AS],["itemRemovedEvent",o]],AZ={key:As,value:false,validator:AN.isBoolean},AQ={key:x,value:true,validator:AN.isBoolean,supercedes:[AG,"x",R,f]},AJ={key:A2,value:true,validator:AN.isBoolean,supercedes:[x]},S={key:Ab,value:AE,validator:B,supercedes:[As,AG]},A={key:AP,value:["tl","tr"]},u={key:a,value:true,validator:AN.isBoolean,suppressEvent:true},Z={key:At,value:250,validator:AN.isNumber,suppressEvent:true},r={key:AX,value:0,validator:AN.isNumber,suppressEvent:true},w={key:d,value:250,validator:AN.isNumber,suppressEvent:true},p={key:AD,value:true,validator:AN.isBoolean,suppressEvent:true},AO={key:h,suppressEvent:true},Ad={key:k,value:1,validator:AN.isNumber,supercedes:[AU],suppressEvent:true},N={key:Ah,value:90,validator:AN.isNumber,supercedes:[AU],suppressEvent:true},X={key:AU,value:0,validator:AN.isNumber,supercedes:[AG],suppressEvent:true},W={key:A0,value:null,validator:AN.isString,suppressEvent:true},b={key:Af,value:false,validator:AN.isBoolean,suppressEvent:true},I={key:Ae,value:true,validator:AN.isBoolean,suppressEvent:true,supercedes:[As]},Aj={key:Ap,value:false,validator:AN.isBoolean};
YAHOO.lang.extend(s,AC,{CSS_CLASS_NAME:"yuimenu",ITEM_TYPE:null,GROUP_TITLE_TAG_NAME:"h6",OFF_SCREEN_POSITION:"-999em",_bHideDelayEventHandlersAssigned:false,_bHandledMouseOverEvent:false,_bHandledMouseOutEvent:false,_aGroupTitleElements:null,_aItemGroups:null,_aListElements:null,_nCurrentMouseX:0,_bStopMouseEventHandlers:false,_sClassName:null,lazyLoad:false,itemData:null,activeItem:null,parent:null,srcElement:null,init:function(A5,A4){this._aItemGroups=[];this._aListElements=[];this._aGroupTitleElements=[];if(!this.ITEM_TYPE){this.ITEM_TYPE=YAHOO.widget.MenuItem;}var A3;if(AN.isString(A5)){A3=g.get(A5);}else{if(A5.tagName){A3=A5;}}if(A3&&A3.tagName){switch(A3.tagName.toUpperCase()){case H:this.srcElement=A3;if(!A3.id){A3.setAttribute(Ak,g.generateId());}s.superclass.init.call(this,A3);this.beforeInitEvent.fire(s);break;case AI:this.srcElement=A3;s.superclass.init.call(this,g.generateId());this.beforeInitEvent.fire(s);break;}}else{s.superclass.init.call(this,A5);this.beforeInitEvent.fire(s);}if(this.element){g.addClass(this.element,this.CSS_CLASS_NAME);this.initEvent.subscribe(this._onInit);this.beforeRenderEvent.subscribe(this._onBeforeRender);this.renderEvent.subscribe(this._onRender);this.beforeShowEvent.subscribe(this._onBeforeShow);this.hideEvent.subscribe(this._onHide);this.showEvent.subscribe(this._onShow);this.beforeHideEvent.subscribe(this._onBeforeHide);this.mouseOverEvent.subscribe(this._onMouseOver);this.mouseOutEvent.subscribe(this._onMouseOut);this.clickEvent.subscribe(this._onClick);this.keyDownEvent.subscribe(this._onKeyDown);this.keyPressEvent.subscribe(this._onKeyPress);this.blurEvent.subscribe(this._onBlur);if(Aq.gecko||Aq.webkit){this.cfg.subscribeToConfigEvent(R,this._onYChange);}if(A4){this.cfg.applyConfig(A4,true);}A1.addMenu(this);this.initEvent.fire(s);}},_initSubTree:function(){var A4=this.srcElement,A3,A6,A9,BA,A8,A7,A5;if(A4){A3=(A4.tagName&&A4.tagName.toUpperCase());if(A3==H){BA=this.body.firstChild;if(BA){A6=0;A9=this.GROUP_TITLE_TAG_NAME.toUpperCase();do{if(BA&&BA.tagName){switch(BA.tagName.toUpperCase()){case A9:this._aGroupTitleElements[A6]=BA;break;case Av:this._aListElements[A6]=BA;this._aItemGroups[A6]=[];A6++;break;}}}while((BA=BA.nextSibling));if(this._aListElements[0]){g.addClass(this._aListElements[0],AK);}}}BA=null;if(A3){switch(A3){case H:A8=this._aListElements;A7=A8.length;if(A7>0){A5=A7-1;do{BA=A8[A5].firstChild;if(BA){do{if(BA&&BA.tagName&&BA.tagName.toUpperCase()==l){this.addItem(new this.ITEM_TYPE(BA,{parent:this}),A5);}}while((BA=BA.nextSibling));}}while(A5--);}break;case AI:BA=A4.firstChild;do{if(BA&&BA.tagName){switch(BA.tagName.toUpperCase()){case i:case Ax:this.addItem(new this.ITEM_TYPE(BA,{parent:this}));break;}}}while((BA=BA.nextSibling));break;}}}},_getFirstEnabledItem:function(){var A3=this.getItems(),A7=A3.length,A6,A5;for(var A4=0;A4<A7;A4++){A6=A3[A4];if(A6&&!A6.cfg.getProperty(Af)&&A6.element.style.display!=AY){A5=A6;break;}}return A5;},_addItemToGroup:function(A8,A9,BD){var BB,BE,A6,BC,A7,A4,A5,BA;function A3(BF,BG){return(BF[BG]||A3(BF,(BG+1)));}if(A9 instanceof this.ITEM_TYPE){BB=A9;BB.parent=this;}else{if(AN.isString(A9)){BB=new this.ITEM_TYPE(A9,{parent:this});}else{if(AN.isObject(A9)){A9.parent=this;BB=new this.ITEM_TYPE(A9.text,A9);}}}if(BB){if(BB.cfg.getProperty(z)){this.activeItem=BB;}BE=AN.isNumber(A8)?A8:0;A6=this._getItemGroup(BE);if(!A6){A6=this._createItemGroup(BE);}if(AN.isNumber(BD)){A7=(BD>=A6.length);if(A6[BD]){A6.splice(BD,0,BB);}else{A6[BD]=BB;}BC=A6[BD];if(BC){if(A7&&(!BC.element.parentNode||BC.element.parentNode.nodeType==11)){this._aListElements[BE].appendChild(BC.element);}else{A4=A3(A6,(BD+1));if(A4&&(!BC.element.parentNode||BC.element.parentNode.nodeType==11)){this._aListElements[BE].insertBefore(BC.element,A4.element);}}BC.parent=this;this._subscribeToItemEvents(BC);this._configureSubmenu(BC);this._updateItemProperties(BE);this.itemAddedEvent.fire(BC);this.changeContentEvent.fire();BA=BC;}}else{A5=A6.length;A6[A5]=BB;BC=A6[A5];if(BC){if(!g.isAncestor(this._aListElements[BE],BC.element)){this._aListElements[BE].appendChild(BC.element);}BC.element.setAttribute(Ar,BE);BC.element.setAttribute(j,A5);BC.parent=this;BC.index=A5;BC.groupIndex=BE;this._subscribeToItemEvents(BC);this._configureSubmenu(BC);if(A5===0){g.addClass(BC.element,AK);}this.itemAddedEvent.fire(BC);this.changeContentEvent.fire();BA=BC;}}}return BA;},_removeItemFromGroupByIndex:function(A6,A4){var A5=AN.isNumber(A6)?A6:0,A7=this._getItemGroup(A5),A9,A8,A3;if(A7){A9=A7.splice(A4,1);A8=A9[0];if(A8){this._updateItemProperties(A5);if(A7.length===0){A3=this._aListElements[A5];if(this.body&&A3){this.body.removeChild(A3);}this._aItemGroups.splice(A5,1);this._aListElements.splice(A5,1);A3=this._aListElements[0];if(A3){g.addClass(A3,AK);}}this.itemRemovedEvent.fire(A8);this.changeContentEvent.fire();}}return A8;},_removeItemFromGroupByValue:function(A6,A3){var A8=this._getItemGroup(A6),A9,A7,A5,A4;if(A8){A9=A8.length;A7=-1;if(A9>0){A4=A9-1;do{if(A8[A4]==A3){A7=A4;break;}}while(A4--);if(A7>-1){A5=this._removeItemFromGroupByIndex(A6,A7);}}}return A5;},_updateItemProperties:function(A4){var A5=this._getItemGroup(A4),A8=A5.length,A7,A6,A3;if(A8>0){A3=A8-1;do{A7=A5[A3];if(A7){A6=A7.element;A7.index=A3;A7.groupIndex=A4;A6.setAttribute(Ar,A4);A6.setAttribute(j,A3);g.removeClass(A6,AK);}}while(A3--);if(A6){g.addClass(A6,AK);}}},_createItemGroup:function(A5){var A3,A4;if(!this._aItemGroups[A5]){this._aItemGroups[A5]=[];A3=document.createElement(L);this._aListElements[A5]=A3;A4=this._aItemGroups[A5];}return A4;},_getItemGroup:function(A5){var A3=AN.isNumber(A5)?A5:0,A6=this._aItemGroups,A4;if(A3 in A6){A4=A6[A3];}return A4;},_configureSubmenu:function(A3){var A4=A3.cfg.getProperty(O);if(A4){this.cfg.configChangedEvent.subscribe(this._onParentMenuConfigChange,A4,true);this.renderEvent.subscribe(this._onParentMenuRender,A4,true);}},_subscribeToItemEvents:function(A3){A3.destroyEvent.subscribe(this._onMenuItemDestroy,A3,this);A3.cfg.configChangedEvent.subscribe(this._onMenuItemConfigChange,A3,this);
},_onVisibleChange:function(A5,A4){var A3=A4[0];if(A3){g.addClass(this.element,As);}else{g.removeClass(this.element,As);}},_cancelHideDelay:function(){var A3=this.getRoot()._hideDelayTimer;if(A3){A3.cancel();}},_execHideDelay:function(){this._cancelHideDelay();var A3=this.getRoot();A3._hideDelayTimer=AN.later(A3.cfg.getProperty(AX),this,function(){if(A3.activeItem){if(A3.hasFocus()){A3.activeItem.focus();}A3.clearActiveItem();}if(A3==this&&!(this instanceof YAHOO.widget.MenuBar)&&this.cfg.getProperty(Ab)==AE){this.hide();}});},_cancelShowDelay:function(){var A3=this.getRoot()._showDelayTimer;if(A3){A3.cancel();}},_execSubmenuHideDelay:function(A5,A4,A3){A5._submenuHideDelayTimer=AN.later(50,this,function(){if(this._nCurrentMouseX>(A4+10)){A5._submenuHideDelayTimer=AN.later(A3,A5,function(){this.hide();});}else{A5.hide();}});},_disableScrollHeader:function(){if(!this._bHeaderDisabled){g.addClass(this.header,P);this._bHeaderDisabled=true;}},_disableScrollFooter:function(){if(!this._bFooterDisabled){g.addClass(this.footer,E);this._bFooterDisabled=true;}},_enableScrollHeader:function(){if(this._bHeaderDisabled){g.removeClass(this.header,P);this._bHeaderDisabled=false;}},_enableScrollFooter:function(){if(this._bFooterDisabled){g.removeClass(this.footer,E);this._bFooterDisabled=false;}},_onMouseOver:function(BF,A8){var BG=A8[0],BC=A8[1],A3=AB.getTarget(BG),A7=this.getRoot(),BE=this._submenuHideDelayTimer,A4,A6,BB,A5,BA,A9;var BD=function(){if(this.parent.cfg.getProperty(z)){this.show();}};if(!this._bStopMouseEventHandlers){if(!this._bHandledMouseOverEvent&&(A3==this.element||g.isAncestor(this.element,A3))){this._nCurrentMouseX=0;AB.on(this.element,c,this._onMouseMove,this,true);if(!(BC&&g.isAncestor(BC.element,AB.getRelatedTarget(BG)))){this.clearActiveItem();}if(this.parent&&BE){BE.cancel();this.parent.cfg.setProperty(z,true);A4=this.parent.parent;A4._bHandledMouseOutEvent=true;A4._bHandledMouseOverEvent=false;}this._bHandledMouseOverEvent=true;this._bHandledMouseOutEvent=false;}if(BC&&!BC.handledMouseOverEvent&&!BC.cfg.getProperty(Af)&&(A3==BC.element||g.isAncestor(BC.element,A3))){A6=this.cfg.getProperty(At);BB=(A6>0);if(BB){this._cancelShowDelay();}A5=this.activeItem;if(A5){A5.cfg.setProperty(z,false);}BA=BC.cfg;BA.setProperty(z,true);if(this.hasFocus()||A7._hasFocus){BC.focus();A7._hasFocus=false;}if(this.cfg.getProperty(a)){A9=BA.getProperty(O);if(A9){if(BB){A7._showDelayTimer=AN.later(A7.cfg.getProperty(At),A9,BD);}else{A9.show();}}}BC.handledMouseOverEvent=true;BC.handledMouseOutEvent=false;}}},_onMouseOut:function(BB,A5){var BC=A5[0],A9=A5[1],A6=AB.getRelatedTarget(BC),BA=false,A8,A7,A3,A4;if(!this._bStopMouseEventHandlers){if(A9&&!A9.cfg.getProperty(Af)){A8=A9.cfg;A7=A8.getProperty(O);if(A7&&(A6==A7.element||g.isAncestor(A7.element,A6))){BA=true;}if(!A9.handledMouseOutEvent&&((A6!=A9.element&&!g.isAncestor(A9.element,A6))||BA)){if(!BA){A9.cfg.setProperty(z,false);if(A7){A3=this.cfg.getProperty(d);A4=this.cfg.getProperty(At);if(!(this instanceof YAHOO.widget.MenuBar)&&A3>0&&A4>=A3){this._execSubmenuHideDelay(A7,AB.getPageX(BC),A3);}else{A7.hide();}}}A9.handledMouseOutEvent=true;A9.handledMouseOverEvent=false;}}if(!this._bHandledMouseOutEvent&&((A6!=this.element&&!g.isAncestor(this.element,A6))||BA)){AB.removeListener(this.element,c,this._onMouseMove);this._nCurrentMouseX=AB.getPageX(BC);this._bHandledMouseOutEvent=true;this._bHandledMouseOverEvent=false;}}},_onMouseMove:function(A4,A3){if(!this._bStopMouseEventHandlers){this._nCurrentMouseX=AB.getPageX(A4);}},_onClick:function(BD,A5){var BE=A5[0],A9=A5[1],BB=false,A7,A4,A3,A8,BA,BC;var A6=function(){if(!((Aq.gecko&&this.platform==Y)&&BE.button>0)){A4=this.getRoot();if(A4 instanceof YAHOO.widget.MenuBar||A4.cfg.getProperty(Ab)==C){A4.clearActiveItem();}else{A4.hide();}}};if(A9){if(A9.cfg.getProperty(Af)){AB.preventDefault(BE);A6.call(this);}else{A7=A9.cfg.getProperty(O);A8=A9.cfg.getProperty(Q);if(A8){BA=A8.indexOf(M);BC=A8.length;if(BA!=-1){A8=A8.substr(BA,BC);BC=A8.length;if(BC>1){A3=A8.substr(1,BC);BB=g.isAncestor(this.element,A3);}else{if(BC===1){BB=true;}}}}if(BB&&!A9.cfg.getProperty(V)){AB.preventDefault(BE);if(Aq.webkit){A9.focus();}else{A9.focusEvent.fire();}}if(!A7&&!this.cfg.getProperty(Ap)){A6.call(this);}}}},_onKeyDown:function(BH,BB){var BE=BB[0],BD=BB[1],BA,BF,A4,A8,BI,A3,BK,A7,BG,A6,BC,BJ,A9;function A5(){this._bStopMouseEventHandlers=true;AN.later(10,this,function(){this._bStopMouseEventHandlers=false;});}if(BD&&!BD.cfg.getProperty(Af)){BF=BD.cfg;A4=this.parent;switch(BE.keyCode){case 38:case 40:BI=(BE.keyCode==38)?BD.getPreviousEnabledSibling():BD.getNextEnabledSibling();if(BI){this.clearActiveItem();BI.cfg.setProperty(z,true);BI.focus();if(this.cfg.getProperty(AU)>0){A3=this.body;BK=A3.scrollTop;A7=A3.offsetHeight;BG=this.getItems();A6=BG.length-1;BC=BI.element.offsetTop;if(BE.keyCode==40){if(BC>=(A7+BK)){A3.scrollTop=BC-A7;}else{if(BC<=BK){A3.scrollTop=0;}}if(BI==BG[A6]){A3.scrollTop=BI.element.offsetTop;}}else{if(BC<=BK){A3.scrollTop=BC-BI.element.offsetHeight;}else{if(BC>=(BK+A7)){A3.scrollTop=BC;}}if(BI==BG[0]){A3.scrollTop=0;}}BK=A3.scrollTop;BJ=A3.scrollHeight-A3.offsetHeight;if(BK===0){this._disableScrollHeader();this._enableScrollFooter();}else{if(BK==BJ){this._enableScrollHeader();this._disableScrollFooter();}else{this._enableScrollHeader();this._enableScrollFooter();}}}}AB.preventDefault(BE);A5();break;case 39:BA=BF.getProperty(O);if(BA){if(!BF.getProperty(z)){BF.setProperty(z,true);}BA.show();BA.setInitialFocus();BA.setInitialSelection();}else{A8=this.getRoot();if(A8 instanceof YAHOO.widget.MenuBar){BI=A8.activeItem.getNextEnabledSibling();if(BI){A8.clearActiveItem();BI.cfg.setProperty(z,true);BA=BI.cfg.getProperty(O);if(BA){BA.show();BA.setInitialFocus();}else{BI.focus();}}}}AB.preventDefault(BE);A5();break;case 37:if(A4){A9=A4.parent;if(A9 instanceof YAHOO.widget.MenuBar){BI=A9.activeItem.getPreviousEnabledSibling();if(BI){A9.clearActiveItem();BI.cfg.setProperty(z,true);BA=BI.cfg.getProperty(O);if(BA){BA.show();
BA.setInitialFocus();}else{BI.focus();}}}else{this.hide();A4.focus();}}AB.preventDefault(BE);A5();break;}}if(BE.keyCode==27){if(this.cfg.getProperty(Ab)==AE){this.hide();if(this.parent){this.parent.focus();}}else{if(this.activeItem){BA=this.activeItem.cfg.getProperty(O);if(BA&&BA.cfg.getProperty(As)){BA.hide();this.activeItem.focus();}else{this.activeItem.blur();this.activeItem.cfg.setProperty(z,false);}}}AB.preventDefault(BE);}},_onKeyPress:function(A5,A4){var A3=A4[0];if(A3.keyCode==40||A3.keyCode==38){AB.preventDefault(A3);}},_onBlur:function(A4,A3){if(this._hasFocus){this._hasFocus=false;}},_onYChange:function(A4,A3){var A6=this.parent,A8,A5,A7;if(A6){A8=A6.parent.body.scrollTop;if(A8>0){A7=(this.cfg.getProperty(R)-A8);g.setY(this.element,A7);A5=this.iframe;if(A5){g.setY(A5,A7);}this.cfg.setProperty(R,A7,true);}}},_onScrollTargetMouseOver:function(A9,BC){var BB=this._bodyScrollTimer;if(BB){BB.cancel();}this._cancelHideDelay();var A5=AB.getTarget(A9),A7=this.body,A6=this.cfg.getProperty(k),A3,A4;function BA(){var BD=A7.scrollTop;if(BD<A3){A7.scrollTop=(BD+A6);this._enableScrollHeader();}else{A7.scrollTop=A3;this._bodyScrollTimer.cancel();this._disableScrollFooter();}}function A8(){var BD=A7.scrollTop;if(BD>0){A7.scrollTop=(BD-A6);this._enableScrollFooter();}else{A7.scrollTop=0;this._bodyScrollTimer.cancel();this._disableScrollHeader();}}if(g.hasClass(A5,Ay)){A4=A8;}else{A3=A7.scrollHeight-A7.offsetHeight;A4=BA;}this._bodyScrollTimer=AN.later(10,this,A4,null,true);},_onScrollTargetMouseOut:function(A5,A3){var A4=this._bodyScrollTimer;if(A4){A4.cancel();}this._cancelHideDelay();},_onInit:function(A4,A3){this.cfg.subscribeToConfigEvent(As,this._onVisibleChange);var A5=!this.parent,A6=this.lazyLoad;if(((A5&&!A6)||(A5&&(this.cfg.getProperty(As)||this.cfg.getProperty(Ab)==C))||(!A5&&!A6))&&this.getItemGroups().length===0){if(this.srcElement){this._initSubTree();}if(this.itemData){this.addItems(this.itemData);}}else{if(A6){this.cfg.fireQueue();}}},_onBeforeRender:function(A6,A5){var A7=this.element,BA=this._aListElements.length,A4=true,A9=0,A3,A8;if(BA>0){do{A3=this._aListElements[A9];if(A3){if(A4){g.addClass(A3,AK);A4=false;}if(!g.isAncestor(A7,A3)){this.appendToBody(A3);}A8=this._aGroupTitleElements[A9];if(A8){if(!g.isAncestor(A7,A8)){A3.parentNode.insertBefore(A8,A3);}g.addClass(A3,D);}}A9++;}while(A9<BA);}},_onRender:function(A4,A3){if(this.cfg.getProperty(Ab)==AE){if(!this.cfg.getProperty(As)){this.positionOffScreen();}}},_onBeforeShow:function(A5,A4){var A7,BA,A6,A8=this.cfg.getProperty(h);if(this.lazyLoad&&this.getItemGroups().length===0){if(this.srcElement){this._initSubTree();}if(this.itemData){if(this.parent&&this.parent.parent&&this.parent.parent.srcElement&&this.parent.parent.srcElement.tagName.toUpperCase()==AI){A7=this.itemData.length;for(BA=0;BA<A7;BA++){if(this.itemData[BA].tagName){this.addItem((new this.ITEM_TYPE(this.itemData[BA])));}}}else{this.addItems(this.itemData);}}A6=this.srcElement;if(A6){if(A6.tagName.toUpperCase()==AI){if(g.inDocument(A6)){this.render(A6.parentNode);}else{this.render(A8);}}else{this.render();}}else{if(this.parent){this.render(this.parent.element);}else{this.render(A8);}}}var A9=this.parent,A3;if(!A9&&this.cfg.getProperty(Ab)==AE){this.cfg.refireEvent(f);}if(A9){A3=A9.parent.cfg.getProperty(AP);this.cfg.setProperty(q,[A9.element,A3[0],A3[1]]);this.align();}},getConstrainedY:function(BF){var BQ=this,BM=BQ.cfg.getProperty(q),BT=BQ.cfg.getProperty(AU),BP,BE={"trbr":true,"tlbl":true,"bltl":true,"brtr":true},A8=(BM&&BE[BM[1]+BM[2]]),BA=BQ.element,BU=BA.offsetHeight,BO=AC.VIEWPORT_OFFSET,BJ=g.getViewportHeight(),BN=g.getDocumentScrollTop(),BK=(BQ.cfg.getProperty(Ah)+BO<BJ),BS,BB,BH,BI,BD=false,BC,A5,BG,A7,A3=BF;var A9=function(){var BV;if((BQ.cfg.getProperty(R)-BN)>BH){BV=(BH-BU);}else{BV=(BH+BI);}BQ.cfg.setProperty(R,(BV+BN),true);return BV;};var A6=function(){if((BQ.cfg.getProperty(R)-BN)>BH){return(A5-BO);}else{return(BC-BO);}};var BL=function(){var BV;if((BQ.cfg.getProperty(R)-BN)>BH){BV=(BH+BI);}else{BV=(BH-BA.offsetHeight);}BQ.cfg.setProperty(R,(BV+BN),true);};var A4=function(){BQ._setScrollHeight(this.cfg.getProperty(AU));BQ.hideEvent.unsubscribe(A4);};var BR=function(){var BZ=A6(),BV=(BQ.getItems().length>0),BY,BX,BW;if(BU>BZ){BY=BV?BQ.cfg.getProperty(Ah):BU;if((BZ>BY)&&BV){BP=BZ;}else{BP=BT;}BQ._setScrollHeight(BP);BQ.hideEvent.subscribe(A4);BL();if(BZ<BY){if(BD){A9();}else{A9();BD=true;BX=BR();}}}else{if(BP&&(BP!=BT)){BQ._setScrollHeight(BT);BQ.hideEvent.subscribe(A4);BL();}}return BX;};if(BQ.cfg.getProperty(A2)&&A8){if(BK){BB=BM[0];BI=BB.offsetHeight;BH=(g.getY(BB)-BN);BC=BH;A5=(BJ-(BH+BI));BR();}A3=BQ.cfg.getProperty(R);}else{if(!(BQ instanceof YAHOO.widget.MenuBar)&&BU>=BJ){BS=(BJ-(BO*2));if(BS>BQ.cfg.getProperty(Ah)){BQ._setScrollHeight(BS);BQ.hideEvent.subscribe(A4);BL();A3=BQ.cfg.getProperty(R);}}else{if(BK){BG=BN+BO;A7=BN+BJ-BU-BO;if(BF<BG){A3=BG;}else{if(BF>A7){A3=A7;}}}else{A3=BO+BN;}}}return A3;},_onHide:function(A4,A3){if(this.cfg.getProperty(Ab)===AE){this.positionOffScreen();}},_onShow:function(BB,A9){var A3=this.parent,A5,A6,A8,A4;function A7(BD){var BC;if(BD.type==Ai||(BD.type==Ac&&BD.keyCode==27)){BC=AB.getTarget(BD);if(BC!=A5.element||!g.isAncestor(A5.element,BC)){A5.cfg.setProperty(a,false);AB.removeListener(document,Ai,A7);AB.removeListener(document,Ac,A7);}}}function BA(BD,BC,BE){this.cfg.setProperty(U,v);this.hideEvent.unsubscribe(BA,BE);}if(A3){A5=A3.parent;if(!A5.cfg.getProperty(a)&&(A5 instanceof YAHOO.widget.MenuBar||A5.cfg.getProperty(Ab)==C)){A5.cfg.setProperty(a,true);AB.on(document,Ai,A7);AB.on(document,Ac,A7);}if((this.cfg.getProperty("x")<A5.cfg.getProperty("x"))&&(Aq.gecko<1.9)&&!this.cfg.getProperty(U)){A6=this.element;A8=A6.offsetWidth;A6.style.width=A8+AR;A4=(A8-(A6.offsetWidth-A8))+AR;this.cfg.setProperty(U,A4);this.hideEvent.subscribe(BA,A4);}}},_onBeforeHide:function(A5,A4){var A3=this.activeItem,A7=this.getRoot(),A8,A6;if(A3){A8=A3.cfg;A8.setProperty(z,false);A6=A8.getProperty(O);if(A6){A6.hide();}}if(Aq.ie&&this.cfg.getProperty(Ab)===AE&&this.parent){A7._hasFocus=this.hasFocus();
}if(A7==this){A7.blur();}},_onParentMenuConfigChange:function(A4,A3,A7){var A5=A3[0][0],A6=A3[0][1];switch(A5){case AG:case x:case AX:case At:case d:case AD:case Aw:case A0:case k:case Ah:case AF:case Ae:case A2:A7.cfg.setProperty(A5,A6);break;case AP:if(!(this.parent.parent instanceof YAHOO.widget.MenuBar)){A7.cfg.setProperty(A5,A6);}break;}},_onParentMenuRender:function(A4,A3,A9){var A6=A9.parent.parent,A5=A6.cfg,A7={constraintoviewport:A5.getProperty(x),xy:[0,0],clicktohide:A5.getProperty(AD),effect:A5.getProperty(Aw),showdelay:A5.getProperty(At),hidedelay:A5.getProperty(AX),submenuhidedelay:A5.getProperty(d),classname:A5.getProperty(A0),scrollincrement:A5.getProperty(k),minscrollheight:A5.getProperty(Ah),iframe:A5.getProperty(AG),shadow:A5.getProperty(Ae),preventcontextoverlap:A5.getProperty(A2),monitorresize:A5.getProperty(AF)},A8;if(!(A6 instanceof YAHOO.widget.MenuBar)){A7[AP]=A5.getProperty(AP);}A9.cfg.applyConfig(A7);if(!this.lazyLoad){A8=this.parent.element;if(this.element.parentNode==A8){this.render();}else{this.render(A8);}}},_onMenuItemDestroy:function(A5,A4,A3){this._removeItemFromGroupByValue(A3.groupIndex,A3);},_onMenuItemConfigChange:function(A5,A4,A3){var A7=A4[0][0],A8=A4[0][1],A6;switch(A7){case z:if(A8===true){this.activeItem=A3;}break;case O:A6=A4[0][1];if(A6){this._configureSubmenu(A3);}break;}},configVisible:function(A5,A4,A6){var A3,A7;if(this.cfg.getProperty(Ab)==AE){s.superclass.configVisible.call(this,A5,A4,A6);}else{A3=A4[0];A7=g.getStyle(this.element,AW);g.setStyle(this.element,J,As);if(A3){if(A7!=AV){this.beforeShowEvent.fire();g.setStyle(this.element,AW,AV);this.showEvent.fire();}}else{if(A7==AV){this.beforeHideEvent.fire();g.setStyle(this.element,AW,AY);this.hideEvent.fire();}}}},configPosition:function(A5,A4,A8){var A7=this.element,A6=A4[0]==C?C:AA,A9=this.cfg,A3;g.setStyle(A7,Ab,A6);if(A6==C){g.setStyle(A7,AW,AV);A9.setProperty(As,true);}else{g.setStyle(A7,J,AM);}if(A6==AA){A3=A9.getProperty(AT);if(!A3||A3===0){A9.setProperty(AT,1);}}},configIframe:function(A4,A3,A5){if(this.cfg.getProperty(Ab)==AE){s.superclass.configIframe.call(this,A4,A3,A5);}},configHideDelay:function(A4,A3,A7){var A9=A3[0],A8=this.mouseOutEvent,A5=this.mouseOverEvent,A6=this.keyDownEvent;if(A9>0){if(!this._bHideDelayEventHandlersAssigned){A8.subscribe(this._execHideDelay);A5.subscribe(this._cancelHideDelay);A6.subscribe(this._cancelHideDelay);this._bHideDelayEventHandlersAssigned=true;}}else{A8.unsubscribe(this._execHideDelay);A5.unsubscribe(this._cancelHideDelay);A6.unsubscribe(this._cancelHideDelay);this._bHideDelayEventHandlersAssigned=false;}},configContainer:function(A4,A3,A6){var A5=A3[0];if(AN.isString(A5)){this.cfg.setProperty(h,g.get(A5),true);}},_clearSetWidthFlag:function(){this._widthSetForScroll=false;this.cfg.unsubscribeFromConfigEvent(U,this._clearSetWidthFlag);},_setScrollHeight:function(BF){var BB=BF,BA=false,BG=false,A7,A8,BE,A5,A4,BD,BH,A3,BC,A9,A6;if(this.getItems().length>0){A7=this.element;A8=this.body;BE=this.header;A5=this.footer;BD=this._onScrollTargetMouseOver;BH=this._onScrollTargetMouseOut;A3=this.cfg.getProperty(Ah);A4=this.parent;if(BB>0&&BB<A3){BB=A3;}g.setStyle(A8,Am,v);g.removeClass(A8,m);A8.scrollTop=0;BG=((Aq.gecko&&A4&&A4.parent&&A4.parent.cfg.getProperty(Ab)==AE)||Aq.ie);if(BB>0&&BG&&!this.cfg.getProperty(U)){A9=A7.offsetWidth;A7.style.width=A9+AR;A6=(A9-(A7.offsetWidth-A9))+AR;this.cfg.unsubscribeFromConfigEvent(U,this._clearSetWidthFlag);this.cfg.setProperty(U,A6);this._widthSetForScroll=true;this.cfg.subscribeToConfigEvent(U,this._clearSetWidthFlag);}if(BB>0&&(!BE&&!A5)){this.setHeader(AL);this.setFooter(AL);BE=this.header;A5=this.footer;g.addClass(BE,T);g.addClass(A5,y);A7.insertBefore(BE,A8);A7.appendChild(A5);}BC=BB;if(BE&&A5){BC=(BC-(BE.offsetHeight+A5.offsetHeight));}if((BC>0)&&(A8.offsetHeight>BB)){g.addClass(A8,m);g.setStyle(A8,Am,(BC+AR));if(!this._hasScrollEventHandlers){AB.on(BE,Ag,BD,this,true);AB.on(BE,G,BH,this,true);AB.on(A5,Ag,BD,this,true);AB.on(A5,G,BH,this,true);this._hasScrollEventHandlers=true;}this._disableScrollHeader();this._enableScrollFooter();BA=true;}else{if(BE&&A5){if(this._widthSetForScroll){this._widthSetForScroll=false;this.cfg.unsubscribeFromConfigEvent(U,this._clearSetWidthFlag);this.cfg.setProperty(U,v);}this._enableScrollHeader();this._enableScrollFooter();if(this._hasScrollEventHandlers){AB.removeListener(BE,Ag,BD);AB.removeListener(BE,G,BH);AB.removeListener(A5,Ag,BD);AB.removeListener(A5,G,BH);this._hasScrollEventHandlers=false;}A7.removeChild(BE);A7.removeChild(A5);this.header=null;this.footer=null;BA=true;}}if(BA){this.cfg.refireEvent(AG);this.cfg.refireEvent(Ae);}}},_setMaxHeight:function(A4,A3,A5){this._setScrollHeight(A5);this.renderEvent.unsubscribe(this._setMaxHeight);},configMaxHeight:function(A4,A3,A5){var A6=A3[0];if(this.lazyLoad&&!this.body&&A6>0){this.renderEvent.subscribe(this._setMaxHeight,A6,this);}else{this._setScrollHeight(A6);}},configClassName:function(A5,A4,A6){var A3=A4[0];if(this._sClassName){g.removeClass(this.element,this._sClassName);}g.addClass(this.element,A3);this._sClassName=A3;},_onItemAdded:function(A4,A3){var A5=A3[0];if(A5){A5.cfg.setProperty(Af,true);}},configDisabled:function(A5,A4,A8){var A7=A4[0],A3=this.getItems(),A9,A6;if(AN.isArray(A3)){A9=A3.length;if(A9>0){A6=A9-1;do{A3[A6].cfg.setProperty(Af,A7);}while(A6--);}if(A7){this.clearActiveItem(true);g.addClass(this.element,Af);this.itemAddedEvent.subscribe(this._onItemAdded);}else{g.removeClass(this.element,Af);this.itemAddedEvent.unsubscribe(this._onItemAdded);}}},configShadow:function(BB,A5,BA){var A9=function(){var BE=this.element,BD=this._shadow;if(BD&&BE){if(BD.style.width&&BD.style.height){BD.style.width=v;BD.style.height=v;}BD.style.width=(BE.offsetWidth+6)+AR;BD.style.height=(BE.offsetHeight+1)+AR;}};var BC=function(){this.element.appendChild(this._shadow);};var A7=function(){g.addClass(this._shadow,AH);};var A8=function(){g.removeClass(this._shadow,AH);};var A4=function(){var BE=this._shadow,BD;if(!BE){BD=this.element;
if(!An){An=document.createElement(K);An.className=n;}BE=An.cloneNode(false);BD.appendChild(BE);this._shadow=BE;this.beforeShowEvent.subscribe(A7);this.beforeHideEvent.subscribe(A8);if(Aq.ie){AN.later(0,this,function(){A9.call(this);this.syncIframe();});this.cfg.subscribeToConfigEvent(U,A9);this.cfg.subscribeToConfigEvent(Am,A9);this.cfg.subscribeToConfigEvent(AU,A9);this.changeContentEvent.subscribe(A9);Au.textResizeEvent.subscribe(A9,this,true);this.destroyEvent.subscribe(function(){Au.textResizeEvent.unsubscribe(A9,this);});}this.cfg.subscribeToConfigEvent(AU,BC);}};var A6=function(){if(this._shadow){BC.call(this);if(Aq.ie){A9.call(this);}}else{A4.call(this);}this.beforeShowEvent.unsubscribe(A6);};var A3=A5[0];if(A3&&this.cfg.getProperty(Ab)==AE){if(this.cfg.getProperty(As)){if(this._shadow){BC.call(this);if(Aq.ie){A9.call(this);}}else{A4.call(this);}}else{this.beforeShowEvent.subscribe(A6);}}},initEvents:function(){s.superclass.initEvents.call(this);var A4=Aa.length-1,A5,A3;do{A5=Aa[A4];A3=this.createEvent(A5[1]);A3.signature=F.LIST;this[A5[0]]=A3;}while(A4--);},positionOffScreen:function(){var A4=this.iframe,A5=this.element,A3=this.OFF_SCREEN_POSITION;A5.style.top=v;A5.style.left=v;if(A4){A4.style.top=A3;A4.style.left=A3;}},getRoot:function(){var A5=this.parent,A4,A3;if(A5){A4=A5.parent;A3=A4?A4.getRoot():this;}else{A3=this;}return A3;},toString:function(){var A4=Ao,A3=this.id;if(A3){A4+=(Az+A3);}return A4;},setItemGroupTitle:function(A8,A7){var A6,A5,A4,A3;if(AN.isString(A8)&&A8.length>0){A6=AN.isNumber(A7)?A7:0;A5=this._aGroupTitleElements[A6];if(A5){A5.innerHTML=A8;}else{A5=document.createElement(this.GROUP_TITLE_TAG_NAME);A5.innerHTML=A8;this._aGroupTitleElements[A6]=A5;}A4=this._aGroupTitleElements.length-1;do{if(this._aGroupTitleElements[A4]){g.removeClass(this._aGroupTitleElements[A4],AK);A3=A4;}}while(A4--);if(A3!==null){g.addClass(this._aGroupTitleElements[A3],AK);}this.changeContentEvent.fire();}},addItem:function(A3,A4){return this._addItemToGroup(A4,A3);},addItems:function(A7,A6){var A9,A3,A8,A4,A5;if(AN.isArray(A7)){A9=A7.length;A3=[];for(A4=0;A4<A9;A4++){A8=A7[A4];if(A8){if(AN.isArray(A8)){A3[A3.length]=this.addItems(A8,A4);}else{A3[A3.length]=this._addItemToGroup(A6,A8);}}}if(A3.length){A5=A3;}}return A5;},insertItem:function(A3,A4,A5){return this._addItemToGroup(A5,A3,A4);},removeItem:function(A3,A5){var A6,A4;if(!AN.isUndefined(A3)){if(A3 instanceof YAHOO.widget.MenuItem){A6=this._removeItemFromGroupByValue(A5,A3);}else{if(AN.isNumber(A3)){A6=this._removeItemFromGroupByIndex(A5,A3);}}if(A6){A6.destroy();A4=A6;}}return A4;},getItems:function(){var A6=this._aItemGroups,A4,A5,A3=[];if(AN.isArray(A6)){A4=A6.length;A5=((A4==1)?A6[0]:(Array.prototype.concat.apply(A3,A6)));}return A5;},getItemGroups:function(){return this._aItemGroups;},getItem:function(A4,A5){var A6,A3;if(AN.isNumber(A4)){A6=this._getItemGroup(A5);if(A6){A3=A6[A4];}}return A3;},getSubmenus:function(){var A4=this.getItems(),A8=A4.length,A3,A5,A7,A6;if(A8>0){A3=[];for(A6=0;A6<A8;A6++){A7=A4[A6];if(A7){A5=A7.cfg.getProperty(O);if(A5){A3[A3.length]=A5;}}}}return A3;},clearContent:function(){var A7=this.getItems(),A4=A7.length,A5=this.element,A6=this.body,BB=this.header,A3=this.footer,BA,A9,A8;if(A4>0){A8=A4-1;do{BA=A7[A8];if(BA){A9=BA.cfg.getProperty(O);if(A9){this.cfg.configChangedEvent.unsubscribe(this._onParentMenuConfigChange,A9);this.renderEvent.unsubscribe(this._onParentMenuRender,A9);}this.removeItem(BA,BA.groupIndex);}}while(A8--);}if(BB){AB.purgeElement(BB);A5.removeChild(BB);}if(A3){AB.purgeElement(A3);A5.removeChild(A3);}if(A6){AB.purgeElement(A6);A6.innerHTML=v;}this.activeItem=null;this._aItemGroups=[];this._aListElements=[];this._aGroupTitleElements=[];this.cfg.setProperty(U,null);},destroy:function(){this.clearContent();this._aItemGroups=null;this._aListElements=null;this._aGroupTitleElements=null;s.superclass.destroy.call(this);},setInitialFocus:function(){var A3=this._getFirstEnabledItem();if(A3){A3.focus();}},setInitialSelection:function(){var A3=this._getFirstEnabledItem();if(A3){A3.cfg.setProperty(z,true);}},clearActiveItem:function(A5){if(this.cfg.getProperty(At)>0){this._cancelShowDelay();}var A3=this.activeItem,A6,A4;if(A3){A6=A3.cfg;if(A5){A3.blur();this.getRoot()._hasFocus=true;}A6.setProperty(z,false);A4=A6.getProperty(O);if(A4){A4.hide();}this.activeItem=null;}},focus:function(){if(!this.hasFocus()){this.setInitialFocus();}},blur:function(){var A3;if(this.hasFocus()){A3=A1.getFocusedMenuItem();if(A3){A3.blur();}}},hasFocus:function(){return(A1.getFocusedMenu()==this.getRoot());},subscribe:function(){function A6(BB,BA,BD){var BE=BA[0],BC=BE.cfg.getProperty(O);if(BC){BC.subscribe.apply(BC,BD);}}function A9(BB,BA,BD){var BC=this.cfg.getProperty(O);if(BC){BC.subscribe.apply(BC,BD);}}s.superclass.subscribe.apply(this,arguments);s.superclass.subscribe.call(this,AS,A6,arguments);var A3=this.getItems(),A8,A7,A4,A5;if(A3){A8=A3.length;if(A8>0){A5=A8-1;do{A7=A3[A5];A4=A7.cfg.getProperty(O);if(A4){A4.subscribe.apply(A4,arguments);}else{A7.cfg.subscribeToConfigEvent(O,A9,arguments);}}while(A5--);}}},initDefaultConfig:function(){s.superclass.initDefaultConfig.call(this);var A3=this.cfg;A3.addProperty(AZ.key,{handler:this.configVisible,value:AZ.value,validator:AZ.validator});A3.addProperty(AQ.key,{handler:this.configConstrainToViewport,value:AQ.value,validator:AQ.validator,supercedes:AQ.supercedes});A3.addProperty(AJ.key,{value:AJ.value,validator:AJ.validator,supercedes:AJ.supercedes});A3.addProperty(S.key,{handler:this.configPosition,value:S.value,validator:S.validator,supercedes:S.supercedes});A3.addProperty(A.key,{value:A.value,suppressEvent:A.suppressEvent});A3.addProperty(u.key,{value:u.value,validator:u.validator,suppressEvent:u.suppressEvent});A3.addProperty(Z.key,{value:Z.value,validator:Z.validator,suppressEvent:Z.suppressEvent});A3.addProperty(r.key,{handler:this.configHideDelay,value:r.value,validator:r.validator,suppressEvent:r.suppressEvent});A3.addProperty(w.key,{value:w.value,validator:w.validator,suppressEvent:w.suppressEvent});
A3.addProperty(p.key,{value:p.value,validator:p.validator,suppressEvent:p.suppressEvent});A3.addProperty(AO.key,{handler:this.configContainer,value:document.body,suppressEvent:AO.suppressEvent});A3.addProperty(Ad.key,{value:Ad.value,validator:Ad.validator,supercedes:Ad.supercedes,suppressEvent:Ad.suppressEvent});A3.addProperty(N.key,{value:N.value,validator:N.validator,supercedes:N.supercedes,suppressEvent:N.suppressEvent});A3.addProperty(X.key,{handler:this.configMaxHeight,value:X.value,validator:X.validator,suppressEvent:X.suppressEvent,supercedes:X.supercedes});A3.addProperty(W.key,{handler:this.configClassName,value:W.value,validator:W.validator,supercedes:W.supercedes});A3.addProperty(b.key,{handler:this.configDisabled,value:b.value,validator:b.validator,suppressEvent:b.suppressEvent});A3.addProperty(I.key,{handler:this.configShadow,value:I.value,validator:I.validator});A3.addProperty(Aj.key,{value:Aj.value,validator:Aj.validator});}});})();(function(){YAHOO.widget.MenuItem=function(AO,AN){if(AO){if(AN){this.parent=AN.parent;this.value=AN.value;this.id=AN.id;}this.init(AO,AN);}};var v=YAHOO.util.Dom,h=YAHOO.widget.Module,x=YAHOO.widget.Menu,a=YAHOO.widget.MenuItem,AG=YAHOO.util.CustomEvent,i=YAHOO.env.ua,AM=YAHOO.lang,AH="text",M="#",O="-",K="helptext",l="url",AD="target",A="emphasis",L="strongemphasis",Z="checked",u="submenu",G="disabled",B="selected",N="hassubmenu",S="checked-disabled",AE="hassubmenu-disabled",z="hassubmenu-selected",R="checked-selected",o="onclick",I="classname",AF="",g="OPTION",t="OPTGROUP",J="LI",Q="li",AA="href",AB='<a href="#"></a>',p="SELECT",V="DIV",AJ='<em class="helptext">',Y="<em>",H="</em>",U="<strong>",w="</strong>",W="preventcontextoverlap",f="obj",AC="scope",r="none",T="visible",D=" ",k="MenuItem",n=[["mouseOverEvent","mouseover"],["mouseOutEvent","mouseout"],["mouseDownEvent","mousedown"],["mouseUpEvent","mouseup"],["clickEvent","click"],["keyPressEvent","keypress"],["keyDownEvent","keydown"],["keyUpEvent","keyup"],["focusEvent","focus"],["blurEvent","blur"],["destroyEvent","destroy"]],m={key:AH,value:AF,validator:AM.isString,suppressEvent:true},q={key:K,supercedes:[AH],suppressEvent:true},F={key:l,value:M,suppressEvent:true},AK={key:AD,suppressEvent:true},AL={key:A,value:false,validator:AM.isBoolean,suppressEvent:true,supercedes:[AH]},b={key:L,value:false,validator:AM.isBoolean,suppressEvent:true,supercedes:[AH]},j={key:Z,value:false,validator:AM.isBoolean,suppressEvent:true,supercedes:[G,B]},E={key:u,suppressEvent:true,supercedes:[G,B]},AI={key:G,value:false,validator:AM.isBoolean,suppressEvent:true,supercedes:[AH,B]},d={key:B,value:false,validator:AM.isBoolean,suppressEvent:true},s={key:o,suppressEvent:true},y={key:I,value:null,validator:AM.isString,suppressEvent:true},c={},C;var X=function(AQ,AP){var AN=c[AQ];if(!AN){c[AQ]={};AN=c[AQ];}var AO=AN[AP];if(!AO){AO=AQ+O+AP;AN[AP]=AO;}return AO;};var e=function(AN){v.addClass(this.element,X(this.CSS_CLASS_NAME,AN));v.addClass(this._oAnchor,X(this.CSS_LABEL_CLASS_NAME,AN));};var P=function(AN){v.removeClass(this.element,X(this.CSS_CLASS_NAME,AN));v.removeClass(this._oAnchor,X(this.CSS_LABEL_CLASS_NAME,AN));};a.prototype={CSS_CLASS_NAME:"yuimenuitem",CSS_LABEL_CLASS_NAME:"yuimenuitemlabel",SUBMENU_TYPE:null,_oAnchor:null,_oHelpTextEM:null,_oSubmenu:null,_oOnclickAttributeValue:null,_sClassName:null,constructor:a,index:null,groupIndex:null,parent:null,element:null,srcElement:null,value:null,browser:h.prototype.browser,id:null,init:function(AN,AX){if(!this.SUBMENU_TYPE){this.SUBMENU_TYPE=x;}this.cfg=new YAHOO.util.Config(this);this.initDefaultConfig();var AT=this.cfg,AU=M,AP,AW,AV,AO,AR,AQ,AS;if(AM.isString(AN)){this._createRootNodeStructure();AT.queueProperty(AH,AN);}else{if(AN&&AN.tagName){switch(AN.tagName.toUpperCase()){case g:this._createRootNodeStructure();AT.queueProperty(AH,AN.text);AT.queueProperty(G,AN.disabled);this.value=AN.value;this.srcElement=AN;break;case t:this._createRootNodeStructure();AT.queueProperty(AH,AN.label);AT.queueProperty(G,AN.disabled);this.srcElement=AN;this._initSubTree();break;case J:AV=v.getFirstChild(AN);if(AV){AU=AV.getAttribute(AA,2);AO=AV.getAttribute(AD);AR=AV.innerHTML;}this.srcElement=AN;this.element=AN;this._oAnchor=AV;AT.setProperty(AH,AR,true);AT.setProperty(l,AU,true);AT.setProperty(AD,AO,true);this._initSubTree();break;}}}if(this.element){AQ=(this.srcElement||this.element).id;if(!AQ){AQ=this.id||v.generateId();this.element.id=AQ;}this.id=AQ;v.addClass(this.element,this.CSS_CLASS_NAME);v.addClass(this._oAnchor,this.CSS_LABEL_CLASS_NAME);AS=n.length-1;do{AW=n[AS];AP=this.createEvent(AW[1]);AP.signature=AG.LIST;this[AW[0]]=AP;}while(AS--);if(AX){AT.applyConfig(AX);}AT.fireQueue();}},_createRootNodeStructure:function(){var AN,AO;if(!C){C=document.createElement(Q);C.innerHTML=AB;}AN=C.cloneNode(true);AN.className=this.CSS_CLASS_NAME;AO=AN.firstChild;AO.className=this.CSS_LABEL_CLASS_NAME;this.element=AN;this._oAnchor=AO;},_initSubTree:function(){var AT=this.srcElement,AP=this.cfg,AR,AQ,AO,AN,AS;if(AT.childNodes.length>0){if(this.parent.lazyLoad&&this.parent.srcElement&&this.parent.srcElement.tagName.toUpperCase()==p){AP.setProperty(u,{id:v.generateId(),itemdata:AT.childNodes});}else{AR=AT.firstChild;AQ=[];do{if(AR&&AR.tagName){switch(AR.tagName.toUpperCase()){case V:AP.setProperty(u,AR);break;case g:AQ[AQ.length]=AR;break;}}}while((AR=AR.nextSibling));AO=AQ.length;if(AO>0){AN=new this.SUBMENU_TYPE(v.generateId());AP.setProperty(u,AN);for(AS=0;AS<AO;AS++){AN.addItem((new AN.ITEM_TYPE(AQ[AS])));}}}}},configText:function(AW,AP,AR){var AO=AP[0],AQ=this.cfg,AU=this._oAnchor,AN=AQ.getProperty(K),AV=AF,AS=AF,AT=AF;if(AO){if(AN){AV=AJ+AN+H;}if(AQ.getProperty(A)){AS=Y;AT=H;}if(AQ.getProperty(L)){AS=U;AT=w;}AU.innerHTML=(AS+AO+AT+AV);}},configHelpText:function(AP,AO,AN){this.cfg.refireEvent(AH);},configURL:function(AP,AO,AN){var AR=AO[0];if(!AR){AR=M;}var AQ=this._oAnchor;if(i.opera){AQ.removeAttribute(AA);}AQ.setAttribute(AA,AR);},configTarget:function(AQ,AP,AO){var AN=AP[0],AR=this._oAnchor;
if(AN&&AN.length>0){AR.setAttribute(AD,AN);}else{AR.removeAttribute(AD);}},configEmphasis:function(AP,AO,AN){var AR=AO[0],AQ=this.cfg;if(AR&&AQ.getProperty(L)){AQ.setProperty(L,false);}AQ.refireEvent(AH);},configStrongEmphasis:function(AQ,AP,AO){var AN=AP[0],AR=this.cfg;if(AN&&AR.getProperty(A)){AR.setProperty(A,false);}AR.refireEvent(AH);},configChecked:function(AP,AO,AN){var AR=AO[0],AQ=this.cfg;if(AR){e.call(this,Z);}else{P.call(this,Z);}AQ.refireEvent(AH);if(AQ.getProperty(G)){AQ.refireEvent(G);}if(AQ.getProperty(B)){AQ.refireEvent(B);}},configDisabled:function(AP,AO,AN){var AR=AO[0],AS=this.cfg,AQ=AS.getProperty(u),AT=AS.getProperty(Z);if(AR){if(AS.getProperty(B)){AS.setProperty(B,false);}e.call(this,G);if(AQ){e.call(this,AE);}if(AT){e.call(this,S);}}else{P.call(this,G);if(AQ){P.call(this,AE);}if(AT){P.call(this,S);}}},configSelected:function(AP,AO,AN){var AT=this.cfg,AS=this._oAnchor,AR=AO[0],AU=AT.getProperty(Z),AQ=AT.getProperty(u);if(i.opera){AS.blur();}if(AR&&!AT.getProperty(G)){e.call(this,B);if(AQ){e.call(this,z);}if(AU){e.call(this,R);}}else{P.call(this,B);if(AQ){P.call(this,z);}if(AU){P.call(this,R);}}if(this.hasFocus()&&i.opera){AS.focus();}},_onSubmenuBeforeHide:function(AQ,AP){var AR=this.parent,AN;function AO(){AR._oAnchor.blur();AN.beforeHideEvent.unsubscribe(AO);}if(AR.hasFocus()){AN=AR.parent;AN.beforeHideEvent.subscribe(AO);}},configSubmenu:function(AU,AP,AS){var AR=AP[0],AQ=this.cfg,AO=this.parent&&this.parent.lazyLoad,AT,AV,AN;if(AR){if(AR instanceof x){AT=AR;AT.parent=this;AT.lazyLoad=AO;}else{if(AM.isObject(AR)&&AR.id&&!AR.nodeType){AV=AR.id;AN=AR;AN.lazyload=AO;AN.parent=this;AT=new this.SUBMENU_TYPE(AV,AN);AQ.setProperty(u,AT,true);}else{AT=new this.SUBMENU_TYPE(AR,{lazyload:AO,parent:this});AQ.setProperty(u,AT,true);}}if(AT){AT.cfg.setProperty(W,true);e.call(this,N);if(AQ.getProperty(l)===M){AQ.setProperty(l,(M+AT.id));}this._oSubmenu=AT;if(i.opera){AT.beforeHideEvent.subscribe(this._onSubmenuBeforeHide);}}}else{P.call(this,N);if(this._oSubmenu){this._oSubmenu.destroy();}}if(AQ.getProperty(G)){AQ.refireEvent(G);}if(AQ.getProperty(B)){AQ.refireEvent(B);}},configOnClick:function(AP,AO,AN){var AQ=AO[0];if(this._oOnclickAttributeValue&&(this._oOnclickAttributeValue!=AQ)){this.clickEvent.unsubscribe(this._oOnclickAttributeValue.fn,this._oOnclickAttributeValue.obj);this._oOnclickAttributeValue=null;}if(!this._oOnclickAttributeValue&&AM.isObject(AQ)&&AM.isFunction(AQ.fn)){this.clickEvent.subscribe(AQ.fn,((f in AQ)?AQ.obj:this),((AC in AQ)?AQ.scope:null));this._oOnclickAttributeValue=AQ;}},configClassName:function(AQ,AP,AO){var AN=AP[0];if(this._sClassName){v.removeClass(this.element,this._sClassName);}v.addClass(this.element,AN);this._sClassName=AN;},initDefaultConfig:function(){var AN=this.cfg;AN.addProperty(m.key,{handler:this.configText,value:m.value,validator:m.validator,suppressEvent:m.suppressEvent});AN.addProperty(q.key,{handler:this.configHelpText,supercedes:q.supercedes,suppressEvent:q.suppressEvent});AN.addProperty(F.key,{handler:this.configURL,value:F.value,suppressEvent:F.suppressEvent});AN.addProperty(AK.key,{handler:this.configTarget,suppressEvent:AK.suppressEvent});AN.addProperty(AL.key,{handler:this.configEmphasis,value:AL.value,validator:AL.validator,suppressEvent:AL.suppressEvent,supercedes:AL.supercedes});AN.addProperty(b.key,{handler:this.configStrongEmphasis,value:b.value,validator:b.validator,suppressEvent:b.suppressEvent,supercedes:b.supercedes});AN.addProperty(j.key,{handler:this.configChecked,value:j.value,validator:j.validator,suppressEvent:j.suppressEvent,supercedes:j.supercedes});AN.addProperty(AI.key,{handler:this.configDisabled,value:AI.value,validator:AI.validator,suppressEvent:AI.suppressEvent});AN.addProperty(d.key,{handler:this.configSelected,value:d.value,validator:d.validator,suppressEvent:d.suppressEvent});AN.addProperty(E.key,{handler:this.configSubmenu,supercedes:E.supercedes,suppressEvent:E.suppressEvent});AN.addProperty(s.key,{handler:this.configOnClick,suppressEvent:s.suppressEvent});AN.addProperty(y.key,{handler:this.configClassName,value:y.value,validator:y.validator,suppressEvent:y.suppressEvent});},getNextEnabledSibling:function(){var AQ,AT,AN,AS,AR,AO;function AP(AU,AV){return AU[AV]||AP(AU,(AV+1));}if(this.parent instanceof x){AQ=this.groupIndex;AT=this.parent.getItemGroups();if(this.index<(AT[AQ].length-1)){AN=AP(AT[AQ],(this.index+1));}else{if(AQ<(AT.length-1)){AS=AQ+1;}else{AS=0;}AR=AP(AT,AS);AN=AP(AR,0);}AO=(AN.cfg.getProperty(G)||AN.element.style.display==r)?AN.getNextEnabledSibling():AN;}return AO;},getPreviousEnabledSibling:function(){var AS,AU,AO,AN,AR,AQ;function AT(AV,AW){return AV[AW]||AT(AV,(AW-1));}function AP(AV,AW){return AV[AW]?AW:AP(AV,(AW+1));}if(this.parent instanceof x){AS=this.groupIndex;AU=this.parent.getItemGroups();if(this.index>AP(AU[AS],0)){AO=AT(AU[AS],(this.index-1));}else{if(AS>AP(AU,0)){AN=AS-1;}else{AN=AU.length-1;}AR=AT(AU,AN);AO=AT(AR,(AR.length-1));}AQ=(AO.cfg.getProperty(G)||AO.element.style.display==r)?AO.getPreviousEnabledSibling():AO;}return AQ;},focus:function(){var AQ=this.parent,AP=this._oAnchor,AN=AQ.activeItem;function AO(){try{if(!(i.ie&&!document.hasFocus())){if(AN){AN.blurEvent.fire();}AP.focus();this.focusEvent.fire();}}catch(AR){}}if(!this.cfg.getProperty(G)&&AQ&&AQ.cfg.getProperty(T)&&this.element.style.display!=r){AM.later(0,this,AO);}},blur:function(){var AN=this.parent;if(!this.cfg.getProperty(G)&&AN&&AN.cfg.getProperty(T)){AM.later(0,this,function(){try{this._oAnchor.blur();this.blurEvent.fire();}catch(AO){}},0);}},hasFocus:function(){return(YAHOO.widget.MenuManager.getFocusedMenuItem()==this);},destroy:function(){var AP=this.element,AO,AN,AR,AQ;if(AP){AO=this.cfg.getProperty(u);if(AO){AO.destroy();}AN=AP.parentNode;if(AN){AN.removeChild(AP);this.destroyEvent.fire();}AQ=n.length-1;do{AR=n[AQ];this[AR[0]].unsubscribeAll();}while(AQ--);this.cfg.configChangedEvent.unsubscribeAll();}},toString:function(){var AO=k,AN=this.id;if(AN){AO+=(D+AN);}return AO;}};AM.augmentProto(a,YAHOO.util.EventProvider);
})();(function(){var B="xy",C="mousedown",F="ContextMenu",J=" ";YAHOO.widget.ContextMenu=function(L,K){YAHOO.widget.ContextMenu.superclass.constructor.call(this,L,K);};var I=YAHOO.util.Event,E=YAHOO.env.ua,G=YAHOO.widget.ContextMenu,A={"TRIGGER_CONTEXT_MENU":"triggerContextMenu","CONTEXT_MENU":(E.opera?C:"contextmenu"),"CLICK":"click"},H={key:"trigger",suppressEvent:true};function D(L,K,M){this.cfg.setProperty(B,M);this.beforeShowEvent.unsubscribe(D,M);}YAHOO.lang.extend(G,YAHOO.widget.Menu,{_oTrigger:null,_bCancelled:false,contextEventTarget:null,triggerContextMenuEvent:null,init:function(L,K){G.superclass.init.call(this,L);this.beforeInitEvent.fire(G);if(K){this.cfg.applyConfig(K,true);}this.initEvent.fire(G);},initEvents:function(){G.superclass.initEvents.call(this);this.triggerContextMenuEvent=this.createEvent(A.TRIGGER_CONTEXT_MENU);this.triggerContextMenuEvent.signature=YAHOO.util.CustomEvent.LIST;},cancel:function(){this._bCancelled=true;},_removeEventHandlers:function(){var K=this._oTrigger;if(K){I.removeListener(K,A.CONTEXT_MENU,this._onTriggerContextMenu);if(E.opera){I.removeListener(K,A.CLICK,this._onTriggerClick);}}},_onTriggerClick:function(L,K){if(L.ctrlKey){I.stopEvent(L);}},_onTriggerContextMenu:function(M,K){var L;if(!(M.type==C&&!M.ctrlKey)){I.stopEvent(M);this.contextEventTarget=I.getTarget(M);this.triggerContextMenuEvent.fire(M);YAHOO.widget.MenuManager.hideVisible();if(!this._bCancelled){L=I.getXY(M);if(!YAHOO.util.Dom.inDocument(this.element)){this.beforeShowEvent.subscribe(D,L);}else{this.cfg.setProperty(B,L);}this.show();}this._bCancelled=false;}},toString:function(){var L=F,K=this.id;if(K){L+=(J+K);}return L;},initDefaultConfig:function(){G.superclass.initDefaultConfig.call(this);this.cfg.addProperty(H.key,{handler:this.configTrigger,suppressEvent:H.suppressEvent});},destroy:function(){this._removeEventHandlers();G.superclass.destroy.call(this);},configTrigger:function(L,K,N){var M=K[0];if(M){if(this._oTrigger){this._removeEventHandlers();}this._oTrigger=M;I.on(M,A.CONTEXT_MENU,this._onTriggerContextMenu,this,true);if(E.opera){I.on(M,A.CLICK,this._onTriggerClick,this,true);}}else{this._removeEventHandlers();}}});}());YAHOO.widget.ContextMenuItem=YAHOO.widget.MenuItem;(function(){var D=YAHOO.lang,N="static",M="dynamic,"+N,A="disabled",F="selected",B="autosubmenudisplay",G="submenu",C="visible",Q=" ",H="submenutoggleregion",P="MenuBar";YAHOO.widget.MenuBar=function(T,S){YAHOO.widget.MenuBar.superclass.constructor.call(this,T,S);};function O(T){var S=false;if(D.isString(T)){S=(M.indexOf((T.toLowerCase()))!=-1);}return S;}var R=YAHOO.util.Event,L=YAHOO.widget.MenuBar,K={key:"position",value:N,validator:O,supercedes:[C]},E={key:"submenualignment",value:["tl","bl"]},J={key:B,value:false,validator:D.isBoolean,suppressEvent:true},I={key:H,value:false,validator:D.isBoolean};D.extend(L,YAHOO.widget.Menu,{init:function(T,S){if(!this.ITEM_TYPE){this.ITEM_TYPE=YAHOO.widget.MenuBarItem;}L.superclass.init.call(this,T);this.beforeInitEvent.fire(L);if(S){this.cfg.applyConfig(S,true);}this.initEvent.fire(L);},CSS_CLASS_NAME:"yuimenubar",SUBMENU_TOGGLE_REGION_WIDTH:20,_onKeyDown:function(U,T,Y){var S=T[0],Z=T[1],W,X,V;if(Z&&!Z.cfg.getProperty(A)){X=Z.cfg;switch(S.keyCode){case 37:case 39:if(Z==this.activeItem&&!X.getProperty(F)){X.setProperty(F,true);}else{V=(S.keyCode==37)?Z.getPreviousEnabledSibling():Z.getNextEnabledSibling();if(V){this.clearActiveItem();V.cfg.setProperty(F,true);W=V.cfg.getProperty(G);if(W){W.show();W.setInitialFocus();}else{V.focus();}}}R.preventDefault(S);break;case 40:if(this.activeItem!=Z){this.clearActiveItem();X.setProperty(F,true);Z.focus();}W=X.getProperty(G);if(W){if(W.cfg.getProperty(C)){W.setInitialSelection();W.setInitialFocus();}else{W.show();W.setInitialFocus();}}R.preventDefault(S);break;}}if(S.keyCode==27&&this.activeItem){W=this.activeItem.cfg.getProperty(G);if(W&&W.cfg.getProperty(C)){W.hide();this.activeItem.focus();}else{this.activeItem.cfg.setProperty(F,false);this.activeItem.blur();}R.preventDefault(S);}},_onClick:function(e,Y,b){L.superclass._onClick.call(this,e,Y,b);var d=Y[1],T=true,S,f,U,W,Z,a,c,V;var X=function(){if(a.cfg.getProperty(C)){a.hide();}else{a.show();}};if(d&&!d.cfg.getProperty(A)){f=Y[0];U=R.getTarget(f);W=this.activeItem;Z=this.cfg;if(W&&W!=d){this.clearActiveItem();}d.cfg.setProperty(F,true);a=d.cfg.getProperty(G);if(a){S=d.element;c=YAHOO.util.Dom.getX(S);V=c+(S.offsetWidth-this.SUBMENU_TOGGLE_REGION_WIDTH);if(Z.getProperty(H)){if(R.getPageX(f)>V){X();R.preventDefault(f);T=false;}}else{X();}}}return T;},configSubmenuToggle:function(U,T){var S=T[0];if(S){this.cfg.setProperty(B,false);}},toString:function(){var T=P,S=this.id;if(S){T+=(Q+S);}return T;},initDefaultConfig:function(){L.superclass.initDefaultConfig.call(this);var S=this.cfg;S.addProperty(K.key,{handler:this.configPosition,value:K.value,validator:K.validator,supercedes:K.supercedes});S.addProperty(E.key,{value:E.value,suppressEvent:E.suppressEvent});S.addProperty(J.key,{value:J.value,validator:J.validator,suppressEvent:J.suppressEvent});S.addProperty(I.key,{value:I.value,validator:I.validator,handler:this.configSubmenuToggle});}});}());YAHOO.widget.MenuBarItem=function(B,A){YAHOO.widget.MenuBarItem.superclass.constructor.call(this,B,A);};YAHOO.lang.extend(YAHOO.widget.MenuBarItem,YAHOO.widget.MenuItem,{init:function(B,A){if(!this.SUBMENU_TYPE){this.SUBMENU_TYPE=YAHOO.widget.Menu;}YAHOO.widget.MenuBarItem.superclass.init.call(this,B);var C=this.cfg;if(A){C.applyConfig(A,true);}C.fireQueue();},CSS_CLASS_NAME:"yuimenubaritem",CSS_LABEL_CLASS_NAME:"yuimenubaritemlabel",toString:function(){var A="MenuBarItem";if(this.cfg&&this.cfg.getProperty("text")){A+=(": "+this.cfg.getProperty("text"));}return A;}});YAHOO.register("menu",YAHOO.widget.Menu,{version:"2.6.0",build:"1321"});

/*
Copyright (c) 2008, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://developer.yahoo.net/yui/license.txt
version: 2.6.0
*/
(function(){var G=YAHOO.util.Dom,M=YAHOO.util.Event,I=YAHOO.lang,L=YAHOO.env.ua,B=YAHOO.widget.Overlay,J=YAHOO.widget.Menu,D={},K=null,E=null,C=null;function F(O,N,R,P){var S,Q;if(I.isString(O)&&I.isString(N)){if(L.ie){Q='<input type="'+O+'" name="'+N+'"';if(P){Q+=" checked";}Q+=">";S=document.createElement(Q);}else{S=document.createElement("input");S.name=N;S.type=O;if(P){S.checked=true;}}S.value=R;}return S;}function H(O,U){var N=O.nodeName.toUpperCase(),S=this,T,P,Q;function V(W){if(!(W in U)){T=O.getAttributeNode(W);if(T&&("value" in T)){U[W]=T.value;}}}function R(){V("type");if(U.type=="button"){U.type="push";}if(!("disabled" in U)){U.disabled=O.disabled;}V("name");V("value");V("title");}switch(N){case"A":U.type="link";V("href");V("target");break;case"INPUT":R();if(!("checked" in U)){U.checked=O.checked;}break;case"BUTTON":R();P=O.parentNode.parentNode;if(G.hasClass(P,this.CSS_CLASS_NAME+"-checked")){U.checked=true;}if(G.hasClass(P,this.CSS_CLASS_NAME+"-disabled")){U.disabled=true;}O.removeAttribute("value");O.setAttribute("type","button");break;}O.removeAttribute("id");O.removeAttribute("name");if(!("tabindex" in U)){U.tabindex=O.tabIndex;}if(!("label" in U)){Q=N=="INPUT"?O.value:O.innerHTML;if(Q&&Q.length>0){U.label=Q;}}}function A(P){var O=P.attributes,N=O.srcelement,R=N.nodeName.toUpperCase(),Q=this;if(R==this.NODE_NAME){P.element=N;P.id=N.id;G.getElementsBy(function(S){switch(S.nodeName.toUpperCase()){case"BUTTON":case"A":case"INPUT":H.call(Q,S,O);break;}},"*",N);}else{switch(R){case"BUTTON":case"A":case"INPUT":H.call(this,N,O);break;}}}YAHOO.widget.Button=function(R,O){if(!B&&YAHOO.widget.Overlay){B=YAHOO.widget.Overlay;}if(!J&&YAHOO.widget.Menu){J=YAHOO.widget.Menu;}var Q=YAHOO.widget.Button.superclass.constructor,P,N;if(arguments.length==1&&!I.isString(R)&&!R.nodeName){if(!R.id){R.id=G.generateId();}Q.call(this,(this.createButtonElement(R.type)),R);}else{P={element:null,attributes:(O||{})};if(I.isString(R)){N=G.get(R);if(N){if(!P.attributes.id){P.attributes.id=R;}P.attributes.srcelement=N;A.call(this,P);if(!P.element){P.element=this.createButtonElement(P.attributes.type);}Q.call(this,P.element,P.attributes);}}else{if(R.nodeName){if(!P.attributes.id){if(R.id){P.attributes.id=R.id;}else{P.attributes.id=G.generateId();}}P.attributes.srcelement=R;A.call(this,P);if(!P.element){P.element=this.createButtonElement(P.attributes.type);}Q.call(this,P.element,P.attributes);}}}};YAHOO.extend(YAHOO.widget.Button,YAHOO.util.Element,{_button:null,_menu:null,_hiddenFields:null,_onclickAttributeValue:null,_activationKeyPressed:false,_activationButtonPressed:false,_hasKeyEventHandlers:false,_hasMouseEventHandlers:false,_nOptionRegionX:0,NODE_NAME:"SPAN",CHECK_ACTIVATION_KEYS:[32],ACTIVATION_KEYS:[13,32],OPTION_AREA_WIDTH:20,CSS_CLASS_NAME:"yui-button",RADIO_DEFAULT_TITLE:"Unchecked.  Click to check.",RADIO_CHECKED_TITLE:"Checked.  Click another button to uncheck",CHECKBOX_DEFAULT_TITLE:"Unchecked.  Click to check.",CHECKBOX_CHECKED_TITLE:"Checked.  Click to uncheck.",MENUBUTTON_DEFAULT_TITLE:"Menu collapsed.  Click to expand.",MENUBUTTON_MENU_VISIBLE_TITLE:"Menu expanded.  Click or press Esc to collapse.",SPLITBUTTON_DEFAULT_TITLE:("Menu collapsed.  Click inside option "+"region or press down arrow key to show the menu."),SPLITBUTTON_OPTION_VISIBLE_TITLE:"Menu expanded.  Press Esc to hide the menu.",SUBMIT_TITLE:"Click to submit form.",_setType:function(N){if(N=="split"){this.on("option",this._onOption);}},_setLabel:function(O){this._button.innerHTML=O;var P,N=L.gecko;if(N&&N<1.9&&G.inDocument(this.get("element"))){P=this.CSS_CLASS_NAME;this.removeClass(P);I.later(0,this,this.addClass,P);}},_setTabIndex:function(N){this._button.tabIndex=N;},_setTitle:function(O){var N=O;if(this.get("type")!="link"){if(!N){switch(this.get("type")){case"radio":N=this.RADIO_DEFAULT_TITLE;break;case"checkbox":N=this.CHECKBOX_DEFAULT_TITLE;break;case"menu":N=this.MENUBUTTON_DEFAULT_TITLE;break;case"split":N=this.SPLITBUTTON_DEFAULT_TITLE;break;case"submit":N=this.SUBMIT_TITLE;break;}}this._button.title=N;}},_setDisabled:function(N){if(this.get("type")!="link"){if(N){if(this._menu){this._menu.hide();}if(this.hasFocus()){this.blur();}this._button.setAttribute("disabled","disabled");this.addStateCSSClasses("disabled");this.removeStateCSSClasses("hover");this.removeStateCSSClasses("active");this.removeStateCSSClasses("focus");}else{this._button.removeAttribute("disabled");this.removeStateCSSClasses("disabled");}}},_setHref:function(N){if(this.get("type")=="link"){this._button.href=N;}},_setTarget:function(N){if(this.get("type")=="link"){this._button.setAttribute("target",N);}},_setChecked:function(O){var P=this.get("type"),N;if(P=="checkbox"||P=="radio"){if(O){this.addStateCSSClasses("checked");N=(P=="radio")?this.RADIO_CHECKED_TITLE:this.CHECKBOX_CHECKED_TITLE;}else{this.removeStateCSSClasses("checked");N=(P=="radio")?this.RADIO_DEFAULT_TITLE:this.CHECKBOX_DEFAULT_TITLE;}if(!this._hasDefaultTitle){this.set("title",N);}}},_setMenu:function(Y){var R=this.get("lazyloadmenu"),U=this.get("element"),N,a=false,b,Q,T,P,O,X,S;function Z(){b.render(U.parentNode);this.removeListener("appendTo",Z);}function W(){b.cfg.queueProperty("container",U.parentNode);this.removeListener("appendTo",W);}function V(){var c;if(b){G.addClass(b.element,this.get("menuclassname"));G.addClass(b.element,"yui-"+this.get("type")+"-button-menu");b.showEvent.subscribe(this._onMenuShow,null,this);b.hideEvent.subscribe(this._onMenuHide,null,this);b.renderEvent.subscribe(this._onMenuRender,null,this);if(J&&b instanceof J){if(R){c=this.get("container");if(c){b.cfg.queueProperty("container",c);}else{this.on("appendTo",W);}}b.cfg.queueProperty("clicktohide",false);b.keyDownEvent.subscribe(this._onMenuKeyDown,this,true);b.subscribe("click",this._onMenuClick,this,true);b.itemAddedEvent.subscribe(this._onMenuItemAdded,this,true);T=b.srcElement;if(T&&T.nodeName.toUpperCase()=="SELECT"){T.style.display="none";T.parentNode.removeChild(T);}}else{if(B&&b instanceof B){if(!K){K=new YAHOO.widget.OverlayManager();
}K.register(b);}}this._menu=b;if(!a&&!R){if(G.inDocument(U)){b.render(U.parentNode);}else{this.on("appendTo",Z);}}}}if(B){if(J){N=J.prototype.CSS_CLASS_NAME;}if(Y&&J&&(Y instanceof J)){b=Y;P=b.getItems();O=P.length;a=true;if(O>0){S=O-1;do{X=P[S];if(X){X.cfg.subscribeToConfigEvent("selected",this._onMenuItemSelected,X,this);}}while(S--);}V.call(this);}else{if(B&&Y&&(Y instanceof B)){b=Y;a=true;b.cfg.queueProperty("visible",false);V.call(this);}else{if(J&&I.isArray(Y)){b=new J(G.generateId(),{lazyload:R,itemdata:Y});this._menu=b;this.on("appendTo",V);}else{if(I.isString(Y)){Q=G.get(Y);if(Q){if(J&&G.hasClass(Q,N)||Q.nodeName.toUpperCase()=="SELECT"){b=new J(Y,{lazyload:R});V.call(this);}else{if(B){b=new B(Y,{visible:false});V.call(this);}}}}else{if(Y&&Y.nodeName){if(J&&G.hasClass(Y,N)||Y.nodeName.toUpperCase()=="SELECT"){b=new J(Y,{lazyload:R});V.call(this);}else{if(B){if(!Y.id){G.generateId(Y);}b=new B(Y,{visible:false});V.call(this);}}}}}}}}},_setOnClick:function(N){if(this._onclickAttributeValue&&(this._onclickAttributeValue!=N)){this.removeListener("click",this._onclickAttributeValue.fn);this._onclickAttributeValue=null;}if(!this._onclickAttributeValue&&I.isObject(N)&&I.isFunction(N.fn)){this.on("click",N.fn,N.obj,N.scope);this._onclickAttributeValue=N;}},_setSelectedMenuItem:function(O){var N=this._menu,P;if(J&&N&&N instanceof J){P=N.getItem(O);if(P&&!P.cfg.getProperty("selected")){P.cfg.setProperty("selected",true);}}},_isActivationKey:function(N){var S=this.get("type"),O=(S=="checkbox"||S=="radio")?this.CHECK_ACTIVATION_KEYS:this.ACTIVATION_KEYS,Q=O.length,R=false,P;if(Q>0){P=Q-1;do{if(N==O[P]){R=true;break;}}while(P--);}return R;},_isSplitButtonOptionKey:function(P){var O=(M.getCharCode(P)==40);var N=function(Q){M.preventDefault(Q);this.removeListener("keypress",N);};if(O){if(L.opera){this.on("keypress",N);}M.preventDefault(P);}return O;},_addListenersToForm:function(){var T=this.getForm(),S=YAHOO.widget.Button.onFormKeyPress,R,N,Q,P,O;if(T){M.on(T,"reset",this._onFormReset,null,this);M.on(T,"submit",this._onFormSubmit,null,this);N=this.get("srcelement");if(this.get("type")=="submit"||(N&&N.type=="submit")){Q=M.getListeners(T,"keypress");R=false;if(Q){P=Q.length;if(P>0){O=P-1;do{if(Q[O].fn==S){R=true;break;}}while(O--);}}if(!R){M.on(T,"keypress",S);}}}},_showMenu:function(R){if(YAHOO.widget.MenuManager){YAHOO.widget.MenuManager.hideVisible();}if(K){K.hideAll();}var N=this._menu,Q=this.get("menualignment"),P=this.get("focusmenu"),O;if(this._renderedMenu){N.cfg.setProperty("context",[this.get("element"),Q[0],Q[1]]);N.cfg.setProperty("preventcontextoverlap",true);N.cfg.setProperty("constraintoviewport",true);}else{N.cfg.queueProperty("context",[this.get("element"),Q[0],Q[1]]);N.cfg.queueProperty("preventcontextoverlap",true);N.cfg.queueProperty("constraintoviewport",true);}this.focus();if(J&&N&&(N instanceof J)){O=N.focus;N.focus=function(){};if(this._renderedMenu){N.cfg.setProperty("minscrollheight",this.get("menuminscrollheight"));N.cfg.setProperty("maxheight",this.get("menumaxheight"));}else{N.cfg.queueProperty("minscrollheight",this.get("menuminscrollheight"));N.cfg.queueProperty("maxheight",this.get("menumaxheight"));}N.show();N.focus=O;N.align();if(R.type=="mousedown"){M.stopPropagation(R);}if(P){N.focus();}}else{if(B&&N&&(N instanceof B)){if(!this._renderedMenu){N.render(this.get("element").parentNode);}N.show();N.align();}}},_hideMenu:function(){var N=this._menu;if(N){N.hide();}},_onMouseOver:function(O){var Q=this.get("type"),N,P;if(Q==="split"){N=this.get("element");P=(G.getX(N)+(N.offsetWidth-this.OPTION_AREA_WIDTH));this._nOptionRegionX=P;}if(!this._hasMouseEventHandlers){if(Q==="split"){this.on("mousemove",this._onMouseMove);}this.on("mouseout",this._onMouseOut);this._hasMouseEventHandlers=true;}this.addStateCSSClasses("hover");if(Q==="split"&&(M.getPageX(O)>P)){this.addStateCSSClasses("hoveroption");}if(this._activationButtonPressed){this.addStateCSSClasses("active");}if(this._bOptionPressed){this.addStateCSSClasses("activeoption");}if(this._activationButtonPressed||this._bOptionPressed){M.removeListener(document,"mouseup",this._onDocumentMouseUp);}},_onMouseMove:function(N){var O=this._nOptionRegionX;if(O){if(M.getPageX(N)>O){this.addStateCSSClasses("hoveroption");}else{this.removeStateCSSClasses("hoveroption");}}},_onMouseOut:function(N){var O=this.get("type");this.removeStateCSSClasses("hover");if(O!="menu"){this.removeStateCSSClasses("active");}if(this._activationButtonPressed||this._bOptionPressed){M.on(document,"mouseup",this._onDocumentMouseUp,null,this);}if(O==="split"&&(M.getPageX(N)>this._nOptionRegionX)){this.removeStateCSSClasses("hoveroption");}},_onDocumentMouseUp:function(P){this._activationButtonPressed=false;this._bOptionPressed=false;var Q=this.get("type"),N,O;if(Q=="menu"||Q=="split"){N=M.getTarget(P);O=this._menu.element;if(N!=O&&!G.isAncestor(O,N)){this.removeStateCSSClasses((Q=="menu"?"active":"activeoption"));this._hideMenu();}}M.removeListener(document,"mouseup",this._onDocumentMouseUp);},_onMouseDown:function(P){var Q,O=true;function N(){this._hideMenu();this.removeListener("mouseup",N);}if((P.which||P.button)==1){if(!this.hasFocus()){this.focus();}Q=this.get("type");if(Q=="split"){if(M.getPageX(P)>this._nOptionRegionX){this.fireEvent("option",P);O=false;}else{this.addStateCSSClasses("active");this._activationButtonPressed=true;}}else{if(Q=="menu"){if(this.isActive()){this._hideMenu();this._activationButtonPressed=false;}else{this._showMenu(P);this._activationButtonPressed=true;}}else{this.addStateCSSClasses("active");this._activationButtonPressed=true;}}if(Q=="split"||Q=="menu"){this._hideMenuTimer=I.later(250,this,this.on,["mouseup",N]);}}return O;},_onMouseUp:function(P){var Q=this.get("type"),N=this._hideMenuTimer,O=true;if(N){N.cancel();}if(Q=="checkbox"||Q=="radio"){this.set("checked",!(this.get("checked")));}this._activationButtonPressed=false;if(Q!="menu"){this.removeStateCSSClasses("active");}if(Q=="split"&&M.getPageX(P)>this._nOptionRegionX){O=false;
}return O;},_onFocus:function(O){var N;this.addStateCSSClasses("focus");if(this._activationKeyPressed){this.addStateCSSClasses("active");}C=this;if(!this._hasKeyEventHandlers){N=this._button;M.on(N,"blur",this._onBlur,null,this);M.on(N,"keydown",this._onKeyDown,null,this);M.on(N,"keyup",this._onKeyUp,null,this);this._hasKeyEventHandlers=true;}this.fireEvent("focus",O);},_onBlur:function(N){this.removeStateCSSClasses("focus");if(this.get("type")!="menu"){this.removeStateCSSClasses("active");}if(this._activationKeyPressed){M.on(document,"keyup",this._onDocumentKeyUp,null,this);}C=null;this.fireEvent("blur",N);},_onDocumentKeyUp:function(N){if(this._isActivationKey(M.getCharCode(N))){this._activationKeyPressed=false;M.removeListener(document,"keyup",this._onDocumentKeyUp);}},_onKeyDown:function(O){var N=this._menu;if(this.get("type")=="split"&&this._isSplitButtonOptionKey(O)){this.fireEvent("option",O);}else{if(this._isActivationKey(M.getCharCode(O))){if(this.get("type")=="menu"){this._showMenu(O);}else{this._activationKeyPressed=true;this.addStateCSSClasses("active");}}}if(N&&N.cfg.getProperty("visible")&&M.getCharCode(O)==27){N.hide();this.focus();}},_onKeyUp:function(N){var O;if(this._isActivationKey(M.getCharCode(N))){O=this.get("type");if(O=="checkbox"||O=="radio"){this.set("checked",!(this.get("checked")));}this._activationKeyPressed=false;if(this.get("type")!="menu"){this.removeStateCSSClasses("active");}}},_onClick:function(Q){var S=this.get("type"),N,R,O,P;switch(S){case"radio":case"checkbox":if(!this._hasDefaultTitle){if(this.get("checked")){N=(S=="radio")?this.RADIO_CHECKED_TITLE:this.CHECKBOX_CHECKED_TITLE;}else{N=(S=="radio")?this.RADIO_DEFAULT_TITLE:this.CHECKBOX_DEFAULT_TITLE;}this.set("title",N);}break;case"submit":if(Q.returnValue!==false){this.submitForm();}break;case"reset":R=this.getForm();if(R){R.reset();}break;case"menu":N=this._menu.cfg.getProperty("visible")?this.MENUBUTTON_MENU_VISIBLE_TITLE:this.MENUBUTTON_DEFAULT_TITLE;this.set("title",N);break;case"split":if(M.getPageX(Q)>this._nOptionRegionX){P=false;}else{this._hideMenu();O=this.get("srcelement");if(O&&O.type=="submit"){this.submitForm();}}N=this._menu.cfg.getProperty("visible")?this.SPLITBUTTON_OPTION_VISIBLE_TITLE:this.SPLITBUTTON_DEFAULT_TITLE;this.set("title",N);break;}return P;},_onDblClick:function(O){var N=true;if(this.get("type")=="split"&&M.getPageX(O)>this._nOptionRegionX){N=false;}return N;},_onAppendTo:function(N){I.later(0,this,this._addListenersToForm);},_onFormReset:function(O){var P=this.get("type"),N=this._menu;if(P=="checkbox"||P=="radio"){this.resetValue("checked");}if(J&&N&&(N instanceof J)){this.resetValue("selectedMenuItem");}},_onFormSubmit:function(N){this.createHiddenFields();},_onDocumentMouseDown:function(Q){var N=M.getTarget(Q),P=this.get("element"),O=this._menu.element;if(N!=P&&!G.isAncestor(P,N)&&N!=O&&!G.isAncestor(O,N)){this._hideMenu();M.removeListener(document,"mousedown",this._onDocumentMouseDown);}},_onOption:function(N){if(this.hasClass("yui-split-button-activeoption")){this._hideMenu();this._bOptionPressed=false;}else{this._showMenu(N);this._bOptionPressed=true;}},_onMenuShow:function(O){M.on(document,"mousedown",this._onDocumentMouseDown,null,this);var N,P;if(this.get("type")=="split"){N=this.SPLITBUTTON_OPTION_VISIBLE_TITLE;P="activeoption";}else{N=this.MENUBUTTON_MENU_VISIBLE_TITLE;P="active";}this.addStateCSSClasses(P);this.set("title",N);},_onMenuHide:function(P){var O=this._menu,N,Q;if(this.get("type")=="split"){N=this.SPLITBUTTON_DEFAULT_TITLE;Q="activeoption";}else{N=this.MENUBUTTON_DEFAULT_TITLE;Q="active";}this.removeStateCSSClasses(Q);this.set("title",N);if(this.get("type")=="split"){this._bOptionPressed=false;}},_onMenuKeyDown:function(P,O){var N=O[0];if(M.getCharCode(N)==27){this.focus();if(this.get("type")=="split"){this._bOptionPressed=false;}}},_onMenuRender:function(O){var Q=this.get("element"),N=Q.parentNode,P=this._menu.element;if(N!=P.parentNode){N.appendChild(P);}this._renderedMenu=true;this.set("selectedMenuItem",this.get("selectedMenuItem"));},_onMenuItemSelected:function(P,O,N){var Q=O[0];if(Q){this.set("selectedMenuItem",N);}},_onMenuItemAdded:function(P,O,N){var Q=O[0];Q.cfg.subscribeToConfigEvent("selected",this._onMenuItemSelected,Q,this);},_onMenuClick:function(O,N){var Q=N[1],P;if(Q){this.set("selectedMenuItem",Q);P=this.get("srcelement");if(P&&P.type=="submit"){this.submitForm();}this._hideMenu();}},createButtonElement:function(N){var P=this.NODE_NAME,O=document.createElement(P);O.innerHTML="<"+P+' class="first-child">'+(N=="link"?"<a></a>":'<button type="button"></button>')+"</"+P+">";return O;},addStateCSSClasses:function(N){var O=this.get("type");if(I.isString(N)){if(N!="activeoption"&&N!="hoveroption"){this.addClass(this.CSS_CLASS_NAME+("-"+N));}this.addClass("yui-"+O+("-button-"+N));}},removeStateCSSClasses:function(N){var O=this.get("type");if(I.isString(N)){this.removeClass(this.CSS_CLASS_NAME+("-"+N));this.removeClass("yui-"+O+("-button-"+N));}},createHiddenFields:function(){this.removeHiddenFields();var V=this.getForm(),Z,O,S,X,Y,T,U,N,R,W,P,Q=false;if(V&&!this.get("disabled")){O=this.get("type");S=(O=="checkbox"||O=="radio");if((S&&this.get("checked"))||(E==this)){Z=F((S?O:"hidden"),this.get("name"),this.get("value"),this.get("checked"));if(Z){if(S){Z.style.display="none";}V.appendChild(Z);}}X=this._menu;if(J&&X&&(X instanceof J)){Y=this.get("selectedMenuItem");P=X.srcElement;Q=(P&&P.nodeName.toUpperCase()=="SELECT");if(Y){U=(Y.value===null||Y.value==="")?Y.cfg.getProperty("text"):Y.value;T=this.get("name");if(Q){W=P.name;}else{if(T){W=(T+"_options");}}if(U&&W){N=F("hidden",W,U);V.appendChild(N);}}else{if(Q){V.appendChild(P);}}}if(Z&&N){this._hiddenFields=[Z,N];}else{if(!Z&&N){this._hiddenFields=N;}else{if(Z&&!N){this._hiddenFields=Z;}}}R=this._hiddenFields;}return R;},removeHiddenFields:function(){var Q=this._hiddenFields,O,P;function N(R){if(G.inDocument(R)){R.parentNode.removeChild(R);}}if(Q){if(I.isArray(Q)){O=Q.length;if(O>0){P=O-1;
do{N(Q[P]);}while(P--);}}else{N(Q);}this._hiddenFields=null;}},submitForm:function(){var Q=this.getForm(),P=this.get("srcelement"),O=false,N;if(Q){if(this.get("type")=="submit"||(P&&P.type=="submit")){E=this;}if(L.ie){O=Q.fireEvent("onsubmit");}else{N=document.createEvent("HTMLEvents");N.initEvent("submit",true,true);O=Q.dispatchEvent(N);}if((L.ie||L.webkit)&&O){Q.submit();}}return O;},init:function(O,Z){var Q=Z.type=="link"?"a":"button",V=Z.srcelement,Y=O.getElementsByTagName(Q)[0],X;if(!Y){X=O.getElementsByTagName("input")[0];if(X){Y=document.createElement("button");Y.setAttribute("type","button");X.parentNode.replaceChild(Y,X);}}this._button=Y;this._hasDefaultTitle=(Z.title&&Z.title.length>0);YAHOO.widget.Button.superclass.init.call(this,O,Z);var T=this.get("id"),N=T+"-button";Y.id=N;var U,W;var c=function(d){return(d.htmlFor===T);};var S=function(){W.setAttribute((L.ie?"htmlFor":"for"),N);};if(V&&this.get("type")!="link"){U=G.getElementsBy(c,"label");if(I.isArray(U)&&U.length>0){W=U[0];}}D[T]=this;this.addClass(this.CSS_CLASS_NAME);this.addClass("yui-"+this.get("type")+"-button");M.on(this._button,"focus",this._onFocus,null,this);this.on("mouseover",this._onMouseOver);this.on("mousedown",this._onMouseDown);this.on("mouseup",this._onMouseUp);this.on("click",this._onClick);this.on("dblclick",this._onDblClick);if(W){this.on("appendTo",S);}this.on("appendTo",this._onAppendTo);var b=this.get("container"),P=this.get("element"),a=G.inDocument(P),R;if(b){if(V&&V!=P){R=V.parentNode;if(R){R.removeChild(V);}}if(I.isString(b)){M.onContentReady(b,this.appendTo,b,this);}else{this.on("init",function(){I.later(0,this,this.appendTo,b);});}}else{if(!a&&V&&V!=P){R=V.parentNode;if(R){this.fireEvent("beforeAppendTo",{type:"beforeAppendTo",target:R});R.replaceChild(P,V);this.fireEvent("appendTo",{type:"appendTo",target:R});}}else{if(this.get("type")!="link"&&a&&V&&V==P){this._addListenersToForm();}}}this.fireEvent("init",{type:"init",target:this});},initAttributes:function(O){var N=O||{};YAHOO.widget.Button.superclass.initAttributes.call(this,N);this.setAttributeConfig("type",{value:(N.type||"push"),validator:I.isString,writeOnce:true,method:this._setType});this.setAttributeConfig("label",{value:N.label,validator:I.isString,method:this._setLabel});this.setAttributeConfig("value",{value:N.value});this.setAttributeConfig("name",{value:N.name,validator:I.isString});this.setAttributeConfig("tabindex",{value:N.tabindex,validator:I.isNumber,method:this._setTabIndex});this.configureAttribute("title",{value:N.title,validator:I.isString,method:this._setTitle});this.setAttributeConfig("disabled",{value:(N.disabled||false),validator:I.isBoolean,method:this._setDisabled});this.setAttributeConfig("href",{value:N.href,validator:I.isString,method:this._setHref});this.setAttributeConfig("target",{value:N.target,validator:I.isString,method:this._setTarget});this.setAttributeConfig("checked",{value:(N.checked||false),validator:I.isBoolean,method:this._setChecked});this.setAttributeConfig("container",{value:N.container,writeOnce:true});this.setAttributeConfig("srcelement",{value:N.srcelement,writeOnce:true});this.setAttributeConfig("menu",{value:null,method:this._setMenu,writeOnce:true});this.setAttributeConfig("lazyloadmenu",{value:(N.lazyloadmenu===false?false:true),validator:I.isBoolean,writeOnce:true});this.setAttributeConfig("menuclassname",{value:(N.menuclassname||"yui-button-menu"),validator:I.isString,method:this._setMenuClassName,writeOnce:true});this.setAttributeConfig("menuminscrollheight",{value:(N.menuminscrollheight||90),validator:I.isNumber});this.setAttributeConfig("menumaxheight",{value:(N.menumaxheight||0),validator:I.isNumber});this.setAttributeConfig("menualignment",{value:(N.menualignment||["tl","bl"]),validator:I.isArray});this.setAttributeConfig("selectedMenuItem",{value:null,method:this._setSelectedMenuItem});this.setAttributeConfig("onclick",{value:N.onclick,method:this._setOnClick});this.setAttributeConfig("focusmenu",{value:(N.focusmenu===false?false:true),validator:I.isBoolean});},focus:function(){if(!this.get("disabled")){this._button.focus();}},blur:function(){if(!this.get("disabled")){this._button.blur();}},hasFocus:function(){return(C==this);},isActive:function(){return this.hasClass(this.CSS_CLASS_NAME+"-active");},getMenu:function(){return this._menu;},getForm:function(){var N=this._button,O;if(N){O=N.form;}return O;},getHiddenFields:function(){return this._hiddenFields;},destroy:function(){var P=this.get("element"),O=P.parentNode,N=this._menu,R;if(N){if(K&&K.find(N)){K.remove(N);}N.destroy();}M.purgeElement(P);M.purgeElement(this._button);M.removeListener(document,"mouseup",this._onDocumentMouseUp);M.removeListener(document,"keyup",this._onDocumentKeyUp);M.removeListener(document,"mousedown",this._onDocumentMouseDown);var Q=this.getForm();if(Q){M.removeListener(Q,"reset",this._onFormReset);M.removeListener(Q,"submit",this._onFormSubmit);}this.unsubscribeAll();if(O){O.removeChild(P);}delete D[this.get("id")];R=G.getElementsByClassName(this.CSS_CLASS_NAME,this.NODE_NAME,Q);if(I.isArray(R)&&R.length===0){M.removeListener(Q,"keypress",YAHOO.widget.Button.onFormKeyPress);}},fireEvent:function(O,N){var P=arguments[0];if(this.DOM_EVENTS[P]&&this.get("disabled")){return false;}return YAHOO.widget.Button.superclass.fireEvent.apply(this,arguments);},toString:function(){return("Button "+this.get("id"));}});YAHOO.widget.Button.onFormKeyPress=function(R){var P=M.getTarget(R),S=M.getCharCode(R),Q=P.nodeName&&P.nodeName.toUpperCase(),N=P.type,T=false,V,X,O,W;function U(a){var Z,Y;switch(a.nodeName.toUpperCase()){case"INPUT":case"BUTTON":if(a.type=="submit"&&!a.disabled){if(!T&&!O){O=a;}}break;default:Z=a.id;if(Z){V=D[Z];if(V){T=true;if(!V.get("disabled")){Y=V.get("srcelement");if(!X&&(V.get("type")=="submit"||(Y&&Y.type=="submit"))){X=V;}}}}break;}}if(S==13&&((Q=="INPUT"&&(N=="text"||N=="password"||N=="checkbox"||N=="radio"||N=="file"))||Q=="SELECT")){G.getElementsBy(U,"*",this);if(O){O.focus();}else{if(!O&&X){M.preventDefault(R);
if(L.ie){X.get("element").fireEvent("onclick");}else{W=document.createEvent("HTMLEvents");W.initEvent("click",true,true);if(L.gecko<1.9){X.fireEvent("click",W);}else{X.get("element").dispatchEvent(W);}}}}}};YAHOO.widget.Button.addHiddenFieldsToForm=function(N){var S=G.getElementsByClassName(YAHOO.widget.Button.prototype.CSS_CLASS_NAME,"*",N),Q=S.length,R,O,P;if(Q>0){for(P=0;P<Q;P++){O=S[P].id;if(O){R=D[O];if(R){R.createHiddenFields();}}}}};YAHOO.widget.Button.getButton=function(N){return D[N];};})();(function(){var C=YAHOO.util.Dom,B=YAHOO.util.Event,D=YAHOO.lang,A=YAHOO.widget.Button,E={};YAHOO.widget.ButtonGroup=function(J,H){var I=YAHOO.widget.ButtonGroup.superclass.constructor,K,G,F;if(arguments.length==1&&!D.isString(J)&&!J.nodeName){if(!J.id){F=C.generateId();J.id=F;}I.call(this,(this._createGroupElement()),J);}else{if(D.isString(J)){G=C.get(J);if(G){if(G.nodeName.toUpperCase()==this.NODE_NAME){I.call(this,G,H);}}}else{K=J.nodeName.toUpperCase();if(K&&K==this.NODE_NAME){if(!J.id){J.id=C.generateId();}I.call(this,J,H);}}}};YAHOO.extend(YAHOO.widget.ButtonGroup,YAHOO.util.Element,{_buttons:null,NODE_NAME:"DIV",CSS_CLASS_NAME:"yui-buttongroup",_createGroupElement:function(){var F=document.createElement(this.NODE_NAME);return F;},_setDisabled:function(G){var H=this.getCount(),F;if(H>0){F=H-1;do{this._buttons[F].set("disabled",G);}while(F--);}},_onKeyDown:function(K){var G=B.getTarget(K),I=B.getCharCode(K),H=G.parentNode.parentNode.id,J=E[H],F=-1;if(I==37||I==38){F=(J.index===0)?(this._buttons.length-1):(J.index-1);}else{if(I==39||I==40){F=(J.index===(this._buttons.length-1))?0:(J.index+1);}}if(F>-1){this.check(F);this.getButton(F).focus();}},_onAppendTo:function(H){var I=this._buttons,G=I.length,F;for(F=0;F<G;F++){I[F].appendTo(this.get("element"));}},_onButtonCheckedChange:function(G,F){var I=G.newValue,H=this.get("checkedButton");if(I&&H!=F){if(H){H.set("checked",false,true);}this.set("checkedButton",F);this.set("value",F.get("value"));}else{if(H&&!H.set("checked")){H.set("checked",true,true);}}},init:function(I,H){this._buttons=[];YAHOO.widget.ButtonGroup.superclass.init.call(this,I,H);this.addClass(this.CSS_CLASS_NAME);var J=this.getElementsByClassName("yui-radio-button");if(J.length>0){this.addButtons(J);}function F(K){return(K.type=="radio");}J=C.getElementsBy(F,"input",this.get("element"));if(J.length>0){this.addButtons(J);}this.on("keydown",this._onKeyDown);this.on("appendTo",this._onAppendTo);var G=this.get("container");if(G){if(D.isString(G)){B.onContentReady(G,function(){this.appendTo(G);},null,this);}else{this.appendTo(G);}}},initAttributes:function(G){var F=G||{};YAHOO.widget.ButtonGroup.superclass.initAttributes.call(this,F);this.setAttributeConfig("name",{value:F.name,validator:D.isString});this.setAttributeConfig("disabled",{value:(F.disabled||false),validator:D.isBoolean,method:this._setDisabled});this.setAttributeConfig("value",{value:F.value});this.setAttributeConfig("container",{value:F.container,writeOnce:true});this.setAttributeConfig("checkedButton",{value:null});},addButton:function(J){var L,K,G,F,H,I;if(J instanceof A&&J.get("type")=="radio"){L=J;}else{if(!D.isString(J)&&!J.nodeName){J.type="radio";L=new A(J);}else{L=new A(J,{type:"radio"});}}if(L){F=this._buttons.length;H=L.get("name");I=this.get("name");L.index=F;this._buttons[F]=L;E[L.get("id")]=L;if(H!=I){L.set("name",I);}if(this.get("disabled")){L.set("disabled",true);}if(L.get("checked")){this.set("checkedButton",L);}K=L.get("element");G=this.get("element");if(K.parentNode!=G){G.appendChild(K);}L.on("checkedChange",this._onButtonCheckedChange,L,this);}return L;},addButtons:function(G){var H,I,J,F;if(D.isArray(G)){H=G.length;J=[];if(H>0){for(F=0;F<H;F++){I=this.addButton(G[F]);if(I){J[J.length]=I;}}}}return J;},removeButton:function(H){var I=this.getButton(H),G,F;if(I){this._buttons.splice(H,1);delete E[I.get("id")];I.removeListener("checkedChange",this._onButtonCheckedChange);I.destroy();G=this._buttons.length;if(G>0){F=this._buttons.length-1;do{this._buttons[F].index=F;}while(F--);}}},getButton:function(F){return this._buttons[F];},getButtons:function(){return this._buttons;},getCount:function(){return this._buttons.length;},focus:function(H){var I,G,F;if(D.isNumber(H)){I=this._buttons[H];if(I){I.focus();}}else{G=this.getCount();for(F=0;F<G;F++){I=this._buttons[F];if(!I.get("disabled")){I.focus();break;}}}},check:function(F){var G=this.getButton(F);if(G){G.set("checked",true);}},destroy:function(){var I=this._buttons.length,H=this.get("element"),F=H.parentNode,G;if(I>0){G=this._buttons.length-1;do{this._buttons[G].destroy();}while(G--);}B.purgeElement(H);F.removeChild(H);},toString:function(){return("ButtonGroup "+this.get("id"));}});})();YAHOO.register("button",YAHOO.widget.Button,{version:"2.6.0",build:"1321"});

// Place your application-specific JavaScript functions and classes here
// This file is automatically included by javascript_include_tag :defaults

function get_window_height() {
  var myWidth = 0, myHeight = 0;
  if( typeof( window.innerWidth ) == 'number' ) {
    //Non-IE
    myWidth = window.innerWidth;
    myHeight = window.innerHeight;
  } else if( document.documentElement && ( document.documentElement.clientWidth || document.documentElement.clientHeight ) ) {
    //IE 6+ in 'standards compliant mode'
    myWidth = document.documentElement.clientWidth;
    myHeight = document.documentElement.clientHeight;
  } else if( document.body && ( document.body.clientWidth || document.body.clientHeight ) ) {
    //IE 4 compatible
    myWidth = document.body.clientWidth;
    myHeight = document.body.clientHeight;
  }
  return myHeight;  
}

function setSize(dom_id) {
  var window_height = get_window_height() * 0.75;
  var iframeElement = parent.document.getElementById(dom_id); 
  iframeElement.style.height = window_height + "px"; //100px or 100% 
  iframeElement.style.width = "98%"; //100px or 100%
}

YAHOO.util.Event.onContentReady("mainmenubar", function () {

    /*
         Instantiate a MenuBar:  The first argument passed to the 
         constructor is the id of the element in the page 
         representing the MenuBar; the second is an object literal 
         of configuration properties.
    */
    var oMenuBar = new YAHOO.widget.MenuBar("mainmenubar", { 
                                                autosubmenudisplay: true, 
                                                hidedelay: 750, 
                                                lazyload: true });
    oMenuBar.render();

    shutdownPanel = new YAHOO.widget.Panel("shutdown", {
      width:"400px", 
      fixedcenter: true, 
      constraintoviewport: true, 
      underlay:"shadow",
      modal:true, 
      close:true, 
      visible:false, 
      draggable:false} );
    shutdownPanel.setHeader("Shutdown or Reboot");
    shutdownPanel.setFooter("The system will stop responding after shutdown and during reboot");
    shutdownPanel.render();
    YAHOO.util.Event.addListener("shutdownLink", "click", shutdownPanel.show, shutdownPanel, true);

    var oSubmitButton1 = new YAHOO.widget.Button("save", { value: "save" });
});

YAHOO.util.Event.onContentReady("content", function () {
  var oSubmitButton0 = new YAHOO.widget.Button("submit", { value: "submit" });
});

function password_strength(password) {
  var desc = new Array();
  desc[0] = "Invalid";
  desc[1] = "Weak";
  desc[2] = "Better";
  desc[3] = "Medium";
  desc[4] = "Strong";
  desc[5] = "Strongest";

  var points = 0;

  //---- if password is bigger than 4 , give 1 point.
  if (password.length > 5) points++;

  //---- if password has both lowercase and uppercase characters , give 1 point.  
  if ( ( password.match(/[a-z]/) ) && ( password.match(/[A-Z]/) ) ) points++;

  //---- if password has at least one number , give 1 point.
  if (password.match(/\d+/)) points++;

  //---- if password has at least one special caracther , give 1 point.
  if ( password.match(/.[!,@,#,$,%,^,&,*,?,_,~,-,(,)]/) ) points++;

  //---- if password is bigger than 12 ,  give 1 point.
  if (password.length > 10) points++;

  //---- Showing  description for password strength.
  if (password.length < 1) {
    document.getElementById("password_description").innerHTML = "";
    document.getElementById("password_strength").className = "strength0";
  }

  if ((password.length > 0) && (password.length < 6)) {
    document.getElementById("password_description").innerHTML = "Invalid";
    document.getElementById("password_strength").className = "strength0";
  }

  if (password.length > 5) {
    document.getElementById("password_description").innerHTML = desc[points];
    document.getElementById("password_strength").className = "strength" + points;
  }
}

function moveOption( fromID, toID, idx ) {
  if (isNaN(parseInt(idx))) {
    var i = document.getElementById( fromID ).selectedIndex;
  } else {
    var i = idx;
  }

  var o = document.getElementById( fromID ).options[ i ];
  var theOpt = new Option( o.text, o.value, false, false );
  document.getElementById( toID ).options[document.getElementById( toID ).options.length] = theOpt;
  document.getElementById( fromID ).options[ i ] = null;
}
function moveOptions( fromID, toID ) {
  for (var x = document.getElementById( fromID ).options.length - 1; x >= 0 ; x--) {
    if (document.getElementById( fromID ).options[x].selected == true) {
      moveOption( fromID, toID, x );
    }
  }
}
function selectAllOptions(selStr) {
  var selObj = document.getElementById(selStr);
  for (var i=0; i<selObj.options.length; i++) {
    selObj.options[i].selected = true;
  }
}
