export function PolyfillScript() {
  const code = `
(function() {
  // polyfill globalThis (Chrome < 71)
  if (typeof globalThis === 'undefined') {
    Object.defineProperty(Object.prototype, '__gt', {get:function(){return this},configurable:true});
    var g = (function(){return this}).__gt;
    delete Object.prototype.__gt;
    g.globalThis = g;
  }
  // polyfill Object.hasOwn (Chrome < 93). React 19 expects it.
  if (!Object.hasOwn) {
    Object.hasOwn = function(obj, prop) {
      return Object.prototype.hasOwnProperty.call(obj, prop);
    };
  }

  var debugEnabled = false;
  try {
    debugEnabled =
      window.location.search.indexOf('debug=1') !== -1 ||
      window.localStorage.getItem('mathDetectiveDebug') === '1';
  } catch (_) {}

  if (!debugEnabled) return;

  // Debug-only early error capture. This must stay hidden in normal production use.
  window.__earlyErrors = [];
  window.addEventListener('error', function(e) {
    window.__earlyErrors.push(e.target === window
      ? {type:'js',msg:e.message,line:e.lineno}
      : {type:'load',tag:e.target.tagName,src:e.target.src||''}
    );
    var el = document.getElementById('__err');
    if (el) el.textContent = window.__earlyErrors.map(function(x){return JSON.stringify(x)}).join('\\n');
  }, true);
  window.addEventListener('unhandledrejection', function(e) {
    window.__earlyErrors.push({type:'promise',reason:String(e.reason)});
  });

  setTimeout(function() {
    var m = document.querySelector('main');
    if (!m || m.children.length === 0) {
      window.__earlyErrors.push({type:'timeout',msg:'No main content after 5s'});
    }
  }, 5000);

  // show errors
  var errEl = document.createElement('div');
  errEl.id = '__err';
  errEl.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#c00;color:#fff;padding:8px 12px;z-index:99999;font-size:11px;white-space:pre-wrap;max-height:45vh;overflow:auto;font-family:monospace;display:none;';
  document.body.appendChild(errEl);
  setInterval(function() {
    if (window.__earlyErrors && window.__earlyErrors.length > 0) {
      errEl.style.display = 'block';
      errEl.textContent = window.__earlyErrors.map(function(x){return JSON.stringify(x)}).join('\\n');
    }
  }, 1000);

  // status indicator
  var start = Date.now();
  var st = document.createElement('div');
  st.id = '__st';
  st.style.cssText = 'position:fixed;bottom:50px;left:10px;background:rgba(0,0,0,0.85);color:#0f0;padding:4px 10px;border-radius:4px;font-size:10px;z-index:99998;font-family:monospace;';
  st.textContent = 'polyfills loaded';
  document.body.appendChild(st);

  var logs = [];
  window.__debugLog = function(msg) {
    logs.push(msg);
    st.textContent = 'JS: ' + logs.slice(-2).join(' | ');
  };

  setInterval(function() {
    var s = Math.floor((Date.now() - start) / 1000);
    if (logs.length === 0) {
      st.textContent = s + 's (no JS log)';
    }
    if (s > 15) {
      st.textContent = 'TIMEOUT ' + s + 's | ' + (logs.slice(-2).join(' | ') || 'none');
      st.style.background = 'rgba(200,0,0,0.9)';
      st.style.color = '#fff';
    }
  }, 2000);

  var obs = new MutationObserver(function() {
    var m = document.querySelector('main');
    if (m && m.textContent && m.textContent.length > 80) {
      st.textContent = 'OK (' + Math.floor((Date.now()-start)/1000) + 's)';
      st.style.background = 'rgba(0,128,0,0.9)';
      setTimeout(function() { st.remove(); }, 3000);
      obs.disconnect();
    }
  });
  var target = document.querySelector('main') || document.body;
  obs.observe(target, {childList:true,subtree:true,characterData:true});
})();
`.trim();

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
