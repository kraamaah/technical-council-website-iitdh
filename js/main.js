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

// Nanoparticle canvas background: a dense field of glowing embers drifts
// in scattered, converges into a folded, textured brain silhouette (with
// gyrus-like fold lines and a brainstem trailing into a falling particle
// stream) by the middle of the page, blooms once fully assembled, then
// disperses again through the back half of the page.
function initNeuralBackground() {
  var canvas = document.getElementById('neuralBg');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var animate = !reducedMotion;

  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  var width, height, cx, cy, baseR, brainPath, stemTip;
  var particles = [], foldSegments = [], pulses = [];
  var visible = true;

  var PALETTE = ['247,197,72', '242,101,12', '255,150,64', '221,43,30'];
  var HUB_COLOR = '255,232,196';

  // Anatomical anchor points for a wide side-profile brain silhouette —
  // frontal lobe front-right, occipital lobe at back, a distinctly
  // separated cerebellum bump, and a long thin brainstem trailing down
  // into the particle stream. Normalized around (0,0), radius ~1, y
  // grows downward.
  var BRAIN_ANCHORS = [
    [0.70, -0.42], [0.48, -0.78], [0.08, -0.92], [-0.32, -0.88],
    [-0.66, -0.66], [-0.86, -0.30], [-0.90, 0.06], [-0.74, 0.24],
    [-0.56, 0.36], [-0.44, 0.28], [-0.32, 0.32], [-0.24, 0.60],
    [-0.14, 0.32], [0.04, 0.30], [0.28, 0.50], [0.50, 0.34],
    [0.68, -0.02], [0.72, -0.24]
  ];
  var STEM_TIP_NORM = [-0.24, 0.60];

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

  // Wavy horizontal bands clipped to the brain silhouette, mimicking
  // the folded gyrus/sulcus texture of a real cortex instead of a
  // flat outline or a generic connect-the-dots network graph.
  function buildFoldSegments() {
    var segs = [];
    var bands = 11;
    for (var k = 0; k < bands; k++) {
      var yN = lerp(-0.78, 0.5, k / (bands - 1));
      var freq = rand(2.4, 3.6);
      var freq2 = rand(5, 7);
      var amp = rand(0.045, 0.09);
      var phase = rand(0, Math.PI * 2);
      var run = [];
      for (var xN = -0.95; xN <= 0.78; xN += 0.035) {
        var yy = yN
          + Math.sin(xN * freq * Math.PI + phase) * amp
          + Math.sin(xN * freq2 * Math.PI + phase * 1.6) * amp * 0.35;
        var px = cx + xN * baseR, py = cy + yy * baseR;
        var inside = ctx.isPointInPath(brainPath, px, py);
        if (inside) {
          run.push([px, py]);
        } else if (run.length > 3) {
          segs.push(run);
          run = [];
        } else {
          run = [];
        }
      }
      if (run.length > 3) segs.push(run);
    }
    return segs;
  }

  // A random point in the scattered ring around the brain, used as the
  // "before assembly" and "after disintegration" resting spots.
  function scatterPoint() {
    var angle = rand(0, Math.PI * 2);
    var radius = baseR * rand(1.3, 2.7);
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
    cy = height * 0.46;
    baseR = Math.min(width, height) * 0.42;
    brainPath = buildBrainPath(baseR, cx, cy);
    stemTip = { x: cx + STEM_TIP_NORM[0] * baseR, y: cy + STEM_TIP_NORM[1] * baseR };
    foldSegments = buildFoldSegments();

    particles = [];

    // Core particles filling the brain silhouette.
    var target = Math.max(110, Math.min(260, Math.round((width * height) / 4200)));
    var attempts = 0;
    while (particles.length < target && attempts < target * 60) {
      attempts++;
      var px = rand(cx - baseR, cx + baseR);
      var py = rand(cy - baseR, cy + baseR);
      if (!ctx.isPointInPath(brainPath, px, py)) continue;
      var isHub = Math.random() < 0.1;
      particles.push({
        tx: px, ty: py, x: px, y: py,
        entry: scatterPoint(), exit: scatterPoint(),
        r: isHub ? rand(2.6, 3.6) : rand(0.8, 2.1),
        phase: rand(0, Math.PI * 2),
        hub: isHub,
        color: isHub ? HUB_COLOR : PALETTE[Math.floor(Math.random() * PALETTE.length)]
      });
    }

    // A trailing stream of particles falling from the brainstem tip,
    // widening into a scattered pool further down the page.
    var streamCount = Math.round(target * 0.35);
    var streamLength = baseR * 1.9;
    for (var i = 0; i < streamCount; i++) {
      var t = Math.pow(Math.random(), 0.8);
      var spread = lerp(0.03, 0.85, t) * baseR;
      var tx = stemTip.x + rand(-1, 1) * spread;
      var ty = stemTip.y + t * streamLength + rand(-6, 6);
      var isHub2 = Math.random() < 0.06;
      particles.push({
        tx: tx, ty: ty, x: tx, y: ty,
        entry: scatterPoint(), exit: scatterPoint(),
        r: isHub2 ? rand(2.2, 3) : rand(0.7, 1.8),
        phase: rand(0, Math.PI * 2),
        hub: isHub2,
        color: isHub2 ? HUB_COLOR : PALETTE[Math.floor(Math.random() * PALETTE.length)]
      });
    }
  }

  function scrollProgress() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    if (max <= 0) return 0.5;
    var top = window.scrollY || doc.scrollTop || 0;
    return Math.min(1, Math.max(0, top / max));
  }

  function maybeSpawnPulse() {
    if (pulses.length > 6 || Math.random() > 0.02 || !foldSegments.length) return;
    var seg = foldSegments[Math.floor(Math.random() * foldSegments.length)];
    if (seg.length < 4) return;
    pulses.push({ seg: seg, t: 0, speed: rand(0.006, 0.012) });
  }

  function frame() {
    if (!visible) return;
    var progress = reducedMotion ? 0.5 : scrollProgress();
    var t = Date.now() * 0.001;
    var assembly = easeInOut(clamp01(assemblyOf(progress)));
    // how tightly the particles are holding their brain positions —
    // used to fade the fold texture and outline in only once mostly arrived
    var cohesion = clamp01((assembly - 0.55) / 0.45);
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

    // Soft ambient halo behind the whole shape once it's mostly formed.
    if (cohesion > 0.02) {
      var halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 1.5);
      halo.addColorStop(0, 'rgba(242,101,12,' + (0.1 * cohesion).toFixed(3) + ')');
      halo.addColorStop(1, 'rgba(242,101,12,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // One-time brighter bloom exactly at full assembly.
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
      // Faint gyrus/sulcus fold texture across the cortex.
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(247,197,72,' + (0.16 * cohesion + 0.12 * flash).toFixed(3) + ')';
      for (var i = 0; i < foldSegments.length; i++) {
        var seg = foldSegments[i];
        ctx.beginPath();
        ctx.moveTo(seg[0][0], seg[0][1]);
        for (var j = 1; j < seg.length; j++) ctx.lineTo(seg[j][0], seg[j][1]);
        ctx.stroke();
      }

      // Trace the outer silhouette so the shape reads clearly even
      // where the particle cloud alone leaves gaps.
      ctx.save();
      ctx.strokeStyle = 'rgba(247,197,72,' + (0.24 * cohesion + 0.25 * flash).toFixed(3) + ')';
      ctx.lineWidth = 1.4;
      ctx.shadowColor = 'rgba(255,150,40,0.6)';
      ctx.shadowBlur = 8 * cohesion;
      ctx.stroke(brainPath);
      ctx.restore();
    }

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var glow = 0.6 + 0.4 * Math.sin(t * 1.6 + p.phase);
      var base = p.hub ? 0.45 : 0.22;
      var alpha = (base + 0.35 * assembly) * glow + flash * 0.3;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(' + p.color + ',' + Math.min(1, alpha).toFixed(3) + ')';
      if (assembly > 0.25) {
        ctx.shadowColor = 'rgba(' + p.color + ',0.9)';
        ctx.shadowBlur = (p.hub ? 6 : 3) + 4 * assembly + 6 * flash;
      }
      ctx.arc(p.x, p.y, p.r + flash * 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (animate && cohesion > 0.4) maybeSpawnPulse();
    for (var i = pulses.length - 1; i >= 0; i--) {
      var pu = pulses[i];
      pu.t += pu.speed;
      if (pu.t >= 1) { pulses.splice(i, 1); continue; }
      var idx = pu.t * (pu.seg.length - 1);
      var i0 = Math.floor(idx), frac = idx - i0;
      var a = pu.seg[i0], b = pu.seg[Math.min(i0 + 1, pu.seg.length - 1)];
      var px = lerp(a[0], b[0], frac), py = lerp(a[1], b[1], frac);
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,220,150,0.95)';
      ctx.shadowColor = 'rgba(255,180,60,0.95)';
      ctx.shadowBlur = 8;
      ctx.arc(px, py, 1.8, 0, Math.PI * 2);
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
