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
});
