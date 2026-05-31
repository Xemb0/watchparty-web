(function () {
  let galleryItems = [];
  let currentIndex = 0;

  function createLightbox() {
    if (document.getElementById('gallery-lightbox')) return;
    const lb = document.createElement('div');
    lb.id = 'gallery-lightbox';
    lb.className = 'fixed inset-0 z-[9999] bg-black/95 hidden items-center justify-center';
    lb.innerHTML = `
      <button id="lb-close" class="absolute top-4 right-4 text-white/80 hover:text-white text-4xl z-10 w-12 h-12 flex items-center justify-center">&times;</button>
      <button id="lb-prev" class="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-5xl z-10 hidden md:flex w-12 h-12 items-center justify-center">&lsaquo;</button>
      <button id="lb-next" class="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-5xl z-10 hidden md:flex w-12 h-12 items-center justify-center">&rsaquo;</button>
      <div id="lb-counter" class="absolute top-4 left-4 text-white/60 text-sm z-10"></div>
      <div id="lb-media" class="flex items-center justify-center w-full h-full px-4 md:px-20 py-16"></div>
      <div id="lb-thumbs" class="absolute bottom-0 left-0 right-0 bg-black/80 p-3 overflow-x-auto whitespace-nowrap text-center"></div>
    `;
    document.body.appendChild(lb);

    document.getElementById('lb-close').onclick = closeLightbox;
    document.getElementById('lb-prev').onclick = () => navigateLightbox(-1);
    document.getElementById('lb-next').onclick = () => navigateLightbox(1);
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target.id === 'lb-media') closeLightbox(); });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (lb.classList.contains('hidden')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigateLightbox(-1);
      if (e.key === 'ArrowRight') navigateLightbox(1);
    });

    // Touch swipe
    let touchStartX = 0;
    lb.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      const diff = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(diff) > 60) navigateLightbox(diff > 0 ? -1 : 1);
    }, { passive: true });
  }

  function openLightbox(index) {
    currentIndex = index;
    const lb = document.getElementById('gallery-lightbox');
    lb.classList.remove('hidden');
    lb.classList.add('flex');
    document.body.style.overflow = 'hidden';
    showItem();
  }

  function closeLightbox() {
    const lb = document.getElementById('gallery-lightbox');
    lb.classList.add('hidden');
    lb.classList.remove('flex');
    document.body.style.overflow = '';
  }

  function navigateLightbox(dir) {
    currentIndex = (currentIndex + dir + galleryItems.length) % galleryItems.length;
    showItem();
  }

  function showItem() {
    const item = galleryItems[currentIndex];
    const media = document.getElementById('lb-media');
    const counter = document.getElementById('lb-counter');
    const thumbs = document.getElementById('lb-thumbs');

    counter.textContent = `${currentIndex + 1} / ${galleryItems.length}`;

    if (item.media_type === 'video') {
      media.innerHTML = `<video src="${item.url}" controls autoplay class="max-h-[80vh] max-w-full rounded-lg shadow-2xl"></video>`;
    } else {
      media.innerHTML = `<img src="${item.url}" alt="${item.alt_text || ''}" class="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl">`;
    }

    thumbs.innerHTML = galleryItems.map((it, i) => `
      <img src="${it.url}" alt="" class="inline-block h-14 w-auto rounded cursor-pointer mx-1 border-2 transition-all ${i === currentIndex ? 'border-white opacity-100' : 'border-transparent opacity-50 hover:opacity-80'}" onclick="window._galleryOpen(${i})">
    `).join('');
  }

  window._galleryOpen = openLightbox;

  window.loadGallery = async function (slug, containerId) {
    containerId = containerId || 'gallery-grid';
    const container = document.getElementById(containerId);
    if (!container) return;

    // Fetch product
    const { data: product } = await _supabase
      .from('products')
      .select('id, title')
      .eq('slug', slug)
      .single();

    if (!product) { container.innerHTML = '<p class="text-gray-400">No screenshots available.</p>'; return; }

    // Fetch screenshots
    const { data: screenshots } = await _supabase
      .from('product_screenshots')
      .select('*')
      .eq('product_id', product.id)
      .order('display_order');

    if (!screenshots || screenshots.length === 0) {
      container.innerHTML = '<p class="text-gray-400">No screenshots available yet.</p>';
      return;
    }

    galleryItems = screenshots;
    createLightbox();

    container.innerHTML = screenshots
      .filter(s => s.media_type === 'image')
      .map((s, i) => `
        <div class="cursor-pointer group overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1" onclick="window._galleryOpen(${i})">
          <img src="${s.url}" alt="${s.alt_text || ''}" class="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy">
        </div>
      `).join('');
  };
})();
