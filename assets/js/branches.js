(() => {
  const root = document.querySelector('[data-branch-finder]');
  if (!root) return;

  const searchForm = root.querySelector('[data-branch-search-form]');
  const search = root.querySelector('[data-branch-search]');
  const searchClear = root.querySelector('[data-branch-search-clear]');
  const filters = [...root.querySelectorAll('[data-branch-filter]')];
  const rows = [...root.querySelectorAll('[data-branch-row]')];
  const groups = [...root.querySelectorAll('[data-branch-group]')];
  const count = root.querySelector('[data-branch-count]');
  const summary = root.querySelector('[data-branch-summary]');
  const empty = root.querySelector('[data-branch-empty]');
  const reset = root.querySelector('[data-branch-reset]');
  const atlas = root.querySelector('[data-branch-atlas]');
  const markers = [...root.querySelectorAll('[data-map-marker]')];
  const mapStatus = root.querySelector('[data-map-status]');
  const mapReset = root.querySelector('[data-map-reset]');
  const mapCanvas = root.querySelector('.branch-map-canvas');
  const mapPopover = root.querySelector('[data-map-popover]');
  const mapPopoverTitle = root.querySelector('[data-map-popover-title]');
  const mapPopoverSummary = root.querySelector('[data-map-popover-summary]');
  const mapPopoverList = root.querySelector('[data-map-popover-list]');
  const mapPopoverClose = root.querySelector('[data-map-popover-close]');
  const locationInquiry = root.querySelector('[data-location-inquiry]');
  let selectedRegion = 'all';
  let selectedMapKey = '';
  let contextualMapKey = '';
  let previewMapKey = '';
  let currentPopoverMarker = null;

  const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const markerFor = key => markers.find(marker => marker.dataset.mapMarker === key);
  const markerLabel = key => markerFor(key)?.dataset.mapLabel || '';
  const markerCount = key => markerFor(key)?.querySelector('span')?.textContent?.trim() || '';

  function closeMapPopover({ restoreFocus = false } = {}) {
    if (!mapPopover) return;
    mapPopover.hidden = true;
    markers.forEach(marker => marker.setAttribute('aria-expanded', 'false'));
    if (restoreFocus) currentPopoverMarker?.focus();
    currentPopoverMarker = null;
  }

  function positionMapPopover(marker) {
    if (!mapCanvas || !mapPopover || mapPopover.hidden) return;
    const canvasRect = mapCanvas.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const popoverRect = mapPopover.getBoundingClientRect();
    const edge = 10;
    const gap = 14;
    const markerX = markerRect.left - canvasRect.left + markerRect.width / 2;
    const markerY = markerRect.top - canvasRect.top + markerRect.height / 2;
    let left = markerX + gap;
    let top = markerY - popoverRect.height / 2;

    if (left + popoverRect.width > canvasRect.width - edge) left = markerX - popoverRect.width - gap;
    left = Math.max(edge, Math.min(left, canvasRect.width - popoverRect.width - edge));
    top = Math.max(edge, Math.min(top, canvasRect.height - popoverRect.height - edge));
    mapPopover.style.setProperty('--popover-left', `${Math.round(left)}px`);
    mapPopover.style.setProperty('--popover-top', `${Math.round(top)}px`);
  }

  function openMapPopover(marker, key) {
    if (!mapPopover || !mapPopoverTitle || !mapPopoverSummary || !mapPopoverList) return;
    const matchingRows = rows.filter(row => row.dataset.mapKey === key);
    const items = matchingRows.map(row => {
      const sourceLink = row.querySelector('.branch-map-link');
      const item = document.createElement('li');
      const link = document.createElement('a');
      const name = row.querySelector('h4')?.textContent.trim() || 'Listed branch';
      const address = row.querySelector('address')?.textContent.trim() || '';
      link.href = sourceLink?.href || '#';
      if (sourceLink?.target) link.target = sourceLink.target;
      if (sourceLink?.rel) link.rel = sourceLink.rel;
      link.setAttribute('aria-label', `${name}, open in Google Maps`);

      const heading = document.createElement('strong');
      heading.textContent = name;
      const detail = document.createElement('span');
      detail.textContent = address;
      const action = document.createElement('em');
      action.textContent = 'Open in Google Maps →';
      link.append(heading, detail, action);
      item.append(link);
      return item;
    });

    mapPopoverTitle.textContent = markerLabel(key);
    mapPopoverSummary.textContent = `${matchingRows.length} listed ${matchingRows.length === 1 ? 'branch' : 'branches'} — select one for directions`;
    mapPopoverList.replaceChildren(...items);
    currentPopoverMarker = marker;
    markers.forEach(item => item.setAttribute('aria-expanded', String(item === marker)));
    mapPopover.hidden = false;
    mapPopover.style.visibility = 'hidden';
    positionMapPopover(marker);
    mapPopover.style.visibility = '';
  }

  function activeMapKey() {
    return previewMapKey || selectedMapKey || contextualMapKey;
  }

  function updateMapState(visibleCount) {
    const activeKey = activeMapKey();
    atlas?.setAttribute('data-active-map-key', activeKey);
    markers.forEach(marker => {
      const selected = marker.dataset.mapMarker === selectedMapKey;
      marker.classList.toggle('is-active', marker.dataset.mapMarker === activeKey);
      marker.setAttribute('aria-pressed', String(selected));
    });

    if (!mapStatus) return;
    if (activeKey) {
      const locationCount = selectedMapKey ? markerCount(activeKey) : String(visibleCount);
      mapStatus.textContent = `${locationCount} listed ${Number(locationCount) === 1 ? 'location' : 'locations'} in ${markerLabel(activeKey)}`;
      return;
    }
    if (selectedRegion !== 'all') {
      const regionName = selectedRegion.charAt(0).toUpperCase() + selectedRegion.slice(1);
      mapStatus.textContent = `${visibleCount} listed ${visibleCount === 1 ? 'location' : 'locations'} in ${regionName}`;
      return;
    }
    mapStatus.textContent = selectedRegion === 'all' && !normalize(search?.value)
      ? `${visibleCount} branches across 9 mapped areas`
      : `Showing ${visibleCount} listed ${visibleCount === 1 ? 'location' : 'locations'}`;
  }

  function syncFilterButtons() {
    filters.forEach(button => {
      const active = button.dataset.branchFilter === selectedRegion;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function updateResultSummary(visibleCount, query) {
    if (!summary) return;
    if (!visibleCount) {
      summary.textContent = query ? `No listed matches for “${search.value.trim()}”` : 'No listed locations in this selection';
      return;
    }
    if (selectedMapKey) {
      summary.textContent = `Showing ${visibleCount} ${visibleCount === 1 ? 'location' : 'locations'} in ${markerLabel(selectedMapKey)}`;
      return;
    }
    if (query) {
      summary.textContent = `Showing ${visibleCount} ${visibleCount === 1 ? 'match' : 'matches'} for “${search.value.trim()}”`;
      return;
    }
    if (selectedRegion !== 'all') {
      const regionName = selectedRegion.charAt(0).toUpperCase() + selectedRegion.slice(1);
      summary.textContent = `Showing ${visibleCount} ${visibleCount === 1 ? 'location' : 'locations'} in ${regionName}`;
      return;
    }
    summary.textContent = `Showing all ${visibleCount} locations`;
  }

  function updateInquiryLink() {
    if (!locationInquiry) return;
    const requestedArea = search?.value.trim() || markerLabel(selectedMapKey);
    locationInquiry.href = requestedArea
      ? `../contact/index.html?location=${encodeURIComponent(requestedArea)}#franchise-inquiry`
      : '../contact/index.html#franchise-inquiry';
  }

  function applyFilters() {
    const query = normalize(search?.value);
    let visibleCount = 0;
    const visibleMapKeys = new Set();

    rows.forEach(row => {
      const matchesRegion = selectedRegion === 'all' || row.dataset.islandGroup === selectedRegion;
      const matchesMap = !selectedMapKey || row.dataset.mapKey === selectedMapKey;
      const matchesQuery = !query || normalize(row.dataset.search).includes(query);
      const visible = matchesRegion && matchesMap && matchesQuery;
      row.hidden = !visible;
      if (visible) {
        visibleCount += 1;
        visibleMapKeys.add(row.dataset.mapKey);
      }
    });

    groups.forEach(group => {
      const groupVisibleCount = [...group.querySelectorAll('[data-branch-row]')].filter(row => !row.hidden).length;
      group.hidden = groupVisibleCount === 0;
      const groupCount = group.querySelector('[data-branch-group-count]');
      if (groupCount) groupCount.textContent = `${groupVisibleCount} ${groupVisibleCount === 1 ? 'listed location' : 'listed locations'}`;
    });

    contextualMapKey = query && visibleMapKeys.size === 1 ? [...visibleMapKeys][0] : '';
    if (count) count.textContent = String(visibleCount);
    if (empty) empty.hidden = visibleCount !== 0;
    if (searchClear) searchClear.hidden = !search?.value;
    updateResultSummary(visibleCount, query);
    updateMapState(visibleCount);
    updateInquiryLink();
  }

  function clearSelections({ preserveSearch = false } = {}) {
    closeMapPopover();
    selectedRegion = 'all';
    selectedMapKey = '';
    contextualMapKey = '';
    previewMapKey = '';
    if (!preserveSearch && search) search.value = '';
    syncFilterButtons();
    applyFilters();
  }

  filters.forEach(button => {
    button.addEventListener('click', () => {
      closeMapPopover();
      selectedRegion = button.dataset.branchFilter || 'all';
      selectedMapKey = '';
      previewMapKey = '';
      syncFilterButtons();
      applyFilters();
    });
  });

  markers.forEach(marker => {
    marker.setAttribute('aria-controls', mapPopover?.id || 'branch-map-popover');
    marker.setAttribute('aria-expanded', 'false');
    marker.addEventListener('click', () => {
      const nextKey = marker.dataset.mapMarker || '';
      const closingSelection = selectedMapKey === nextKey;
      selectedMapKey = closingSelection ? '' : nextKey;
      selectedRegion = 'all';
      previewMapKey = '';
      if (search) search.value = '';
      syncFilterButtons();
      applyFilters();
      if (closingSelection) closeMapPopover();
      else openMapPopover(marker, nextKey);
    });
  });

  searchForm?.addEventListener('submit', event => {
    event.preventDefault();
    closeMapPopover();
    selectedMapKey = '';
    applyFilters();
  });

  search?.addEventListener('input', () => {
    closeMapPopover();
    selectedMapKey = '';
    selectedRegion = 'all';
    previewMapKey = '';
    syncFilterButtons();
    applyFilters();
  });
  search?.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !search.value) return;
    search.value = '';
    applyFilters();
  });
  searchClear?.addEventListener('click', () => {
    clearSelections();
    search?.focus();
  });

  rows.forEach(row => {
    const key = row.dataset.mapKey || '';
    row.addEventListener('pointerenter', () => {
      previewMapKey = key;
      updateMapState(rows.filter(item => !item.hidden && item.dataset.mapKey === key).length);
    });
    row.addEventListener('pointerleave', () => {
      previewMapKey = '';
      updateMapState(rows.filter(item => !item.hidden).length);
    });
    row.addEventListener('focusin', () => {
      previewMapKey = key;
      updateMapState(rows.filter(item => !item.hidden && item.dataset.mapKey === key).length);
    });
    row.addEventListener('focusout', () => {
      window.requestAnimationFrame(() => {
        if (row.contains(document.activeElement)) return;
        previewMapKey = '';
        updateMapState(rows.filter(item => !item.hidden).length);
      });
    });
  });

  reset?.addEventListener('click', () => {
    clearSelections();
    search?.focus();
  });
  mapReset?.addEventListener('click', () => clearSelections({ preserveSearch: false }));
  mapPopoverClose?.addEventListener('click', () => closeMapPopover({ restoreFocus: true }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mapPopover && !mapPopover.hidden) closeMapPopover({ restoreFocus: true });
  });
  window.addEventListener('resize', () => {
    if (currentPopoverMarker && mapPopover && !mapPopover.hidden) positionMapPopover(currentPopoverMarker);
  });

  const initialQuery = new URLSearchParams(location.search).get('q')?.trim();
  if (initialQuery && search) search.value = initialQuery.slice(0, 120);

  root.classList.add('is-enhanced');
  syncFilterButtons();
  applyFilters();
})();
