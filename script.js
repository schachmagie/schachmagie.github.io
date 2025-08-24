// script.js
(function () {
  const GALLERY_SEL = '#gallery';
  const GRID_SEL = `${GALLERY_SEL} .gallery-grid, ${GALLERY_SEL} #gallery-thumbs`;
  const JSON_URL = 'assets/gallery.json';
  const ALLOWED = /\.(png|jpe?g|gif|webp|avif)$/i;

  const root = document.querySelector(GALLERY_SEL);
  if (!root) return;

  // ---------- helpers ----------
  const el = (tag, props = {}, ...children) => {
    const n = document.createElement(tag);
    Object.assign(n, props);
    for (const c of children) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return n;
  };

  const ensureGrid = () => {
    let grid = root.querySelector(GRID_SEL);
    if (!grid) {
      grid = el('div', { className: 'gallery-grid' });
      root.appendChild(grid);
    }
    return grid;
  };

  // ---------- overlay (keeps your style, adds nav) ----------
  const overlay = el('div');
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,.85);
    display:none; place-items:center; z-index:1000; padding:24px;
  `;
  const fig = el('figure');
  fig.style.cssText = 'max-width:min(1200px,92vw); max-height:90vh; margin:0; position:relative;';
  const big = el('img');
  big.style.cssText = 'width:100%; height:100%; object-fit:contain; border-radius:14px;';
  const caption = el('figcaption', { style: 'position:absolute; left:0; right:0; bottom:0; padding:.5rem .75rem; color:#fff; background:linear-gradient(transparent, rgba(0,0,0,.6)); font: 500 14px/1.3 system-ui, sans-serif;' });

  const mkNavBtn = (label, side) => {
    const btn = el('button', { type: 'button', title: label, 'aria-label': label });
    btn.textContent = side === 'prev' ? '‹' : '›';
    btn.style.cssText = `
      position:absolute; top:50%; transform:translateY(-50%);
      ${side === 'prev' ? 'left:.5rem' : 'right:.5rem'};
      border:0; background:rgba(0,0,0,.35); color:#fff;
      font-size:2rem; width:44px; height:44px; border-radius:50%;
      cursor:pointer; display:grid; place-items:center;
    `;
    return btn;
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
  overlay.addEventListener('click', (e) => {
    // click outside the image area closes; clicks on buttons don’t bubble-close
    if (e.target === overlay) close();
  });
  document.addEventListener('keyup', (e) => {
    if (e.key === 'Escape') close();
    if (overlay.style.display !== 'none') {
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    }
  });

  // ---------- data loading ----------
  async function loadListFromJson() {
    try {
      const res = await fetch(JSON_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let arr = await res.json();
      // Accept either ["assets/a.jpg", ...] or [{src, alt}, ...]
      arr = arr.map((item) =>
        typeof item === 'string' ? { src: item, alt: '' } : item
      );
      return arr.filter((o) => o && o.src && ALLOWED.test(o.src));
    } catch {
      return null; // signal fallback
    }
  }

  function collectExistingImgs() {
    const imgs = root.querySelectorAll('.card-media img, .gallery-grid img, .gallery-thumbs img');
    const list = [];
    imgs.forEach((img) => {
      if (img.src && ALLOWED.test(img.src)) {
        list.push({ src: img.getAttribute('src') || img.src, alt: img.alt || '' });
      }
    });
    return list.length ? list : null;
  }

  // ---------- render thumbnails ----------
  let items = [];
  let current = 0;
  let thumbButtons = [];

  function renderThumbs(list) {
    const grid = ensureGrid();
    grid.innerHTML = '';
    thumbButtons = list.map((item, i) => {
      const btn = el('button', { type: 'button' });
      btn.style.cssText = `
        padding:0; border:2px solid transparent; border-radius:.75rem; overflow:hidden; background:none; cursor:pointer;
      `;
      btn.addEventListener('click', () => open(i));
      const t = el('img', { src: item.src, alt: item.alt || `Vorschau ${i + 1}`, loading: 'lazy' });
      t.style.cssText = 'width:100%; height:90px; object-fit:cover; display:block;';
      btn.appendChild(t);
      grid.appendChild(btn);
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

  // ---------- show/open ----------
  function show(i) {
    if (!items.length) return;
    current = (i + items.length) % items.length;
    const { src, alt } = items[current];

    const tmp = new Image();
    tmp.onload = () => {
      big.src = src;
      big.alt = alt || `Galerie Bild ${current + 1} von ${items.length}`;
      caption.textContent = alt || '';
      updateThumbState();
    };
    tmp.src = src;
  }

  function open(i) {
    show(i);
    overlay.style.display = 'grid';
  }

  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    show(current - 1);
  });
  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    show(current + 1);
  });

  // ---------- bootstrap ----------
  (async function init() {
    const fromJson = await loadListFromJson();
    const fallback = fromJson && fromJson.length ? null : collectExistingImgs();
    items = fromJson && fromJson.length ? fromJson : (fallback || []);

    if (!items.length) {
      // nothing to show -> hide gallery section
      root.style.display = 'none';
      return;
    }

    renderThumbs(items);

    // Also make any inline images clickable for zoom (if you keep some)
    root.querySelectorAll('img').forEach((img, idx) => {
      if (!ALLOWED.test(img.src || '')) return;
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => open(idx < items.length ? idx : 0));
    });

    // start on first image (preload main)
    show(0);
  })();
})();