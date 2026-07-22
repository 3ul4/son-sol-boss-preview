(() => {
  const root = document.querySelector('[data-branch-finder]');
  if (!root) return;

  const search = root.querySelector('[data-branch-search]');
  const filters = [...root.querySelectorAll('[data-branch-filter]')];
  const rows = [...root.querySelectorAll('[data-branch-row]')];
  const groups = [...root.querySelectorAll('[data-branch-group]')];
  const count = root.querySelector('[data-branch-count]');
  const empty = root.querySelector('[data-branch-empty]');
  const reset = root.querySelector('[data-branch-reset]');
  const atlas = root.querySelector('[data-branch-atlas]');
  const atlasRegions = [...root.querySelectorAll('[data-atlas-region]')];
  let selectedRegion = 'all';
  let contextualRegion = '';

  const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  function setAtlasRegion(region) {
    const activeRegion = region && region !== 'all' ? region : '';
    atlas?.setAttribute('data-active-region', activeRegion);
    atlasRegions.forEach(item => {
      item.classList.toggle('is-active', item.dataset.atlasRegion === activeRegion);
    });
  }

  function syncFilterButtons() {
    filters.forEach(button => {
      const active = button.dataset.branchFilter === selectedRegion;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function restoreAtlasRegion() {
    setAtlasRegion(selectedRegion !== 'all' ? selectedRegion : contextualRegion);
  }

  function applyFilters() {
    const query = normalize(search?.value);
    let visibleCount = 0;
    const visibleRegions = new Set();

    rows.forEach(row => {
      const matchesRegion = selectedRegion === 'all' || row.dataset.islandGroup === selectedRegion;
      const matchesQuery = !query || normalize(row.dataset.search).includes(query);
      const visible = matchesRegion && matchesQuery;
      row.hidden = !visible;
      if (visible) {
        visibleCount += 1;
        visibleRegions.add(row.dataset.islandGroup);
      }
    });

    groups.forEach(group => {
      group.hidden = !group.querySelector('[data-branch-row]:not([hidden])');
    });

    if (count) count.textContent = String(visibleCount);
    if (empty) empty.hidden = visibleCount !== 0;
    contextualRegion = query && visibleRegions.size === 1 ? [...visibleRegions][0] : '';
    restoreAtlasRegion();
  }

  filters.forEach(button => {
    button.addEventListener('click', () => {
      selectedRegion = button.dataset.branchFilter || 'all';
      syncFilterButtons();
      applyFilters();
    });
  });

  search?.addEventListener('input', applyFilters);
  search?.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !search.value) return;
    search.value = '';
    applyFilters();
  });

  rows.forEach(row => {
    const region = row.dataset.atlasTarget || '';
    row.addEventListener('pointerenter', () => setAtlasRegion(region));
    row.addEventListener('pointerleave', restoreAtlasRegion);
    row.addEventListener('focusin', () => setAtlasRegion(region));
    row.addEventListener('focusout', () => {
      window.requestAnimationFrame(() => {
        if (!row.contains(document.activeElement)) restoreAtlasRegion();
      });
    });
    row.querySelector('[data-branch-locate]')?.addEventListener('click', () => setAtlasRegion(region));
  });

  reset?.addEventListener('click', () => {
    selectedRegion = 'all';
    if (search) search.value = '';
    syncFilterButtons();
    applyFilters();
    search?.focus();
  });

  root.classList.add('is-enhanced');
  syncFilterButtons();
  applyFilters();
})();
