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

// Nanoparticle canvas background: glowing orange/gold specks drift in
// scattered, converge into a recognizable side-profile brain silhouette
// by the middle of the page, flash once when fully assembled, then fly
// apart again as you scroll into the back half of the page.
function initNeuralBackground() {
  var canvas = document.getElementById('neuralBg');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var animate = !reducedMotion;

  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  var width, height, cx, cy, baseR, linkDist, brainPath;
  var particles = [], edges = [], pulses = [];
  var visible = true;

  var PALETTE = ['247,197,72', '242,101,12', '255,150,64', '221,43,30'];

  // Anatomical anchor points for a side-profile brain silhouette —
  // frontal lobe front-right, occipital lobe + cerebellum + a short
  // brainstem stub at back-left, temporal lobe bulge underneath the
  // front. Normalized around (0,0) with radius ~1; y grows downward.
  var BRAIN_ANCHORS = [
    [0.62, -0.62], [0.30, -0.88], [-0.10, -0.95], [-0.50, -0.80],
    [-0.78, -0.45], [-0.82, -0.05], [-0.68, 0.22], [-0.48, 0.38],
    [-0.30, 0.40], [-0.22, 0.64], [-0.12, 0.40], [0.05, 0.38],
    [0.32, 0.58], [0.55, 0.42], [0.68, 0.05], [0.66, -0.30]
  ];

  function rand(min, max) { return min + Math.random() * (max - min); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) { return t * t * (3 - 2 * t); }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  // Triangular timeline: 0 at the top of the page, 1 exactly at the
  // midpoint (fully assembled brain), back to 0 at the bottom.
  function assemblyOf(progress) {
    return progress <= 0.5 ? progress / 0.5 : (1 - progress) / 0.5;
  }

  // Smooth closed Catmull-Rom spline through the anchor points, built
  // as a Path2D so we can both fill-test particle placement against it
  // and stroke its outline once the brain is mostly assembled.
  function buildBrainPath(scale, offX, offY) {
    var pts = BRAIN_ANCHORS.map(function (p) { return [offX + p[0] * scale, offY + p[1] * scale]; });
    var n = pts.length;
    var path = new Path2D();
    path.moveTo(pts[0][0], pts[0][1]);
    for (var i = 0; i < n; i++) {
      var p0 = pts[(i - 1 + n) % n];
      var p1 = pts[i];
      var p2 = pts[(i + 1) % n];
      var p3 = pts[(i + 2) % n];
      var c1x = p1[0] + (p2[0] - p0[0]) / 6;
      var c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6;
      var c2y = p2[1] - (p3[1] - p1[1]) / 6;
      path.bezierCurveTo(c1x, c1y, c2x, c2y, p2[0], p2[1]);
    }
    path.closePath();
    return path;
  }

  // A random point in the scattered ring around the brain, used as the
  // "before assembly" and "after disintegration" resting spots.
  function scatterPoint() {
    var angle = rand(0, Math.PI * 2);
    var radius = baseR * rand(1.3, 2.6);
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius * 0.75 };
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
    baseR = Math.min(width, height) * 0.44;
    linkDist = baseR * 0.15;
    brainPath = buildBrainPath(baseR, cx, cy);

    var target = Math.max(70, Math.min(170, Math.round((width * height) / 6500)));
    particles = [];
    var attempts = 0;
    while (particles.length < target && attempts < target * 60) {
      attempts++;
      var px = rand(cx - baseR, cx + baseR);
      var py = rand(cy - baseR, cy + baseR);
      if (!ctx.isPointInPath(brainPath, px, py)) continue;
      particles.push({
        tx: px, ty: py,
        x: px, y: py,
        entry: scatterPoint(),
        exit: scatterPoint(),
        r: rand(1.3, 2.8),
        phase: rand(0, Math.PI * 2),
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)]
      });
    }

    edges = [];
    for (var i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        var d = Math.hypot(particles[i].tx - particles[j].tx, particles[i].ty - particles[j].ty);
        if (d < linkDist) edges.push({ a: particles[i], b: particles[j], d: d });
      }
    }
  }

  function scrollProgress() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    if (max <= 0) return 0.5;
    var top = window.scrollY || doc.scrollTop || 0;
    return Math.min(1, Math.max(0, top / max));
  }

  function maybeSpawnPulse(cohesion) {
    if (pulses.length > 10 || Math.random() > 0.035 || !edges.length) return;
    var e = edges[Math.floor(Math.random() * edges.length)];
    pulses.push({ a: e.a, b: e.b, t: 0, speed: rand(0.01, 0.02) });
  }

  function frame() {
    if (!visible) return;
    var progress = reducedMotion ? 0.5 : scrollProgress();
    var t = Date.now() * 0.001;
    var assembly = easeInOut(clamp01(assemblyOf(progress)));
    // how tightly the particles are holding their brain positions —
    // used to fade connecting lines in only once they've mostly arrived
    var cohesion = clamp01((assembly - 0.6) / 0.4);
    // a short-lived bloom right as the brain finishes forming
    var flash = Math.max(0, 1 - Math.abs(progress - 0.5) / 0.045);

    ctx.clearRect(0, 0, width, height);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var base = progress <= 0.5
        ? { x: lerp(p.entry.x, p.tx, assembly), y: lerp(p.entry.y, p.ty, assembly) }
        : { x: lerp(p.tx, p.exit.x, 1 - assembly), y: lerp(p.ty, p.exit.y, 1 - assembly) };
      var jitter = animate ? 1 : 0;
      p.x = base.x + Math.sin(t * 0.7 + p.phase) * 1.1 * jitter;
      p.y = base.y + Math.cos(t * 0.6 + p.phase) * 1.1 * jitter;
    }

    if (flash > 0.02) {
      var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 1.35);
      grad.addColorStop(0, 'rgba(255,196,64,' + (0.3 * flash).toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(255,150,40,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 1.35, 0, Math.PI * 2);
      ctx.fill();
    }

    if (cohesion > 0.01) {
      // Trace the actual brain silhouette so the shape reads clearly
      // even where the particle cloud alone leaves gaps.
      ctx.save();
      ctx.strokeStyle = 'rgba(247,197,72,' + (0.22 * cohesion + 0.25 * flash).toFixed(3) + ')';
      ctx.lineWidth = 1.4;
      ctx.shadowColor = 'rgba(255,150,40,0.6)';
      ctx.shadowBlur = 8 * cohesion;
      ctx.stroke(brainPath);
      ctx.restore();

      ctx.lineWidth = 1;
      for (var i = 0; i < edges.length; i++) {
        var e = edges[i];
        var alpha = (1 - e.d / linkDist) * 0.32 * cohesion;
        if (alpha <= 0.005) continue;
        ctx.strokeStyle = 'rgba(242,101,12,' + alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(e.a.x, e.a.y);
        ctx.lineTo(e.b.x, e.b.y);
        ctx.stroke();
      }
    }

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var glow = 0.6 + 0.4 * Math.sin(t * 1.6 + p.phase);
      var alpha = (0.25 + 0.35 * assembly) * glow + flash * 0.35;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(' + p.color + ',' + Math.min(1, alpha).toFixed(3) + ')';
      if (assembly > 0.3) {
        ctx.shadowColor = 'rgba(' + p.color + ',0.9)';
        ctx.shadowBlur = 4 + 4 * assembly + 6 * flash;
      }
      ctx.arc(p.x, p.y, p.r + flash * 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (animate && cohesion > 0.3) maybeSpawnPulse(cohesion);
    for (var i = pulses.length - 1; i >= 0; i--) {
      var pu = pulses[i];
      pu.t += pu.speed;
      if (pu.t >= 1) { pulses.splice(i, 1); continue; }
      var px = pu.a.x + (pu.b.x - pu.a.x) * pu.t;
      var py = pu.a.y + (pu.b.y - pu.a.y) * pu.t;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,196,64,0.9)';
      ctx.shadowColor = 'rgba(255,150,40,0.95)';
      ctx.shadowBlur = 7;
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
