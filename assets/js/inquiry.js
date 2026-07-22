(() => {
  const form = document.querySelector('[data-inquiry-form]');
  if (!form) return;

  const contactIntents = [...document.querySelectorAll('[data-contact-intent]')];
  const contactPanels = [...document.querySelectorAll('[data-contact-panel]')];
  const phone = form.querySelector('[name="phone"]');
  const brandInputs = [...form.querySelectorAll('[name="brand"]')];
  const brandGroup = form.querySelector('[data-brand-group]');
  const packageField = form.querySelector('[name="package"]');
  const stepPanels = [...form.querySelectorAll('[data-step-panel]')];
  const stepIndicators = [...form.querySelectorAll('[data-step-indicator]')];
  const stepStatus = form.querySelector('[data-step-status]');
  const nextButtons = [...form.querySelectorAll('[data-step-next]')];
  const backButtons = [...form.querySelectorAll('[data-step-back]')];
  const review = document.querySelector('[data-inquiry-review]');
  const reviewStatus = review?.querySelector('[data-review-status]');
  const reviewIdle = review?.querySelector('[data-review-idle]');
  const reviewDraft = review?.querySelector('[data-review-draft]');
  const reviewNeedsReview = review?.querySelector('[data-review-needs-review]');
  const reviewPrepared = review?.querySelector('[data-review-prepared]');
  const preparedPreview = review?.querySelector('[data-prepared-preview]');
  const reviewActions = review?.querySelector('.inquiry-review-actions');
  const emailLink = review?.querySelector('[data-email-inquiry]');
  const copyButton = review?.querySelector('[data-copy-inquiry]');
  const copyStatus = review?.querySelector('[data-copy-status]');
  const copyFallback = review?.querySelector('[data-copy-fallback]');
  const defaultEmailHref = 'mailto:sonandsolsunrisemarketingmain@gmail.com';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const completedSteps = new Set();
  let inquiryText = '';
  let reviewState = 'idle';
  let validationAttempted = false;
  let currentStep = 0;

  const draftTargets = {
    name: review?.querySelector('[data-draft-name]'),
    phone: review?.querySelector('[data-draft-phone]'),
    city: review?.querySelector('[data-draft-city]'),
    brand: review?.querySelector('[data-draft-brand]'),
    package: review?.querySelector('[data-draft-package]')
  };

  function activateIntent(intent, moveFocus = false) {
    contactIntents.forEach(button => {
      const active = button.dataset.contactIntent === intent;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      if (active && moveFocus) button.focus();
    });
    contactPanels.forEach(panel => {
      const active = panel.dataset.contactPanel === intent;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });
  }

  function scrollInquiryIntoView() {
    const workspace = document.querySelector('[data-inquiry-workspace]');
    if (!workspace) return;
    workspace.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
    stepPanels[currentStep]?.querySelector('legend')?.focus({ preventScroll: true });
  }

  if (contactIntents.length && contactPanels.length) {
    document.body.classList.add('is-contact-enhanced');
    const initiallySelected = contactIntents.find(button => button.getAttribute('aria-selected') === 'true');
    activateIntent(initiallySelected?.dataset.contactIntent || contactIntents[0].dataset.contactIntent);
    contactIntents.forEach((button, index) => {
      button.addEventListener('click', () => {
        activateIntent(button.dataset.contactIntent);
        if (button.dataset.contactIntent === 'franchise') scrollInquiryIntoView();
      });
      button.addEventListener('keydown', event => {
        let nextIndex = null;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % contactIntents.length;
        if (event.key === 'ArrowLeft') nextIndex = (index - 1 + contactIntents.length) % contactIntents.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = contactIntents.length - 1;
        if (nextIndex === null) return;
        event.preventDefault();
        activateIntent(contactIntents[nextIndex].dataset.contactIntent, true);
      });
    });
  }

  function showStep(index, moveFocus = false) {
    currentStep = Math.max(0, Math.min(index, stepPanels.length - 1));
    stepPanels.forEach((panel, panelIndex) => {
      const active = panelIndex === currentStep;
      panel.hidden = !active;
      panel.setAttribute('aria-hidden', String(!active));
    });
    stepIndicators.forEach((indicator, indicatorIndex) => {
      const active = indicatorIndex === currentStep;
      indicator.classList.toggle('is-complete', completedSteps.has(indicatorIndex));
      if (active) indicator.setAttribute('aria-current', 'step');
      else indicator.removeAttribute('aria-current');
    });
    if (stepStatus) stepStatus.textContent = `Step ${currentStep + 1} of ${stepPanels.length}`;
    form.dataset.currentStep = String(currentStep);
    if (moveFocus) {
      const legend = stepPanels[currentStep]?.querySelector('legend');
      legend?.focus({ preventScroll: true });
      stepPanels[currentStep]?.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
    }
  }

  function setActionsEnabled(enabled) {
    reviewActions?.classList.toggle('is-disabled', !enabled);
    if (emailLink) emailLink.setAttribute('aria-disabled', String(!enabled));
    if (copyButton) copyButton.disabled = !enabled;
  }

  function resetCopyFeedback() {
    if (copyStatus) copyStatus.textContent = '';
    if (copyFallback) {
      copyFallback.hidden = true;
      copyFallback.value = '';
    }
  }

  function showReviewState(nextState) {
    reviewState = nextState;
    review?.classList.toggle('is-prepared', nextState === 'prepared');
    review?.classList.toggle('is-needs-review', nextState === 'needs-review');
    if (reviewIdle) reviewIdle.hidden = nextState !== 'idle';
    if (reviewDraft) reviewDraft.hidden = nextState !== 'draft';
    if (reviewNeedsReview) reviewNeedsReview.hidden = nextState !== 'needs-review';
    if (reviewPrepared) reviewPrepared.hidden = nextState !== 'prepared';
    setActionsEnabled(nextState === 'prepared');
    const messages = {
      idle: 'Your details stay with you.',
      draft: 'Draft details are visible only in this browser.',
      prepared: 'Your inquiry is ready for your review.',
      needsReview: 'Your details changed. Prepare the inquiry again.'
    };
    if (reviewStatus) reviewStatus.textContent = messages[nextState === 'needs-review' ? 'needsReview' : nextState];
  }

  function selectedBrandInputs() {
    return brandInputs.filter(input => input.checked);
  }

  function selectedBrandLabels() {
    return selectedBrandInputs().map(input => input.dataset.brandLabel || input.value);
  }

  function selectedBrandSummary() {
    return selectedBrandLabels().join(', ');
  }

  function updateDraft() {
    const values = {
      name: form.elements.name.value.trim(),
      phone: form.elements.phone.value.trim(),
      city: form.elements.city.value.trim(),
      brand: selectedBrandSummary(),
      package: form.elements.package.value.trim()
    };
    if (draftTargets.name) draftTargets.name.textContent = values.name || 'Not provided';
    if (draftTargets.phone) draftTargets.phone.textContent = values.phone || 'Not provided';
    if (draftTargets.city) draftTargets.city.textContent = values.city || 'Not provided';
    if (draftTargets.brand) draftTargets.brand.textContent = values.brand || 'Not selected';
    if (draftTargets.package) draftTargets.package.textContent = values.package || 'Not specified';

    const hasDraft = Object.values(values).some(Boolean) || form.elements.email.value.trim() || form.elements.capital.checked;
    if (reviewState === 'prepared' || reviewState === 'needs-review') {
      inquiryText = '';
      if (emailLink) emailLink.href = defaultEmailHref;
      if (preparedPreview) preparedPreview.textContent = '';
      resetCopyFeedback();
      showReviewState('needs-review');
      return;
    }
    showReviewState(hasDraft ? 'draft' : 'idle');
  }

  function fieldErrorElement(field) {
    return form.querySelector(`[data-field-error="${field.name}"]`);
  }

  function validatePhone() {
    if (!phone) return true;
    const digits = phone.value.replace(/\D/g, '');
    let message = '';
    if (!phone.value.trim()) message = 'Enter your mobile number.';
    else if (!/^09\d{9}$/.test(digits)) message = 'Enter an 11-digit Philippine mobile number starting with 09.';
    phone.setCustomValidity(message);
    return !message;
  }

  function validateBrandGroup(showMessage = validationAttempted) {
    const valid = selectedBrandInputs().length > 0;
    brandGroup?.setAttribute('aria-invalid', String(!valid));
    const error = form.querySelector('[data-brand-error]');
    if (error) error.textContent = !valid && showMessage ? 'Choose at least one brand or select Not sure yet.' : '';
    return valid;
  }

  function validationMessage(field) {
    if (field.name === 'phone') return field.validationMessage;
    if (field.validity.valueMissing) {
      const labels = { name: 'full name', city: 'planned city or municipality' };
      return field.type === 'checkbox' ? 'Please confirm the privacy notice.' : `Enter your ${labels[field.name] || 'information'}.`;
    }
    if (field.validity.typeMismatch) return 'Enter a valid email address or leave this optional field blank.';
    return field.validationMessage;
  }

  function validateField(field, showMessage = validationAttempted) {
    if (field.name === 'brand') return validateBrandGroup(showMessage);
    if (field.name === 'phone') validatePhone();
    const valid = field.checkValidity();
    field.setAttribute('aria-invalid', String(!valid));
    const error = fieldErrorElement(field);
    if (error) error.textContent = !valid && showMessage ? validationMessage(field) : '';
    return valid;
  }

  function validateStep(index, showMessage = true) {
    const panel = stepPanels[index];
    if (!panel) return true;
    const fieldResults = [...panel.querySelectorAll('input, select, textarea')]
      .filter(field => field.name !== 'brand' && field.type !== 'button' && field.type !== 'submit')
      .map(field => validateField(field, showMessage));
    if (panel.querySelector('[data-brand-group]')) fieldResults.push(validateBrandGroup(showMessage));
    return fieldResults.every(Boolean);
  }

  function focusFirstInvalid(container = stepPanels[currentStep], brandInvalid = false) {
    const firstInvalid = container?.querySelector('input:invalid, select:invalid, textarea:invalid');
    const target = firstInvalid || (brandInvalid ? brandInputs[0] : null);
    if (!target) return;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'center' });
  }

  function validateForm() {
    for (let index = 0; index < stepPanels.length; index += 1) {
      const brandInvalid = Boolean(stepPanels[index].querySelector('[data-brand-group]')) && !validateBrandGroup(true);
      if (!validateStep(index, true)) {
        showStep(index);
        focusFirstInvalid(stepPanels[index], brandInvalid);
        return false;
      }
    }
    return true;
  }

  function enforceBrandExclusivity(changedInput) {
    if (!changedInput?.checked) return;
    const unsure = brandInputs.find(input => input.hasAttribute('data-brand-unsure'));
    if (changedInput === unsure) {
      brandInputs.filter(input => input !== unsure).forEach(input => { input.checked = false; });
    } else if (unsure) {
      unsure.checked = false;
    }
  }

  function buildInquiry() {
    const data = new FormData(form);
    const brands = selectedBrandLabels();
    const selectedBrands = brands.join(', ') || 'Not specified';
    const unsureSelected = selectedBrandInputs().some(input => input.hasAttribute('data-brand-unsure'));
    const subjectBrand = unsureSelected ? 'Brand guidance requested' : brands.length === 1 ? brands[0] : `${brands.length} brands`;
    inquiryText = [
      'Hello Son & Sol Sunrise Marketing,',
      '',
      'I would like to inquire about a franchise.',
      `Name: ${data.get('name')}`,
      `Mobile: ${data.get('phone')}`,
      `Email: ${data.get('email') || 'Not provided'}`,
      `Planned location: ${data.get('city')}`,
      `Interested brands: ${selectedBrands}`,
      `Package or budget: ${data.get('package') || 'Not specified'}`,
      `Capital ready: ${data.get('capital') ? 'Yes' : 'Not yet / Prefer to discuss'}`,
      '',
      'Please send me the current package details and next steps.'
    ].join('\n');
    const subject = `Franchise inquiry - ${data.get('name')} - ${subjectBrand}`;
    if (emailLink) emailLink.href = `${defaultEmailHref}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(inquiryText)}`;
    if (preparedPreview) preparedPreview.textContent = inquiryText;
  }

  const params = new URLSearchParams(location.search);
  const requestedBrands = params.getAll('brand');
  const recognizedInputs = requestedBrands.map(value => brandInputs.find(input => input.value === value)).filter(Boolean);
  const namedInputs = recognizedInputs.filter(input => !input.hasAttribute('data-brand-unsure'));
  if (namedInputs.length) namedInputs.forEach(input => { input.checked = true; });
  const unsurePrefill = brandInputs.find(input => input.hasAttribute('data-brand-unsure'));
  if (!namedInputs.length && recognizedInputs.includes(unsurePrefill)) unsurePrefill.checked = true;
  if (params.get('package') && packageField) packageField.value = params.get('package').slice(0, 100);

  nextButtons.forEach(button => button.addEventListener('click', () => {
    validationAttempted = true;
    const brandInvalid = Boolean(stepPanels[currentStep]?.querySelector('[data-brand-group]')) && !validateBrandGroup(true);
    if (!validateStep(currentStep, true)) {
      focusFirstInvalid(stepPanels[currentStep], brandInvalid);
      return;
    }
    completedSteps.add(currentStep);
    showStep(currentStep + 1, true);
  }));
  backButtons.forEach(button => button.addEventListener('click', () => showStep(currentStep - 1, true)));

  form.addEventListener('input', event => {
    if (event.target.name === 'brand') return;
    if (validationAttempted && event.target.matches('input, select, textarea')) validateField(event.target, true);
    updateDraft();
  });
  form.addEventListener('change', event => {
    if (event.target.name !== 'brand') return;
    enforceBrandExclusivity(event.target);
    if (validationAttempted) validateBrandGroup(true);
    updateDraft();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    validationAttempted = true;
    if (!validateForm()) return;
    stepPanels.forEach((_, index) => completedSteps.add(index));
    buildInquiry();
    resetCopyFeedback();
    showReviewState('prepared');
    review?.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'center' });
  });

  emailLink?.addEventListener('click', event => {
    if (reviewState !== 'prepared') event.preventDefault();
  });
  copyButton?.addEventListener('click', async () => {
    if (reviewState !== 'prepared' || !inquiryText) return;
    try {
      await navigator.clipboard.writeText(inquiryText);
      if (copyStatus) copyStatus.textContent = 'Inquiry details copied.';
      if (copyFallback) copyFallback.hidden = true;
    } catch {
      if (copyStatus) copyStatus.textContent = 'Copy was blocked. Your prepared text is shown below for manual copying.';
      if (copyFallback) {
        copyFallback.value = inquiryText;
        copyFallback.hidden = false;
        copyFallback.focus();
        copyFallback.select();
      }
    }
  });

  form.classList.add('is-progressive');
  showStep(0);
  updateDraft();
  if (location.hash === '#franchise-inquiry') requestAnimationFrame(scrollInquiryIntoView);
})();
