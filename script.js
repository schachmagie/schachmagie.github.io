// script.js
(function () {
  const GH_OWNER  = 'schachmagie';
  const GH_REPO   = 'schachmagie.github.io'; 
  const BRANCH    = 'main';

  const GALLERY_SEL = '#gallery';
  const ALLOWED = /\.(png|jpe?g|gif|webp|avif)$/i;

  const root = document.querySelector(GALLERY_SEL);
  if (!root) return;

  // NEW: grab inline elements
  const MAIN_IMG  = document.getElementById('gallery-main');
  const VIEW_PREV = root.querySelector('.gallery-view .prev');
  const VIEW_NEXT = root.querySelector('.gallery-view .next');
  if (MAIN_IMG) MAIN_IMG.style.visibility = 'hidden';

  // helpers
  const el = (tag, props = {}, ...children) => {
    const n = document.createElement(tag);
    Object.assign(n, props);
    for (const c of children) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return n;
  };
  const pretty = (name) => name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

  // overlay/lightbox
  const overlay = el('div');
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,.85);
    display:none; place-items:center; z-index:1000; padding:24px;
  `;
  const fig = el('figure');
  fig.style.cssText = 'max-width:min(1200px,92vw); max-height:90vh; margin:0; position:relative;';
  const big = el('img');
  big.style.cssText = 'width:100%; height:100%; object-fit:contain; border-radius:14px;';
  const caption = el('figcaption', { style: 'position:absolute; left:0; right:0; bottom:0; padding:.5rem .75rem; color:#fff; background:linear-gradient(transparent, rgba(0,0,0,.6)); font:500 14px/1.3 system-ui,sans-serif;' });
  const mkNavBtn = (label, side) => {
    const b = el('button', { type: 'button', title: label, 'aria-label': label });
    b.textContent = side === 'prev' ? '‹' : '›';
    b.style.cssText = `
      position:absolute; top:50%; transform:translateY(-50%);
      ${side === 'prev' ? 'left:.5rem' : 'right:.5rem'};
      border:0; background:rgba(0,0,0,.35); color:#fff;
      font-size:2rem; width:44px; height:44px; border-radius:50%;
      cursor:pointer; display:grid; place-items:center;`;
    return b;
  };
  const prevBtn = mkNavBtn('Vorheriges Bild', 'prev');
  const nextBtn = mkNavBtn('Nächstes Bild', 'next');

  fig.appendChild(big);
  fig.appendChild(prevBtn);
  fig.appendChild(nextBtn);
  fig.appendChild(caption);
  overlay.appendChild(fig);
  document.body.appendChild(overlay);

  const close = () => (overlay.style.display = 'none');
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keyup', (e) => {
    if (e.key === 'Escape') close();
    if (overlay.style.display !== 'none') {
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    }
  });

  // thumbs container
  let thumbs = root.querySelector('#gallery-thumbs');
  if (!thumbs) {
    thumbs = el('div', { id: 'gallery-thumbs', className: 'gallery-thumbs', role: 'list' });
    root.appendChild(thumbs);
  }

  // GitHub API
  async function loadFromGitHubAssets() {
    const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/assets?ref=${encodeURIComponent(BRANCH)}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/vnd.github.v3+json' } });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const data = await res.json();
    return data
      .filter(item => item && item.type === 'file' && ALLOWED.test(item.name))
      .map(item => ({ src: item.download_url, alt: pretty(item.name) }));
  }

  function collectExistingImgs() {
    const imgs = root.querySelectorAll('img');
    const list = [];
    imgs.forEach((img) => {
      const src = img.getAttribute('src') || '';
      if (ALLOWED.test(src)) list.push({ src, alt: img.alt || '' });
    });
    return list;
  }

  // render
  let items = [];
  let current = 0;
  let thumbButtons = [];

  function renderThumbs(list) {
    thumbs.innerHTML = '';
    thumbButtons = list.map((item, i) => {
      const btn = el('button', { type: 'button' });
      btn.style.cssText = 'padding:0; border:2px solid transparent; border-radius:.75rem; overflow:hidden; background:none; cursor:pointer;';
      btn.addEventListener('click', () => show(i));
      const t = el('img', { src: item.src, alt: item.alt || `Vorschau ${i + 1}`, loading: 'lazy' });
      t.style.cssText = 'width:100%; height:90px; object-fit:cover; display:block;';
      btn.appendChild(t);
      thumbs.appendChild(btn);
      return btn;
    });
  }

  function updateThumbState() {
    thumbButtons.forEach((b, i) => {
      if (i === current) {
        b.setAttribute('aria-current', 'true');
        b.style.borderColor = '#6aa9ff';
        b.style.boxShadow = '0 0 0 3px rgba(106,169,255,.25)';
      } else {
        b.removeAttribute('aria-current');
        b.style.borderColor = 'transparent';
        b.style.boxShadow = 'none';
      }
    });
  }

  function show(i) {
    if (!items.length) return;
    current = (i + items.length) % items.length;
    const { src, alt } = items[current];
    const tmp = new Image();
    tmp.onload = () => {
      // overlay
      big.src = src;
      big.alt = alt || `Galerie Bild ${current + 1} von ${items.length}`;
      caption.textContent = alt || '';

      // NEW: update inline main image
      if (MAIN_IMG) {
        MAIN_IMG.src = src;
        MAIN_IMG.alt = alt || `Galerie Bild ${current + 1} von ${items.length}`;
        MAIN_IMG.style.visibility = 'visible';
      }

      updateThumbState();
    };
    tmp.src = src;
  }

  function open(i) {
    show(i);
    overlay.style.display = 'grid';
  }

  prevBtn.addEventListener('click', (e) => { e.stopPropagation(); show(current - 1); });
  nextBtn.addEventListener('click', (e) => { e.stopPropagation(); show(current + 1); });

  // NEW: hook inline prev/next + click-to-open
  VIEW_PREV?.addEventListener('click', (e) => { e.preventDefault(); show(current - 1); });
  VIEW_NEXT?.addEventListener('click', (e) => { e.preventDefault(); show(current + 1); });
  MAIN_IMG?.addEventListener('click', () => open(current));

  // init
  (async function init() {
    try {
      items = await loadFromGitHubAssets();
    } catch (e) {
      console.warn('Falling back to inline images in HTML:', e);
      items = collectExistingImgs();
    }

    if (!items.length) {
      root.style.display = 'none';
      return;
    }

    renderThumbs(items);
    show(0);
  })();
})();
