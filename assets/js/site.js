(() => {
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');
  const iconUse = toggle?.querySelector('use');

  function setMenu(open) {
    if (!toggle || !nav) return;
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (iconUse) iconUse.setAttribute('href', `${toggle.dataset.iconBase}#i-${open ? 'x' : 'list'}`);
  }

  toggle?.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  nav?.addEventListener('click', event => {
    if (event.target.closest('a')) setMenu(false);
  });

  document.querySelectorAll('[data-year]').forEach(node => {
    node.textContent = new Date().getFullYear();
  });

  const heroRoot = document.querySelector('[data-hero-root]');
  const heroStage = heroRoot?.querySelector('[data-hero-depth]');
  const heroVideo = heroRoot?.querySelector('[data-hero-video]');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktopHeroQuery = window.matchMedia('(min-width: 1024px)');
  const finePointerQuery = window.matchMedia('(pointer: fine)');
  let heroDepthFrame = 0;
  let pendingHeroDepth = null;

  function resetHeroDepth() {
    if (!heroStage) return;
    pendingHeroDepth = null;
    heroStage.style.setProperty('--depth-x', '0px');
    heroStage.style.setProperty('--depth-y', '0px');
  }

  function initializeHeroMotion() {
    if (!heroRoot) return;
    if (reducedMotionQuery.matches) {
      heroRoot.classList.remove('is-enhanced', 'is-ready');
      resetHeroDepth();
      return;
    }
    heroRoot.classList.add('is-enhanced');
    window.requestAnimationFrame(() => heroRoot.classList.add('is-ready'));
  }

  function applyHeroDepth() {
    heroDepthFrame = 0;
    if (!heroStage || !pendingHeroDepth) return;
    const { x, y } = pendingHeroDepth;
    heroStage.style.setProperty('--depth-x', `${x}px`);
    heroStage.style.setProperty('--depth-y', `${y}px`);
  }

  heroRoot?.addEventListener('pointermove', event => {
    if (!heroStage || reducedMotionQuery.matches || !desktopHeroQuery.matches || !finePointerQuery.matches) return;
    const bounds = heroStage.getBoundingClientRect();
    const x = Math.max(-6, Math.min(6, ((event.clientX - bounds.left) / bounds.width - .5) * 12));
    const y = Math.max(-6, Math.min(6, ((event.clientY - bounds.top) / bounds.height - .5) * 12));
    pendingHeroDepth = { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
    if (!heroDepthFrame) heroDepthFrame = window.requestAnimationFrame(applyHeroDepth);
  });
  heroRoot?.addEventListener('pointerleave', resetHeroDepth);
  reducedMotionQuery.addEventListener?.('change', initializeHeroMotion);
  initializeHeroMotion();

  function enhanceHeroVideo() {
    if (!heroVideo) return;
    const smallViewport = window.matchMedia('(max-width: 1023px)').matches;
    const reducedMotion = reducedMotionQuery.matches;
    const sources = [
      [heroVideo.dataset.heroVideoWebm?.trim(), 'video/webm'],
      [heroVideo.dataset.heroVideoMp4?.trim(), 'video/mp4']
    ].filter(([source]) => source);

    if (smallViewport || reducedMotion || !sources.length) return;

    const media = heroVideo.closest('[data-hero-depth]');
    sources.forEach(([source, type]) => {
      const sourceElement = document.createElement('source');
      sourceElement.src = source;
      sourceElement.type = type;
      heroVideo.append(sourceElement);
    });

    heroVideo.addEventListener('canplay', () => {
      media?.classList.add('is-video-ready');
      heroVideo.play().catch(() => media?.classList.remove('is-video-ready'));
    }, { once: true });
    heroVideo.addEventListener('error', () => {
      media?.classList.remove('is-video-ready');
      heroVideo.replaceChildren();
    }, { once: true });
    heroVideo.load();
  }

  window.addEventListener('load', () => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(enhanceHeroVideo, { timeout: 1500 });
      return;
    }
    window.setTimeout(enhanceHeroVideo, 0);
  }, { once: true });

  const brandSpotlight = document.querySelector('[data-brand-spotlight]');
  const spotlightImage = brandSpotlight?.querySelector('[data-spotlight-image]');
  const spotlightLogo = brandSpotlight?.querySelector('[data-spotlight-logo]');
  const spotlightName = brandSpotlight?.querySelector('[data-spotlight-name]');
  const spotlightCategory = brandSpotlight?.querySelector('[data-spotlight-category]');
  const spotlightLink = brandSpotlight?.querySelector('[data-spotlight-link]');
  const brandRows = [...document.querySelectorAll('.home-brand-row[data-spotlight-image]')];
  let spotlightTimer = 0;

  function applyBrandSpotlight(row) {
    if (!brandSpotlight || !spotlightImage || !spotlightLogo || !spotlightName || !spotlightCategory || !spotlightLink) return;
    const name = row.dataset.spotlightName || '';
    spotlightImage.src = row.dataset.spotlightImage || spotlightImage.src;
    spotlightImage.alt = name ? `${name} product presentation` : 'Featured food franchise product';
    spotlightLogo.src = row.dataset.spotlightLogo || spotlightLogo.src;
    spotlightName.textContent = name;
    spotlightCategory.textContent = row.dataset.spotlightCategory || '';
    spotlightLink.href = row.href;
    brandRows.forEach(item => item.classList.toggle('is-active', item === row));
  }

  function updateBrandSpotlight(row) {
    if (!brandSpotlight || !row) return;
    window.clearTimeout(spotlightTimer);
    if (reducedMotionQuery.matches) {
      applyBrandSpotlight(row);
      return;
    }
    brandSpotlight.classList.add('is-changing');
    spotlightTimer = window.setTimeout(() => {
      applyBrandSpotlight(row);
      brandSpotlight.classList.remove('is-changing');
    }, 140);
  }

  brandRows.forEach(row => {
    row.addEventListener('pointerenter', () => updateBrandSpotlight(row));
    row.addEventListener('focus', () => updateBrandSpotlight(row));
  });
  if (brandRows.length) applyBrandSpotlight(brandRows[0]);

  const revealSections = [...document.querySelectorAll('[data-reveal-section]')];
  let revealObserver = null;

  function initializeSectionReveals() {
    revealObserver?.disconnect();
    document.documentElement.classList.remove('is-reveal-enhanced');
    revealSections.forEach(section => section.classList.remove('is-visible'));

    if (!revealSections.length || reducedMotionQuery.matches || !('IntersectionObserver' in window)) {
      revealSections.forEach(section => section.classList.add('is-visible'));
      return;
    }

    document.documentElement.classList.add('is-reveal-enhanced');
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver?.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });

    revealSections.forEach(section => {
      if (section.getBoundingClientRect().top < window.innerHeight * .92) {
        section.classList.add('is-visible');
        return;
      }
      revealObserver.observe(section);
    });
  }

  reducedMotionQuery.addEventListener?.('change', initializeSectionReveals);
  initializeSectionReveals();

  const productDialog = document.querySelector('[data-product-dialog]');
  const productDialogImage = productDialog?.querySelector('[data-product-dialog-image]');
  const productDialogTitle = productDialog?.querySelector('[data-product-dialog-title]');
  const productDialogClose = productDialog?.querySelector('[data-product-dialog-close]');
  let productDialogTrigger = null;
  let inertElements = [];

  function getFocusable(root) {
    if (!root) return [];
    return [...root.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter(element => !element.hidden && element.getClientRects().length > 0);
  }

  function setBackgroundInert(inert) {
    if (!productDialog) return;
    if (inert) {
      const mainSiblings = [...productDialog.parentElement.children].filter(element => element !== productDialog);
      inertElements = [document.querySelector('.site-header'), document.querySelector('.mobile-actions'), document.querySelector('.site-footer'), ...mainSiblings].filter(Boolean);
      inertElements.forEach(element => { element.inert = true; });
      return;
    }
    inertElements.forEach(element => { element.inert = false; });
    inertElements = [];
  }

  function closeProductDialog() {
    if (!productDialog || productDialog.hidden) return;
    productDialog.hidden = true;
    document.body.classList.remove('product-dialog-open');
    setBackgroundInert(false);
    productDialogTrigger?.focus();
    productDialogTrigger = null;
  }

  document.querySelectorAll('[data-product-preview]').forEach(button => {
    button.addEventListener('click', () => {
      if (!productDialog || !productDialogImage || !productDialogTitle) return;
      productDialogTrigger = button;
      productDialogImage.src = button.dataset.previewSrc || '';
      productDialogImage.alt = button.dataset.previewTitle || 'Product preview';
      productDialogTitle.textContent = button.dataset.previewTitle || 'Product preview';
      productDialog.hidden = false;
      document.body.classList.add('product-dialog-open');
      setBackgroundInert(true);
      productDialogClose?.focus();
    });
  });

  productDialogClose?.addEventListener('click', closeProductDialog);
  productDialog?.addEventListener('click', event => {
    if (event.target === productDialog) closeProductDialog();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (productDialog && !productDialog.hidden) {
        closeProductDialog();
        return;
      }
      if (nav?.classList.contains('open')) {
        setMenu(false);
        toggle?.focus();
      }
    }

    if (event.key !== 'Tab' || !productDialog || productDialog.hidden) return;
    const focusable = getFocusable(productDialog);
    if (!focusable.length) {
      event.preventDefault();
      productDialogClose?.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
})();
