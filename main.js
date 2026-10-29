// Automate Great site v5: motion layer. Vanilla JS.
// Off entirely under prefers-reduced-motion (static CSS fallbacks stay).
(function () {
  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var still = reduce || doc.classList.contains('show-all');
  if (!reduce) doc.classList.add('motion');

  /* 1. Kinetic type: wrap each word of h1/h2 in a mask, stagger in. */
  function splitWords(el) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var m = document.createElement('span'); m.className = 'w';
            var s = document.createElement('span'); s.textContent = part;
            s.style.setProperty('--i', i++);
            m.appendChild(s); frag.appendChild(m);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    })(el);
  }
  if (!reduce) document.querySelectorAll('h1.rv, h2.rv').forEach(function (h) { h.classList.add('kt'); splitWords(h); });

  /* 4. Terminal: wrap lines so they can type out (clip, no layout shift). */
  var pre = document.querySelector('.terminal pre');
  if (pre && !reduce) {
    pre.innerHTML = pre.innerHTML.split('\n').map(function (l, i) {
      return '<span class="tl" style="--i:' + i + '">' + l + '</span>';
    }).join('\n');
    pre.closest('.terminal').classList.add('rv-type');
  }

  /* Reveals (also triggers kinetic type + terminal typing via .in). */
  var els = document.querySelectorAll('.rv, .rv-type');
  if (still || !('IntersectionObserver' in window)) {
    els.forEach(function (e) { e.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* 2. Cursor light: pointer:fine only, rAF-throttled CSS vars. */
  if (!reduce && window.matchMedia('(pointer: fine)').matches) {
    var pend = null, raf = 0;
    document.addEventListener('pointermove', function (e) {
      pend = e; if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var t = pend.target.closest && pend.target.closest('.spot');
        if (!t) return;
        var r = t.getBoundingClientRect();
        t.style.setProperty('--mx', (pend.clientX - r.left) + 'px');
        t.style.setProperty('--my', (pend.clientY - r.top) + 'px');
      });
    }, { passive: true });
  }

  /* 3. Glow field: drifting soft light blobs + fine grain, monochrome, faint red. */
  function Field(host, opt) {
    var c = document.createElement('canvas'); c.className = 'field'; c.setAttribute('aria-hidden', 'true');
    host.insertBefore(c, host.firstChild);
    var ctx = c.getContext('2d'), w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var on = false, vis = true, id = 0, t0 = performance.now();
    var blobs = opt.blobs;
    // grain tile, rendered once
    var g = document.createElement('canvas'); g.width = g.height = 128;
    var gx = g.getContext('2d'), im = gx.createImageData(128, 128);
    for (var k = 0; k < im.data.length; k += 4) { var v = Math.random() * 255; im.data[k] = im.data[k + 1] = im.data[k + 2] = v; im.data[k + 3] = Math.random() < 0.5 ? 14 : 0; }
    gx.putImageData(im, 0, 0);
    function size() {
      var r = host.getBoundingClientRect(); w = r.width; h = r.height;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function draw(now) {
      var t = (now - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      blobs.forEach(function (b, i) {
        var x = (b.x + Math.sin(t * b.s + i) * b.d) * w, y = (b.y + Math.cos(t * b.s * 0.8 + i * 2) * b.d) * h;
        var R = b.r * Math.max(w, h * 1.4);
        var gr = ctx.createRadialGradient(x, y, 0, x, y, R);
        gr.addColorStop(0, 'rgba(' + b.c + ',' + b.a + ')'); gr.addColorStop(1, 'rgba(' + b.c + ',0)');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
      });
      ctx.globalCompositeOperation = 'source-over';
      if (doc.classList.contains('capture')) return; // lighter grain in static screenshots only
      ctx.fillStyle = ctx.createPattern(g, 'repeat');
      var ox = (t * 37) % 128, oy = (t * 23) % 128;
      ctx.save(); ctx.translate(-ox, -oy); ctx.fillRect(0, 0, w + 128, h + 128); ctx.restore();
    }
    function loop(now) { draw(now); id = on && vis ? requestAnimationFrame(loop) : 0; }
    function sync() { if (on && vis && !id) id = requestAnimationFrame(loop); }
    size(); draw(performance.now() + 4000); // one good frame immediately (and for static captures)
    if (still) return;
    new IntersectionObserver(function (e) { on = e[0].isIntersecting; sync(); }).observe(host);
    document.addEventListener('visibilitychange', function () { vis = !document.hidden; sync(); });
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { size(); draw(performance.now()); }, 150); });
  }
  if (!reduce && window.HTMLCanvasElement) {
    var W = '243,241,236', RD = '224,38,47';
    var hero = document.querySelector('.hero'), fin = document.querySelector('.final');
    if (hero) Field(hero, { blobs: [
      { x: .5, y: .02, r: .42, d: .06, s: .07, c: W, a: .13 },
      { x: .22, y: .28, r: .26, d: .09, s: .05, c: W, a: .06 },
      { x: .8, y: .22, r: .24, d: .08, s: .06, c: W, a: .06 },
      { x: .7, y: .5, r: .2, d: .1, s: .04, c: RD, a: .035 }] });
    if (fin) Field(fin, { blobs: [
      { x: .5, y: 1.05, r: .45, d: .05, s: .06, c: W, a: .12 },
      { x: .25, y: .8, r: .22, d: .08, s: .05, c: W, a: .05 },
      { x: .8, y: .9, r: .2, d: .08, s: .045, c: RD, a: .03 }] });
  }

  /* Form chips */
  document.querySelectorAll('.chip').forEach(function (c) {
    c.addEventListener('click', function () {
      c.parentNode.querySelectorAll('.chip').forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
      c.setAttribute('aria-pressed', 'true');
    });
  });
  var f = document.querySelector('form'); if (f) f.addEventListener('submit', function (e) {
    e.preventDefault();
    var pick = f.querySelector('.chip[aria-pressed="true"]');
    var body = pick ? 'What I want: ' + pick.textContent.trim() : '';
    window.location.href = 'mailto:info@10outof100.com?subject=' + encodeURIComponent('Automate Great - Book a call') + (body ? '&body=' + encodeURIComponent(body) : '');
  });
})();
