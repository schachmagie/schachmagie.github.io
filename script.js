// This file can be used for interactive elements later.
// For now, it's empty.
// Lightweight lightbox for images inside .gallery-grid
(function(){
  const imgs = document.querySelectorAll('#gallery .card-media img, #gallery .gallery-grid img');
  if(!imgs.length) return;

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,.85);
    display:none; place-items:center; z-index:1000; padding:24px;
  `;
  const fig = document.createElement('figure');
  fig.style.cssText = 'max-width:min(1200px,92vw); max-height:90vh; margin:0;';
  const big = document.createElement('img');
  big.style.cssText = 'width:100%; height:100%; object-fit:contain; border-radius:14px;';
  fig.appendChild(big);
  overlay.appendChild(fig);
  document.body.appendChild(overlay);

  const close = () => (overlay.style.display = 'none');
  overlay.addEventListener('click', close);
  document.addEventListener('keyup', e => { if(e.key === 'Escape') close(); });

  imgs.forEach(img=>{
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', ()=>{
      big.src = img.src;
      overlay.style.display = 'grid';
    });
  });
})();
