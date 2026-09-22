// IIT Dharwad Technical Council — shared behavior

document.addEventListener('DOMContentLoaded', function () {
  // Mobile nav toggle
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // Close the menu after a link is tapped
    links.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        links.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Contact form: no backend yet — swap in your own endpoint below.
  var form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      // TODO: replace with a real submit — e.g. fetch('/api/contact', { method: 'POST', body: new FormData(form) })
      var note = form.querySelector('.form-note');
      if (note) {
        note.textContent = 'Thanks — this form is not wired up to anything yet. Connect it to an endpoint in js/main.js.';
        note.style.color = 'var(--gold)';
      }
    });
  }

  // Highlight the current page in the nav
  var here = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(function (link) {
    if (link.getAttribute('href') === here) {
      link.classList.add('is-active');
    }
  });

  initNeuralBackground();
});

// Neuron-network canvas background shaped like a brain (two wobbly,
// folded lobes). Nodes are revealed outward from the centre as the page
// scrolls, so the brain visibly "synthesizes" itself while you scroll
// down, and un-synthesizes if you scroll back up.
function initNeuralBackground() {
  var canvas = document.getElementById('neuralBg');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var animate = !reducedMotion;

  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  var width, height, cx, cy, baseR, linkDist;
  var nodes = [], edges = [], pulses = [];
  var visible = true;

  function rand(min, max) { return min + Math.random() * (max - min); }

  // Wobbly lobe radius so the silhouette reads as folded brain matter
  // rather than a plain circle. Coefficients are fixed per lobe seed so
  // the shape stays put across frames.
  function lobeFactor(theta, seed) {
    return 1
      + 0.16 * Math.sin(4 * theta + seed)
      + 0.10 * Math.sin(7 * theta + seed * 1.7)
      + 0.06 * Math.sin(11 * theta + seed * 2.3);
  }

  function lobes() {
    return [
      { x: cx - baseR * 0.5, y: cy, seed: 1.3 },
      { x: cx + baseR * 0.5, y: cy, seed: 4.1 }
    ];
  }

  function insideBrain(px, py) {
    var ls = lobes();
    for (var i = 0; i < ls.length; i++) {
      var l = ls[i];
      var dx = px - l.x, dy = (py - l.y) * 1.15;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var theta = Math.atan2(dy, dx);
      var r = baseR * 0.6 * lobeFactor(theta, l.seed);
      if (dist < r) return true;
    }
    return false;
  }

  function setup() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * DPR);
    canvas.height = Math.round(height * DPR);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    cx = width * 0.5;
    cy = height * 0.48;
    baseR = Math.min(width, height) * 0.42;
    linkDist = baseR * 0.16;

    var target = Math.max(60, Math.min(180, Math.round((width * height) / 6000)));
    nodes = [];
    var attempts = 0;
    while (nodes.length < target && attempts < target * 50) {
      attempts++;
      var px = rand(cx - baseR * 1.05, cx + baseR * 1.05);
      var py = rand(cy - baseR * 0.85, cy + baseR * 0.85);
      if (!insideBrain(px, py)) continue;
      var distNorm = Math.min(1, Math.hypot(px - cx, py - cy) / baseR);
      nodes.push({
        baseX: px, baseY: py, x: px, y: py,
        r: rand(1.3, 2.8),
        phase: rand(0, Math.PI * 2),
        revealAt: Math.min(1, Math.max(0, distNorm * 0.9 + rand(-0.06, 0.06)))
      });
    }

    edges = [];
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
        if (d < linkDist) {
          edges.push({ a: nodes[i], b: nodes[j], d: d, revealAt: Math.max(nodes[i].revealAt, nodes[j].revealAt) });
        }
      }
    }
  }

  function scrollProgress() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    if (max <= 0) return 1;
    var top = window.scrollY || doc.scrollTop || 0;
    return Math.min(1, Math.max(0, top / max));
  }

  function maybeSpawnPulse(progress) {
    if (pulses.length > 10 || Math.random() > 0.035 || !edges.length) return;
    var active = [];
    for (var i = 0; i < edges.length; i++) {
      if (edges[i].revealAt <= progress) active.push(edges[i]);
    }
    if (!active.length) return;
    var e = active[Math.floor(Math.random() * active.length)];
    pulses.push({ a: e.a, b: e.b, t: 0, speed: rand(0.008, 0.018) });
  }

  function frame() {
    if (!visible) return;
    var progress = reducedMotion ? 1 : scrollProgress();
    var t = Date.now() * 0.001;

    ctx.clearRect(0, 0, width, height);

    if (animate) {
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x = n.baseX + Math.sin(t * 0.6 + n.phase) * 1.2;
        n.y = n.baseY + Math.cos(t * 0.5 + n.phase) * 1.2;
      }
    }

    ctx.lineWidth = 1;
    for (var i = 0; i < edges.length; i++) {
      var e = edges[i];
      if (e.revealAt > progress) continue;
      var edgeFade = Math.min(1, (progress - e.revealAt) * 6 + 0.15);
      var alpha = (1 - e.d / linkDist) * 0.3 * edgeFade;
      ctx.strokeStyle = 'rgba(242,101,12,' + alpha.toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(e.a.x, e.a.y);
      ctx.lineTo(e.b.x, e.b.y);
      ctx.stroke();
    }

    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.revealAt > progress) continue;
      var nodeFade = Math.min(1, (progress - n.revealAt) * 6 + 0.2);
      var glow = 0.55 + 0.45 * Math.sin(t * 1.4 + n.phase);
      ctx.beginPath();
      ctx.fillStyle = 'rgba(247,197,72,' + (0.42 * glow * nodeFade).toFixed(3) + ')';
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (animate) maybeSpawnPulse(progress);
    for (var i = pulses.length - 1; i >= 0; i--) {
      var p = pulses[i];
      p.t += p.speed;
      if (p.t >= 1) { pulses.splice(i, 1); continue; }
      var px = p.a.x + (p.b.x - p.a.x) * p.t;
      var py = p.a.y + (p.b.y - p.a.y) * p.t;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,196,64,0.85)';
      ctx.shadowColor = 'rgba(255,150,40,0.9)';
      ctx.shadowBlur = 6;
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (animate) requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', function () {
    visible = !document.hidden;
    if (visible && animate) requestAnimationFrame(frame);
  });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { setup(); frame(); }, 150);
  });

  setup();
  frame();
}
