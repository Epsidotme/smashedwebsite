/* ===========================
   COUNTDOWN (DST-safe)
=========================== */
(() => {
  const TZ = 'Europe/Stockholm'; // schedule source timezone
  const START_H = 21;            // Saturday 21:00 Stockholm
  const END_H   = 10;            // Sunday   10:00 Stockholm (adjust if you want)

  const $label = document.getElementById('ec-label');
  const $eta   = document.getElementById('ec-eta');

  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });

  function partsInTZ(date) {
    const map = {};
    for (const {type, value} of dtf.formatToParts(date)) map[type] = value;
    return {year:+map.year, month:+map.month, day:+map.day, hour:+map.hour, minute:+map.minute, second:+map.second};
  }

  function zonedTimeToDate(y, m, d, h=0, min=0, s=0) {
    let t = Date.UTC(y, m - 1, d, h, min, s);
    for (let i=0;i<3;i++){
      const p = partsInTZ(new Date(t));
      const wallNow = Date.UTC(p.year, p.month-1, p.day, p.hour, p.minute, p.second);
      const wallWant = Date.UTC(y, m-1, d, h, min, s);
      const diff = wallWant - wallNow;
      if (!diff) break;
      t += diff;
    }
    return new Date(t);
  }

  const addDays = (date, days) => new Date(date.getTime() + days*86400000);

 function nextWindow(now = new Date()) {
  // Calendar day in Stockholm
  const pNow = partsInTZ(now);
  const midnightSE = zonedTimeToDate(pNow.year, pNow.month, pNow.day, 0, 0, 0);

  // Weekday name in Stockholm (0..6 mapping)
  const dowName = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short' }).format(midnightSE);
  const dow = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(dowName);

  // This Saturday (Stockholm)
  const thisSatMid = addDays(midnightSE, (6 - dow + 7) % 7);
  const satP = partsInTZ(thisSatMid);

  // Start/End for THIS week
  const startThis = zonedTimeToDate(satP.year, satP.month, satP.day, START_H, 0, 0);

  const sp = partsInTZ(startThis);
  const sundayMid = zonedTimeToDate(sp.year, sp.month, sp.day, 0, 0, 0);
  const sunday = addDays(sundayMid, 1);
  const pSun = partsInTZ(sunday);
  const endThis = zonedTimeToDate(pSun.year, pSun.month, pSun.day, END_H, 0, 0);

  // If we're already past THIS week's end, move to NEXT week
  if (now >= endThis) {
    const nextSatMid = addDays(thisSatMid, 7);
    const pNext = partsInTZ(nextSatMid);
    const startNext = zonedTimeToDate(pNext.year, pNext.month, pNext.day, START_H, 0, 0);

    const spN = partsInTZ(startNext);
    const sunMidN = zonedTimeToDate(spN.year, spN.month, spN.day, 0, 0, 0);
    const sundayN = addDays(sunMidN, 1);
    const pSunN = partsInTZ(sundayN);
    const endNext = zonedTimeToDate(pSunN.year, pSunN.month, pSunN.day, END_H, 0, 0);

    return { start: startNext, end: endNext };
  }

  // Otherwise, we’re in THIS week (either before start or currently live)
  return { start: startThis, end: endThis };
}



  const fmtLocal = (dt) => dt.toLocaleString(undefined, {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  function formatDHMS(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return (d ? d + 'd ' : '') + pad(h) + ':' + pad(m) + ':' + pad(ss);
  }

  function tick() {
    const now = new Date();
    let { start, end } = nextWindow(now);

    if (now < start) {
      $label.textContent = 'Next Feature Night';
      $eta.innerHTML =
        `Starts <span class="text-white/90">${fmtLocal(start)}</span> — ` +
        `Ends <span class="text-white/90">${fmtLocal(end)}</span><br>` +
        `<span class="text-pink-400">Countdown: ${formatDHMS(start - now)}</span>`;
    } else if (now >= start && now < end) {
      $label.textContent = 'Event is LIVE';
      $eta.innerHTML =
        `Ends <span class="text-white/90">${fmtLocal(end)}</span><br>` +
        `<span class="text-pink-400">Time remaining: ${formatDHMS(end - now)}</span>`;
    } else {
      const after = new Date(end.getTime() + 1000);
      const nxt = nextWindow(after);
      $label.textContent = 'Next Feature Night';
      $eta.innerHTML =
        `Starts <span class="text-white/90">${fmtLocal(nxt.start)}</span> — ` +
        `Ends <span class="text-white/90">${fmtLocal(nxt.end)}</span><br>` +
        `<span class="text-pink-400">Countdown: ${formatDHMS(nxt.start - now)}</span>`;
    }
  }

  const $localSpan = document.getElementById('local-event-time');
  if ($localSpan) {
    // Show “Saturday 9:00 PM XYZ” in the viewer's local zone
    const { start } = nextWindow(new Date());
    const localFmt = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
    $localSpan.textContent = localFmt.format(start);
  }

  tick();
  setInterval(tick, 1000);
  
  // Helpers to show/hide toast
function showLiveToast(start, end) {
  const root = document.getElementById('live-toast-root');
  if (!root) return;
  if (root.firstChild) return; // already showing

  const div = document.createElement('div');
  div.className = 'live-toast';
  div.innerHTML = `
    <span class="dot"></span>
    <div class="txt"><strong>Event is LIVE</strong> — ends ${fmtLocal(end)}</div>
  `;
  root.appendChild(div);
}
function hideLiveToast() {
  const root = document.getElementById('live-toast-root');
  if (!root || !root.firstChild) return;
  root.removeChild(root.firstChild);
}

function tick() {
  const now = new Date();
  let { start, end } = nextWindow(now);

  const card = document.getElementById('event-countdown');
  const labelEl = document.getElementById('ec-label');
  const etaEl   = document.getElementById('ec-eta');

  if (!card || !labelEl || !etaEl) return;

  if (now < start) {
    // PRE-EVENT: normal countdown
    card.classList.remove('live');
    hideLiveToast();

    labelEl.innerHTML = 'Next Feature Night';
    etaEl.innerHTML =
      `Starts <span class="text-white/90">${fmtLocal(start)}</span> — ` +
      `Ends <span class="text-white/90">${fmtLocal(end)}</span><br>` +
      `<span class="text-pink-400 text-2xl">${formatDHMS(start - now)}</span>`;
  } else if (now >= start && now < end) {
    // LIVE: loud mode
    card.classList.add('live');
    showLiveToast(start, end);

    labelEl.innerHTML = `
      <span class="live-badge">
        <span class="live-dot"></span>
        EVENT IS LIVE
      </span>
    `;
    etaEl.innerHTML =
      `Ends <span class="text-white/90">${fmtLocal(end)}</span><br>` +
      `<span class="text-pink-400 text-2xl">Time remaining: ${formatDHMS(end - now)}</span>`;
  } else {
    // just past end → compute next and show normal countdown
    card.classList.remove('live');
    hideLiveToast();

    const after = new Date(end.getTime() + 1000);
    const nxt = nextWindow(after);
    labelEl.innerHTML = 'Next Feature Night';
    etaEl.innerHTML =
      `Starts <span class="text-white/90">${fmtLocal(nxt.start)}</span> — ` +
      `Ends <span class="text-white/90">${fmtLocal(nxt.end)}</span><br>` +
      `<span class="text-pink-400 text-2xl">Countdown: ${formatDHMS(nxt.start - now)}</span>`;
  }
}

})();

/* ===========================
   CARD SLIDERS + MODAL (sync)
=========================== */
(() => {
  const SliderRegistry = new Map(); // id -> { images, idx, node, label }
  let activeSliderId = null;

  function setSliderBg(slider, src) {
    slider.style.backgroundImage = `url('${src}')`;
  }

  // Init cards
  (function initCardSliders(){
    const sliders = document.querySelectorAll('.card-slider');
    let autoId = 0;

    sliders.forEach(slider => {
      const raw = slider.getAttribute('data-images') || '[]';
      let images = [];
      try { images = JSON.parse(raw); } catch(e) {}
      if (!images.length) return;

      const id = slider.dataset.id || `slider-${autoId++}`;
      slider.dataset.id = id;

      const label = slider.getAttribute('aria-label') || '';
      let idx = 0;
      setSliderBg(slider, images[idx]);

      SliderRegistry.set(id, { images, idx, node: slider, label });

      const prevBtn = slider.querySelector('.prev');
      const nextBtn = slider.querySelector('.next');

      function go(delta) {
        const st = SliderRegistry.get(id);
        st.idx = (st.idx + delta + st.images.length) % st.images.length;
        setSliderBg(slider, st.images[st.idx]);
        if (activeSliderId === id && imgModal.classList.contains('show')) {
          modalSetImage(st.images[st.idx], st.label);
        }
      }

      prevBtn?.addEventListener('click', e => { e.stopPropagation(); go(-1); });
      nextBtn?.addEventListener('click', e => { e.stopPropagation(); go(+1); });

      // Clicking the picture opens the modal on current image
      slider.addEventListener('click', (e) => {
        e.stopPropagation();
        const st = SliderRegistry.get(id);
        openModalWithSlider(id, st.idx);
      });
    });
  })();

  // Modal elements
  const imgModal   = document.getElementById('img-modal');
  const imgEl      = document.getElementById('img-modal-image');
  const captionEl  = document.getElementById('img-modal-caption');
  const modalClose = document.getElementById('img-modal-close');
  const modalPrev  = document.getElementById('img-prev');
  const modalNext  = document.getElementById('img-next');

  function modalSetImage(src, alt) {
    imgEl.src = src;
    imgEl.alt = alt || '';
    captionEl.textContent = alt || '';
  }

  function openModalWithSlider(id, startIdx = 0) {
    const st = SliderRegistry.get(id);
    if (!st) return;
    activeSliderId = id;
    st.idx = startIdx;
    modalSetImage(st.images[st.idx], st.label);
    imgModal.classList.remove('hide-nav'); // show arrows for multi-image sliders
    imgModal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    imgModal.classList.remove('show');
    imgModal.classList.remove('hide-nav');
    document.body.style.overflow = '';
    imgEl.src = '';
    captionEl.textContent = '';
    activeSliderId = null;
  }

  function modalGo(delta) {
    if (!activeSliderId) return;
    const st = SliderRegistry.get(activeSliderId);
    st.idx = (st.idx + delta + st.images.length) % st.images.length;
    modalSetImage(st.images[st.idx], st.label);
    setSliderBg(st.node, st.images[st.idx]);
  }

  modalClose.addEventListener('click', closeModal);
  imgModal.addEventListener('click', (e)=>{ if (e.target === imgModal) closeModal(); });

  window.addEventListener('keydown', (e)=> {
    if (!imgModal.classList.contains('show')) return;
    if (e.key === 'Escape') closeModal();
    if (!imgModal.classList.contains('hide-nav')) {
      if (e.key === 'ArrowLeft')  modalGo(-1);
      if (e.key === 'ArrowRight') modalGo(+1);
    }
  });

  modalPrev.addEventListener('click', e => { e.stopPropagation(); modalGo(-1); });
  modalNext.addEventListener('click', e => { e.stopPropagation(); modalGo(+1); });

  // Generic IMG modal (single images: hide arrows)
  (function enableImgModal(){
    const modal   = imgModal;
    const close   = modalClose;

    function openModal(src, alt){
      if(!src) return;
      modalSetImage(src, alt);
      modal.classList.add('hide-nav');  // hide arrows for single images
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
    function closeSingle(){ closeModal(); }

    close.addEventListener('click', closeSingle);
    modal.addEventListener('click', (e)=>{ if(e.target === modal) closeSingle(); });
    window.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeSingle(); });

    // All <img> (skip links, no-modal, and the MODAL image itself)
document.querySelectorAll('img').forEach(img => {
  if (img.closest('a')) return;                 // skip linked icons
  if (img.classList.contains('no-modal')) return; // skip logo etc
  if (img.id === 'img-modal-image') return;     // <-- critical: don't bind modal image
  img.classList.add('cursor-zoom-in');
  img.addEventListener('click', () => openModal(img.src, img.alt));
});

document.getElementById('img-modal-image')
  .addEventListener('click', e => e.stopPropagation());

    // Background-image nodes (skip card sliders)
    const bgNodes = Array.from(document.querySelectorAll('[style*="background-image"], .bg-cover'));
    bgNodes.forEach(node => {
      if (node.closest('a')) return;
      if (node.classList.contains('card-slider') || node.closest('.card-slider')) return;
      node.style.cursor = 'zoom-in';
      node.addEventListener('click', ()=>{
        const cs = getComputedStyle(node);
        const m  = cs.backgroundImage && cs.backgroundImage.match(/url\(["']?(.*?)["']?\)/);
        if (m && m[1]) {
          const title = node.getAttribute('aria-label')
                      || node.closest('article')?.querySelector('h3')?.textContent
                      || '';
          openModal(m[1], title);
        }
      });
    });
  })();
})();

/* ===========================
   Vrclink.com popup + scroll to section
=========================== */
(() => {
// === VRCLINK CTA (ES5-safe, always shows) ===
(function () {
  var cta     = document.getElementById('vrclink-cta');
  var openBtn = document.getElementById('vrclink-cta-open');
  var closeBtn= document.getElementById('vrclink-cta-close');

  function show() { if (cta && cta.classList) cta.classList.add('show'); }
  function hide() { if (cta && cta.classList) cta.classList.remove('show'); }

  if (cta) { setTimeout(show, 450); }       // show every load (no 14-day hide)
  if (openBtn)  openBtn.addEventListener('click', function () { hide(); });
  if (closeBtn) closeBtn.addEventListener('click', function () { hide(); });
})();
})();

/* ===========================
   Smooth scrolling animation when clicking through the site
=========================== */
(() => {
(function () {
  // Capture ALL in-page anchors (exclude plain "#" and any opt-outs)
  var ANCHOR_SELECTOR = 'a[href^="#"]:not([href="#"]):not([data-no-scroll])';
  var DURATION_MS = 1000;

  function getHeaderOffset() {
    // tallest fixed/sticky header so content doesn't hide under it
    var candidates = document.querySelectorAll('header, .site-header, .navbar, .topbar, nav');
    var maxH = 0, i, el, cs, pos, h;
    for (i = 0; i < candidates.length; i++) {
      el = candidates[i];
      cs = window.getComputedStyle ? window.getComputedStyle(el) : null;
      pos = cs ? cs.position : '';
      if (pos === 'fixed' || pos === 'sticky') {
        h = el.offsetHeight || 0;
        if (h > maxH) maxH = h;
      }
    }
    return maxH;
  }

  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }

  function smoothScrollToY(goalY, duration) {
    var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { window.scrollTo(0, goalY); return; }

    var startY = window.pageYOffset || document.documentElement.scrollTop || 0;
    var startTime = null;
    function step(ts){
      if (startTime === null) startTime = ts;
      var p = (ts - startTime) / duration; if (p > 1) p = 1;
      var y = startY + (goalY - startY) * easeOutCubic(p);
      window.scrollTo(0, y);
      if (p < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  function scrollToTargetId(id) {
    if (!id) return;
    if (id.charAt(0) === '#') id = id.slice(1);
    var target = document.getElementById(id);
    if (!target) return;

    var rect  = target.getBoundingClientRect();
    var start = window.pageYOffset || document.documentElement.scrollTop || 0;
    var goalY = rect.top + start - getHeaderOffset() - 12; // a little breathing room

    smoothScrollToY(goalY, DURATION_MS);

    // Update URL without instant jump
    if (history && history.pushState) history.pushState(null, '', '#' + id);
    else location.hash = id;

    // a11y: focus target without jumping
    try {
      var prev = target.getAttribute('tabindex');
      if (prev === null) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      if (prev === null) target.removeAttribute('tabindex');
    } catch (e) {}
  }

  // Find nearest anchor from any click (handles icon/text inside <a>)
  function closestAnchor(el){
    while (el && el !== document.body) {
      if (el.tagName && el.tagName.toLowerCase() === 'a' && el.matches(ANCHOR_SELECTOR)) return el;
      el = el.parentNode;
    }
    return null;
  }

  function onDocClick(e){
    var a = closestAnchor(e.target);
    if (!a) return;
    var href = a.getAttribute('href');
    // Only handle pure in-page hashes like #about, #patreon, etc.
    if (!href || href.charAt(0) !== '#') return;
    // Only intercept if target exists
    var id = href.slice(1);
    if (!document.getElementById(id)) return;
    e.preventDefault();
    scrollToTargetId(href);
  }

  document.addEventListener('click', onDocClick);
})();
})();
