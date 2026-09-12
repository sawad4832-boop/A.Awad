/* ==========================================================================
   A.AWAD BAUSERVICE — Interaktion
   Vanilla JS, keine externen Abhängigkeiten, keine Tracker.
   ========================================================================== */
(function () {
  'use strict';

  /* ----------------------------------------------------------------------
     KONFIGURATION — hier bei Bedarf anpassen
     ----------------------------------------------------------------------
     FORM_ENDPOINT: URL eines Formular-Dienstes (z. B. Formspree, Netlify,
     eigenes PHP-Skript). Bleibt der Wert leer, öffnet das Formular statt-
     dessen das E-Mail-Programm des Besuchers mit vorausgefüllter Nachricht.
     Dadurch funktioniert das Formular sofort, ganz ohne Server.
     -------------------------------------------------------------------- */
  var FORM_ENDPOINT = '';
  var CONTACT_MAIL  = 'info@bauservice-awad.de';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ----------------------------------------------------------------------
     1. Mobile Navigation
     -------------------------------------------------------------------- */
  var toggle = $('.nav__toggle');
  var mnav   = $('.mobile-nav');

  function closeNav() {
    if (!toggle || !mnav) return;
    toggle.setAttribute('aria-expanded', 'false');
    mnav.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  /* Der Kopfbereich ist je nach Displaybreite unterschiedlich hoch (die obere
     Infoleiste kann umbrechen). Deshalb messen wir die tatsächliche Höhe,
     damit der erste Menüpunkt nicht darunter verschwindet. */
  function syncNavOffset() {
    var head = document.querySelector('.header');
    if (!head || !mnav) return;
    var bottom = head.getBoundingClientRect().bottom;
    mnav.style.setProperty('--nav-offset', Math.max(0, Math.round(bottom)) + 'px');
  }

  if (toggle && mnav) {
    window.addEventListener('resize', syncNavOffset);
    syncNavOffset();

    toggle.addEventListener('click', function () {
      syncNavOffset();
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      mnav.classList.toggle('is-open', !open);
      document.body.style.overflow = open ? '' : 'hidden';
    });
    $$('a', mnav).forEach(function (a) { a.addEventListener('click', closeNav); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });
  }

  /* ----------------------------------------------------------------------
     2. Kopfzeile beim Scrollen + mobiler Kontaktbalken
     -------------------------------------------------------------------- */
  var header  = $('.header');
  var callbar = $('.callbar');
  var lastY = 0, ticking = false;

  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle('is-stuck', y > 8);
    if (callbar) callbar.classList.toggle('is-visible', y > 560);
    lastY = y;
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ----------------------------------------------------------------------
     3. Einblenden beim Scrollen
     -------------------------------------------------------------------- */
  var revealables = $$('.reveal');
  if (revealables.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealables.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      revealables.forEach(function (el) { io.observe(el); });
    }
  }

  /* ----------------------------------------------------------------------
     4. Galerie-Lightbox
     -------------------------------------------------------------------- */
  var gitems = $$('.gallery__item[data-full]');
  if (gitems.length) {
    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Projektbild in Großansicht');
    lb.innerHTML =
      '<button class="lightbox__close" type="button" aria-label="Großansicht schließen">&times;</button>' +
      '<div><img alt=""><p class="lightbox__cap"></p></div>';
    document.body.appendChild(lb);

    var lbImg = $('img', lb), lbCap = $('.lightbox__cap', lb), lbClose = $('.lightbox__close', lb);
    var opener = null;

    function openLb(btn) {
      opener = btn;
      lbImg.src = btn.getAttribute('data-full');
      lbImg.alt = btn.getAttribute('data-alt') || '';
      lbCap.textContent = btn.getAttribute('data-caption') || '';
      lb.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      // Erst fokussieren, wenn die Lightbox tatsächlich sichtbar ist –
      // ein Element mit visibility:hidden nimmt keinen Fokus an.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { lbClose.focus(); });
      });
    }
    function closeLb() {
      lb.classList.remove('is-open');
      document.body.style.overflow = '';
      if (opener) { opener.focus(); opener = null; }
    }

    gitems.forEach(function (btn) {
      btn.addEventListener('click', function () { openLb(btn); });
    });
    lbClose.addEventListener('click', closeLb);
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lb.classList.contains('is-open')) closeLb();
      if (e.key === 'Tab' && lb.classList.contains('is-open')) { e.preventDefault(); lbClose.focus(); }
    });
  }

  /* ----------------------------------------------------------------------
     5. Kontaktformular
     -------------------------------------------------------------------- */
  var form = $('#kontaktformular');
  if (form) {
    var status = $('.form__status', form);

    function setError(field, msg) {
      var wrap = field.closest('.field') || field.parentElement;
      var box = wrap ? wrap.querySelector('.field__err') : null;
      if (box) box.textContent = msg || '';
      field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    }

    function validate() {
      var ok = true, firstBad = null;
      $$('[required]', form).forEach(function (field) {
        var val = (field.value || '').trim();
        var msg = '';
        if (field.type === 'checkbox') {
          if (!field.checked) msg = 'Bitte bestätigen Sie die Datenschutzhinweise.';
        } else if (!val) {
          msg = 'Bitte füllen Sie dieses Feld aus.';
        } else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(val)) {
          msg = 'Bitte geben Sie eine gültige E-Mail-Adresse an.';
        } else if (field.type === 'tel' && val.replace(/[^0-9]/g, '').length < 6) {
          msg = 'Bitte geben Sie eine gültige Telefonnummer an.';
        }
        setError(field, msg);
        if (msg) { ok = false; if (!firstBad) firstBad = field; }
      });
      if (firstBad) firstBad.focus();
      return ok;
    }

    $$('input, textarea, select', form).forEach(function (field) {
      field.addEventListener('blur', function () {
        if (field.hasAttribute('required')) {
          var v = (field.value || '').trim();
          if (field.type === 'checkbox' ? field.checked : v) setError(field, '');
        }
      });
    });

    function show(state, msg) {
      if (!status) return;
      status.hidden = false;
      status.setAttribute('data-state', state);
      status.textContent = msg;
      status.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    function buildMailto(data) {
      var lines = [
        'Name: '      + (data.name || '–'),
        'E-Mail: '    + (data.email || '–'),
        'Telefon: '   + (data.telefon || '–'),
        'Ort/PLZ: '   + (data.ort || '–'),
        'Leistung: '  + (data.leistung || '–'),
        '',
        'Nachricht:',
        data.nachricht || '–'
      ];
      return 'mailto:' + CONTACT_MAIL +
             '?subject=' + encodeURIComponent('Anfrage über die Website – ' + (data.leistung || 'Bauservice')) +
             '&body='    + encodeURIComponent(lines.join('\n'));
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) { show('err', 'Bitte prüfen Sie die markierten Felder.'); return; }

      var fd = new FormData(form);
      if ((fd.get('website') || '') !== '') return;   // Spam-Falle

      var data = {};
      fd.forEach(function (v, k) { data[k] = v; });

      var btn = $('button[type="submit"]', form);
      var label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Wird gesendet …'; }

      function done(state, msg) {
        if (btn) { btn.disabled = false; btn.textContent = label; }
        show(state, msg);
      }

      if (FORM_ENDPOINT) {
        fetch(FORM_ENDPOINT, {
          method: 'POST',
          body: fd,
          headers: { Accept: 'application/json' }
        }).then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          form.reset();
          done('ok', 'Vielen Dank für Ihre Anfrage! Wir melden uns in der Regel innerhalb von 24 Stunden bei Ihnen.');
        }).catch(function () {
          done('err', 'Das Formular konnte nicht gesendet werden. Bitte rufen Sie uns an: 0176 41949447.');
        });
      } else {
        window.location.href = buildMailto(data);
        done('ok', 'Ihr E-Mail-Programm wurde geöffnet – bitte senden Sie die vorbereitete Nachricht ab. ' +
                   'Alternativ erreichen Sie uns direkt unter 0176 41949447.');
      }
    });
  }

  /* ----------------------------------------------------------------------
     6. Aktiven Menüpunkt beim Scrollen markieren (nur Startseite)
     -------------------------------------------------------------------- */
  var sectionLinks = $$('.nav__link[href^="#"]');
  if (sectionLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    sectionLinks.forEach(function (link) {
      var el = document.getElementById(link.getAttribute('href').slice(1));
      if (el) map[el.id] = link;
    });
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = map[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          sectionLinks.forEach(function (l) { l.removeAttribute('aria-current'); });
          link.setAttribute('aria-current', 'page');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { so.observe(document.getElementById(id)); });
  }

  /* ----------------------------------------------------------------------
     7. Jahreszahl im Fußbereich
     -------------------------------------------------------------------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
