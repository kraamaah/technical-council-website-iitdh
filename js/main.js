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

// Neuron-network canvas background: drifting nodes and synapses, with a
// slow parallax shift tied to scroll position so the network feels alive
// as you move down the page.
function initNeuralBackground() {
  var canvas = document.getElementById('neuralBg');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var animate = !reducedMotion;

  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  var width, height, virtualHeight, nodes = [], pulses = [];
  var linkDist = 150;
  var visible = true;

  function rand(min, max) { return min + Math.random() * (max - min); }
  function wrap(v, max) { v = v % max; return v < 0 ? v + max : v; }

  function setup() {
    width = window.innerWidth;
    height = window.innerHeight;
    virtualHeight = height * 2.4;
    canvas.width = Math.round(width * DPR);
    canvas.height = Math.round(height * DPR);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    var count = Math.round((width * virtualHeight) / 42000);
    count = Math.max(22, Math.min(count, 100));
    nodes = [];
    for (var i = 0; i < count; i++) {
      nodes.push({
        x: rand(0, width),
        y: rand(0, virtualHeight),
        vx: rand(-0.06, 0.06),
        vy: rand(-0.05, 0.05),
        r: rand(1.2, 2.6),
        phase: rand(0, Math.PI * 2)
      });
    }
  }

  function maybeSpawnPulse() {
    if (pulses.length > 8 || Math.random() > 0.02 || !nodes.length) return;
    var a = nodes[Math.floor(Math.random() * nodes.length)];
    var best = null, bestD = linkDist;
    for (var i = 0; i < nodes.length; i++) {
      var b = nodes[i];
      if (b === a) continue;
      var dx = a.x - b.x, dy = a.y - b.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestD) { bestD = d; best = b; }
    }
    if (best) pulses.push({ a: a, b: best, t: 0, speed: rand(0.006, 0.014) });
  }

  function frame() {
    if (!visible) return;
    var scrollY = window.scrollY || window.pageYOffset || 0;
    var parallax = scrollY * 0.25;
    var t = Date.now() * 0.001;

    ctx.clearRect(0, 0, width, height);

    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < -5) n.x = width + 5;
      if (n.x > width + 5) n.x = -5;
      n.y = wrap(n.y, virtualHeight);
    }

    ctx.lineWidth = 1;
    for (var i = 0; i < nodes.length; i++) {
      var a = nodes[i];
      var ay = wrap(a.y - parallax, virtualHeight);
      if (ay < -linkDist || ay > height + linkDist) continue;
      for (var j = i + 1; j < nodes.length; j++) {
        var b = nodes[j];
        var by = wrap(b.y - parallax, virtualHeight);
        var dx = a.x - b.x, dy = ay - by;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < linkDist) {
          var alpha = (1 - d / linkDist) * 0.14;
          ctx.strokeStyle = 'rgba(242,101,12,' + alpha.toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(a.x, ay);
          ctx.lineTo(b.x, by);
          ctx.stroke();
        }
      }
    }

    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var ny = wrap(n.y - parallax, virtualHeight);
      if (ny < -10 || ny > height + 10) continue;
      var glow = 0.55 + 0.45 * Math.sin(t * 1.4 + n.phase);
      ctx.beginPath();
      ctx.fillStyle = 'rgba(247,197,72,' + (0.22 * glow).toFixed(3) + ')';
      ctx.arc(n.x, ny, n.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (animate) maybeSpawnPulse();
    for (var i = pulses.length - 1; i >= 0; i--) {
      var p = pulses[i];
      p.t += p.speed;
      if (p.t >= 1) { pulses.splice(i, 1); continue; }
      var ay = wrap(p.a.y - parallax, virtualHeight);
      var by = wrap(p.b.y - parallax, virtualHeight);
      var px = p.a.x + (p.b.x - p.a.x) * p.t;
      var py = ay + (by - ay) * p.t;
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
    resizeTimer = setTimeout(setup, 150);
  });

  setup();
  frame();
}
