/**
* JS served on every page to track errors
* yalc
* Based on **Bugsnag.js**, with modifications, as allowed in the licence
* https://github.com/bugsnag/bugsnag-js/blob/23d65d3d384fdb4ec9f522fa6e2dee2417a234c1/LICENSE.txt
* No external dependencies (not even jQuery!)
*/

// The `YALC` object is the only globally exported variable
(function(definition) {
  var old = window.YALC;
  window.YALC = definition(window, document, navigator, old);
})(function (window, document, navigator, old) {
	
  var self = {},
      lastEvent,
      shouldCatch = true,
      ignoreOnError = 0;

  self.noConflict = function() {
    window.YALC = old;
    return self;
  };

  
  /*
  * Notify about a given `exception`, typically that you've caught
  * with a `try/catch` statement or that you've generated yourself.
  * Since most JavaScript exceptions use the `Error` class, we also allow
  * you to provide a custom error name when calling `notifyException`.
  */
  self.notifyException = function (exception, name, metaData) {
    if (typeof name !== "string") {
      metaData = name;
    }

    logError({
      name: name || exception.name,
      message: exception.message || exception.description,
      stacktrace: stacktraceFromException(exception) || generateStacktrace(),
      file: exception.fileName || exception.sourceURL,
      lineNumber: exception.lineNumber || exception.line
    }, metaData);
  };

  /*
   * Notify an error
   */
  self.notify = function (name, message, metaData) {
    logError({
      name: name,
      message: message,
      stacktrace: generateStacktrace()
    }, metaData);
  };


  /*
   * Wrapper for all the JS, since not all browsers support window.onError 
   * or stacktrace
   */
  self.wrap = function (_super, options) {
    if (typeof _super !== "function") {
      return _super;
    }
    if (!_super.bugsnag) {
      _super.bugsnag = function (event) {
        if (options && options.eventHandler) {
          lastEvent = event;
        }

        if (shouldCatch) {
          try {
            return _super.apply(this, arguments);
          } catch (e) {
            // We do this rather than stashing treating the error like lastEvent
            // because in FF 26 onerror is not called for synthesized event handlers.
            if (true) {
              self.notifyException(e);
              ignoreNextOnError();
            }
            throw e;
          }
        } else {
          return _super.apply(this, arguments);
        }
      };
      _super.bugsnag.bugsnag = _super.bugsnag;
    }

    return _super.bugsnag;
  };


  // Compile regular expressions upfront.
  var FUNCTION_REGEX = /function\s*([\w\-$]+)?\s*\(/i;

  // Keep a reference to the currently executing script in the DOM.
  // We'll use this later to extract settings from attributes.
  var scripts = document.getElementsByTagName("script");
  var thisScript = scripts[scripts.length - 1];

  /*
   * Compatible log function
   */
  function log(msg) {
    var console = window.console;
    if (console !== undefined && console.log !== undefined) {
      console.log("[YALC] " + msg);
    }
  }

  /*
   * Deeply serialize an object into a query string 
   */ 
  function serialize(obj, prefix) {
    var str = [];
    for (var p in obj) {
      if (obj.hasOwnProperty(p) && p != null && obj[p] != null) {
        var k = prefix ? prefix + "[" + p + "]" : p, v = obj[p];
        str.push(typeof v === "object" ? serialize(v, k) : encodeURIComponent(k) + "=" + encodeURIComponent(v));
      }
    }
    return str.join("&");
  }

  /*
   * jQuery $.extends method
   */
  function merge(target, source) {
    if (source == null) {
      return target;
    }

    target = target || {};
    for (var key in source) {
      if (source.hasOwnProperty(key)) {
        try {
          if (source[key].constructor === Object) {
            target[key] = merge(target[key], source[key]);
          } else {
            target[key] = source[key];
          }
        } catch (e) {
          target[key] = source[key];
        }
      }
    }

    return target;
  }


 /*
 * Make a HTTP request with given `url` and `params` object.
 * For maximum browser compatibility and cross-domain support, requests are made by faking an Image attribute
 */
  function request(url, params) {
      var img = new Image();
      img.src = url + "?" + serialize(params) + "&rand=" + new Date().getTime();
  }


  /*
   * Log the sucker
   */
  function logError(details, metaData) {

    if (lastEvent) {
      metaData = metaData || {};
      metaData.Event = eventToMetaData(lastEvent);
    }

    //Make the request to log the error
    //Combine all the info we can get
    var location = window.location;
    request( DEFAULT_NOTIFIER_ENDPOINT, {

      projectRoot: location.protocol + "//" + location.host,
      context: location.pathname,
      metaData: metaData,

      url: window.location.href,
      userAgent: navigator.userAgent,
      language: navigator.language || navigator.userLanguage,

      name: details.name,
      message: details.message,
      stacktrace: details.stacktrace,
      file: details.file,
      lineNumber: details.lineNumber,
      columnNumber: details.columnNumber,
      
      token: LOG_TOKEN
    });
  }

  /*
   * Generate a browser stacktrace (or approximation) from the current stack.
   */
  function generateStacktrace() {
    var stacktrace;
    var MAX_FAKE_STACK_SIZE = 10;
    var ANONYMOUS_FUNCTION_PLACEHOLDER = "[anonymous]";

    // Try to generate a real stacktrace (most browsers, except IE9 and below).
    try {
      throw new Error("");
    } catch (exception) {
      stacktrace = stacktraceFromException(exception);
    }

    // Otherwise, build a fake stacktrace from the list of method names by
    // looping through the list of functions that called this one (and skip
    // whoever called us).
    if (!stacktrace) {
      var functionStack = [];
      var curr = arguments.callee.caller.caller;
      while (curr && functionStack.length < MAX_FAKE_STACK_SIZE) {
        var fn = FUNCTION_REGEX.test(curr.toString()) ? RegExp.$1 || ANONYMOUS_FUNCTION_PLACEHOLDER : ANONYMOUS_FUNCTION_PLACEHOLDER;
        functionStack.push(fn);
        curr = curr.caller;
      }

      stacktrace = functionStack.join("\n");
    }

    return stacktrace;
  }

  /*
   * Get the stacktrace string from an exception
   */
  function stacktraceFromException(exception) {
    return exception.stack || exception.backtrace || exception.stacktrace;
  }

  function eventToMetaData(event) {
    var tab = {
      millisecondsAgo: new Date() - event.timeStamp,
      type: event.type,
      which: event.which,
      target: targetToString(event.target)
    };

    return tab;
  }

  function targetToString(target) {
    if (target) {
      var attrs = target.attributes;

      if (attrs) {
        var ret = "<" + target.nodeName.toLowerCase();
        for (var i = 0; i < attrs.length; i++) {
          ret += " " + attrs[i].name + "=\"" + attrs[i].value + "\"";
        }
        return ret + ">";
      } else {
         // e.g. #document
        return target.nodeName;
      }
    }
  }

  // If we've notified
  function ignoreNextOnError() {
    ignoreOnError += 1;
    window.setTimeout(function () {
      ignoreOnError -= 1;
    });
  }

  // Disable catching on IE < 10 as it destroys stack-traces from generateStackTrace()
  if (!window.atob) {
    shouldCatch = false;

  // Disable catching on browsers that support HTML5 ErrorEvents properly.
  // This lets debug on unhandled exceptions work.
  } else if (window.ErrorEvent) {
    try {
      if (new window.ErrorEvent("test").colno === 0) {
        shouldCatch = false;
      }
    } catch(e){ }
  }


  // Add a polyFill to an object
  function polyFill(obj, name, makeReplacement) {
    var original = obj[name];
    var replacement = makeReplacement(original);
    obj[name] = replacement;
  }

  if ( LOG_ERROS ) {

	/*
	 * Attach to `window.onerror` events
	 * These are mostly js compile/parse errors, but on some browsers all
	 * "uncaught" exceptions will fire this event.
	 */
    polyFill(window, "onerror", function (_super) {

      return function bugsnag(message, url, lineNo, charNo, exception) {

        var metaData = {};

        // IE 6+ support.
        if (!charNo && window.event) {
          charNo = window.event.errorCharacter;
        }

        if ( !ignoreOnError ) {
          logError({
            name: exception && exception.name || "window.onerror",
            message: message,
            file: url,
            lineNumber: lineNo,
            columnNumber: charNo,
            stacktrace: (exception && stacktraceFromException(exception)) || generateStacktrace()
          }, metaData);
        }

        // Fire the existing `window.onerror` handler, if one exists
        if (_super) {
          _super(message, url, lineNo, charNo, exception);
        }
      };
    });

    var hijackTimeFunc = function (_super) {
      return function (f, t) {
        return _super(self.wrap(f), t);
      };
    };

    polyFill(window, "setTimeout", hijackTimeFunc);
    polyFill(window, "setInterval", hijackTimeFunc);
    if (window.requestAnimationFrame) {
      polyFill(window, "requestAnimationFrame", hijackTimeFunc);
    }

    var hijackEventFunc = function (_super) {
      return function (e, f, capture, secure) {
        if (f && f.handleEvent) {
          f.handleEvent = self.wrap(f.handleEvent, {eventHandler: true});
        }
        return _super.call(this, e, self.wrap(f, {eventHandler: true}), capture, secure);
      };
    };

    // EventTarget is all that's required in modern chrome/opera
    // EventTarget + Window + ModalWindow is all that's required in modern FF (there are a few Moz prefixed ones that we're ignoring)
    // The rest is a collection of stuff for Safari and IE 11. (Again ignoring a few MS and WebKit prefixed things)
    "EventTarget Window Node ApplicationCache AudioTrackList ChannelMergerNode CryptoOperation EventSource FileReader HTMLUnknownElement IDBDatabase IDBRequest IDBTransaction KeyOperation MediaController MessagePort ModalWindow Notification SVGElementInstance Screen TextTrack TextTrackCue TextTrackList WebSocket WebSocketWorker Worker XMLHttpRequest XMLHttpRequestEventTarget XMLHttpRequestUpload".replace(/\w+/g, function (global) {
      var prototype = window[global] && window[global].prototype;
      if (prototype && prototype.hasOwnProperty && prototype.hasOwnProperty("addEventListener")) {
        polyFill(prototype, "addEventListener", hijackEventFunc);
        polyFill(prototype, "removeEventListener", hijackEventFunc);
      }
    });
  }

  return self;

});