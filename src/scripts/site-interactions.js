/**
 * Shared page enhancements: remembered motion preference, mobile navigation,
 * the trail guide, keyboard Easter eggs, and progressive reveal. Content and
 * navigation remain available if JavaScript is unavailable.
 */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motionToggle = document.querySelector('[data-motion-toggle]');
  const motionKey = 'unyielding-claw-motion-paused-v1';

  let motionPaused = reduceMotion;
  if (!reduceMotion) {
    try { motionPaused = localStorage.getItem(motionKey) === 'true'; } catch {}
  }

  const renderMotionPreference = () => {
    document.documentElement.classList.toggle('motion-paused', motionPaused);

    if (!motionToggle) return;
    motionToggle.setAttribute('aria-pressed', String(motionPaused));

    if (reduceMotion) {
      motionToggle.textContent = 'MOTION REDUCED BY SYSTEM';
      motionToggle.disabled = true;
    } else {
      motionToggle.textContent = motionPaused ? 'RESUME AUTO MOTION' : 'PAUSE AUTO MOTION';
    }
  };

  motionToggle?.addEventListener('click', () => {
    if (reduceMotion) return;
    motionPaused = !motionPaused;
    try { localStorage.setItem(motionKey, String(motionPaused)); } catch {}
    renderMotionPreference();
  });

  renderMotionPreference();

  // Mobile navigation stays compact, while no-script pages keep every link visible.
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const primaryNav = document.querySelector('#primary-nav');
  const mobileNav = window.matchMedia('(max-width: 760px)');

  const setNavigation = (open = false) => {
    if (!menuToggle || !primaryNav) return;
    const expanded = mobileNav.matches && open;
    primaryNav.hidden = mobileNav.matches && !expanded;
    menuToggle.setAttribute('aria-expanded', String(expanded));
    menuToggle.setAttribute('aria-label', expanded ? 'Close' : 'Menu');
    const label = menuToggle.querySelector('[data-menu-label]');
    if (label) label.textContent = expanded ? 'Close' : 'Menu';
    document.body.classList.toggle('nav-open', expanded);
  };

  if (menuToggle && primaryNav) {
    document.documentElement.classList.add('js');
    setNavigation(false);
    menuToggle.addEventListener('click', () => {
      setNavigation(menuToggle.getAttribute('aria-expanded') !== 'true');
    });
    primaryNav.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('a')) setNavigation(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || menuToggle.getAttribute('aria-expanded') !== 'true') return;
      setNavigation(false);
      menuToggle.focus();
    });
    mobileNav.addEventListener('change', () => setNavigation(false));
  }

  const eggToast = document.querySelector('.egg-toast');
  const mizTakeover = document.querySelector('[data-miz-takeover]');
  const mizKeyboard = document.querySelector('[data-miz-keyboard]');
  const mizEntry = document.querySelector('[data-miz-entry]');
  const mizInput = document.querySelector('[data-miz-input]');
  let eggBuffer = '';
  let eggTimer;
  let mizTimer;

  const showToast = (message, duration = 1800) => {
    if (!eggToast) return;
    clearTimeout(eggTimer);
    eggToast.textContent = message;
    eggToast.classList.add('is-visible');
    eggTimer = setTimeout(() => eggToast.classList.remove('is-visible'), duration);
  };

  const closeMizEntry = () => {
    if (!mizEntry || !mizKeyboard) return;
    mizEntry.hidden = true;
    mizKeyboard.setAttribute('aria-expanded', 'false');
  };

  const triggerMizTakeover = () => {
    eggBuffer = '';
    mizInput?.blur();
    closeMizEntry();

    if (!mizTakeover) {
      showToast('ZOU!');
      return;
    }

    clearTimeout(mizTimer);
    mizTakeover.classList.remove('is-active');
    mizTakeover.setAttribute('aria-hidden', 'false');

    // Restart the animation cleanly if somebody enthusiastically types MIZ again.
    void mizTakeover.offsetWidth;
    mizTakeover.classList.add('is-active');

    mizTimer = setTimeout(() => {
      mizTakeover.classList.remove('is-active');
      mizTakeover.setAttribute('aria-hidden', 'true');
    }, reduceMotion ? 1200 : 2100);
  };

  document.addEventListener('keydown', (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;
    if (event.key.length !== 1) return;

    eggBuffer = (eggBuffer + event.key.toLowerCase()).slice(-12);
    if (eggBuffer.endsWith('miz')) triggerMizTakeover();
  });

  mizKeyboard?.addEventListener('click', () => {
    if (!mizEntry || !mizInput) return;

    const opening = mizEntry.hidden;
    mizEntry.hidden = !opening;
    mizKeyboard.setAttribute('aria-expanded', String(opening));

    if (opening) {
      mizInput.value = '';
      // Keep focus inside the user gesture. Mobile Safari only opens the
      // software keyboard when focus happens directly from a tap.
      mizInput.focus({ preventScroll: true });
    }
  });

  mizInput?.addEventListener('input', () => {
    const letters = mizInput.value.replace(/[^a-z]/gi, '').slice(0, 3).toUpperCase();
    mizInput.value = letters;

    if (letters.toLowerCase() === 'miz') {
      triggerMizTakeover();
    } else if (letters.length === 3) {
      showToast('NOT THE CALL', 1200);
      mizInput.select();
    }
  });

  const trailGuide = document.querySelector('[data-trail-guide]');
  const trailToggle = trailGuide?.querySelector('.trail-guide__toggle');
  const trailPanel = trailGuide?.querySelector('.trail-guide__panel');
  const trailCount = trailGuide?.querySelector('[data-trail-count]');
  const trailMessage = trailGuide?.querySelector('[data-trail-message]');
  const trailSummary = trailGuide?.querySelector('[data-trail-summary]');
  const trailKey = 'unyielding-claw-trail-v2';
  const legacyTrailKey = 'unyielding-claw-trail-v1';
  const mainTrailTotal = 16;
  const trailTotal = 17;
  const rewardKey = 'unyielding-claw-trail-reward-v1';
  let foundMarkers = [];

  const legacyMap = {
    home: 'home-basecamp',
    work: 'work-buildlog',
    harness: 'harness-trail',
    workshop: 'workshop-trail',
    about: 'about-origin',
    contact: 'contact-radio',
  };

  try {
    foundMarkers = JSON.parse(localStorage.getItem(trailKey) || '[]');
    if (!Array.isArray(foundMarkers)) foundMarkers = [];

    if (foundMarkers.length === 0) {
      const legacy = JSON.parse(localStorage.getItem(legacyTrailKey) || '[]');
      if (Array.isArray(legacy)) {
        foundMarkers = legacy.map((id) => legacyMap[id]).filter(Boolean);
      }
    }
  } catch {
    foundMarkers = [];
  }

  // MIZ → ZOU remains an Easter egg, but is no longer required for
  // Trail completion. Preserve progress for anyone who found the old
  // keyboard-only discovery by migrating it to the new visible Home marker.
  if (foundMarkers.includes('home-miz')) {
    foundMarkers = foundMarkers
      .map((id) => id === 'home-miz' ? 'home-range' : id)
      .filter((id, index, all) => all.indexOf(id) === index);

    try {
      localStorage.setItem(trailKey, JSON.stringify(foundMarkers));
    } catch {}
  }

  const saveTrail = () => {
    try {
      localStorage.setItem(trailKey, JSON.stringify([...new Set(foundMarkers)]));
    } catch {}
  };

  const formatTrailProgress = (mainCount) =>
    mainCount + '/' + mainTrailTotal;

  const renderTrail = () => {
    if (!trailGuide) return;
    const unique = [...new Set(foundMarkers)];
    trailGuide.hidden = unique.length === 0;

    const mainCount = unique.filter((id) => !id.startsWith('offtrail-')).length;
    const bonusCount = unique.filter((id) => id.startsWith('offtrail-')).length;

    if (trailCount) {
      trailCount.textContent = formatTrailProgress(mainCount);
    }

    if (trailSummary) {
      trailSummary.textContent =
        mainCount + ' of ' + mainTrailTotal +
        ' discoveries found. Explore the site; hidden markers and interactive details both count.';
    }

    trailGuide.querySelectorAll('[data-trail-chapter]').forEach((item) => {
      const chapter = item.getAttribute('data-trail-chapter');
      const total = Number(item.getAttribute('data-trail-total') || 0);
      const found = unique.filter((id) => id.startsWith(chapter + '-')).length;
      item.classList.toggle('is-found', found >= total && total > 0);
      item.classList.toggle('has-progress', found > 0);

      const status = item.querySelector('b');
      if (!status) return;

      if (chapter === 'offtrail' && found === 0) {
        status.textContent = '?';
      } else {
        status.textContent = found + '/' + total;
      }
    });

    if (trailMessage) {
      const remaining = Math.max(0, mainTrailTotal - mainCount);

      if (mainCount >= mainTrailTotal) {
        trailMessage.textContent = bonusCount > 0
          ? 'All 16 found + the off-trail bonus. Mission complete. If you know the call, the site knows the response.'
          : 'All 16 found. Mission complete. One Trail bonus may still be off trail. There is also a school-spirit secret hiding in plain sight.';
      } else if (mainCount >= 8) {
        trailMessage.textContent =
          remaining + (remaining === 1 ? ' discovery remains.' : ' discoveries remain.') +
          ' Field note: some traditions are answered, not clicked.';
      } else {
        trailMessage.textContent =
          remaining + (remaining === 1 ? ' discovery remains.' : ' discoveries remain.');
      }
    }
  };

  const trailComplete = document.querySelector('[data-trail-complete]');
  const trailPin = document.querySelector('[data-trail-pin]');
  const trailContinue = document.querySelector('[data-trail-continue]');
  const trailResetButtons = document.querySelectorAll('[data-trail-reset]');
  const trailPageRegions = [
    document.querySelector('.site-header'),
    document.querySelector('main'),
    document.querySelector('.site-footer'),
    trailGuide,
  ].filter(Boolean);
  let trailDialogPreviousFocus = null;
  let trailResetArmed = false;
  let trailResetTimer;

  const setTrailPageInert = (isInert) => {
    trailPageRegions.forEach((region) => {
      region.inert = isInert;
    });
  };

  const closeTrailComplete = ({ restoreFocus = true } = {}) => {
    if (!trailComplete) return;
    trailComplete.classList.remove('is-active', 'is-pinned');
    trailComplete.setAttribute('aria-hidden', 'true');
    trailComplete.inert = true;
    setTrailPageInert(false);

    if (restoreFocus && trailDialogPreviousFocus instanceof HTMLElement) {
      trailDialogPreviousFocus.focus({ preventScroll: true });
    }
  };

  const maybeCelebrateTrail = () => {
    const unique = [...new Set(foundMarkers)];
    const mainCount = unique.filter((id) => !id.startsWith('offtrail-')).length;
    if (mainCount < mainTrailTotal || !trailComplete) return;

    let alreadyRewarded = false;
    try { alreadyRewarded = localStorage.getItem(rewardKey) === 'earned'; } catch {}
    if (alreadyRewarded) return;

    trailDialogPreviousFocus = document.activeElement;
    trailComplete.inert = false;
    trailComplete.classList.add('is-active');
    trailComplete.setAttribute('aria-hidden', 'false');
    setTrailPageInert(true);

    setTimeout(() => {
      trailContinue?.focus();
    }, reduceMotion ? 0 : 1100);
  };

  trailPin?.addEventListener('click', () => {
    try { localStorage.setItem(rewardKey, 'earned'); } catch {}
    trailComplete?.classList.add('is-pinned');
    setTimeout(() => {
      closeTrailComplete({ restoreFocus: true });
    }, 850);
    trailGuide?.classList.add('has-earned-badge');
    showToast('BADGE PINNED // UNYIELDING EXPLORER', 2400);
  });

  trailContinue?.addEventListener('click', () => closeTrailComplete({ restoreFocus: true }));

  const restoreResetLabels = () => {
    trailResetButtons.forEach((button) => {
      button.textContent = button.getAttribute('data-reset-label') || 'RESET TRAIL';
    });
  };

  const resetTrail = () => {
    foundMarkers = [];
    clearTimeout(trailResetTimer);
    trailResetArmed = false;

    try {
      localStorage.removeItem(trailKey);
      localStorage.removeItem(legacyTrailKey);
      localStorage.removeItem(rewardKey);
    } catch {}

    trailGuide?.classList.remove('has-earned-badge', 'is-open');
    trailToggle?.setAttribute('aria-expanded', 'false');
    if (trailPanel) {
      trailPanel.inert = true;
      trailPanel.setAttribute('aria-hidden', 'true');
    }
    closeTrailComplete({ restoreFocus: false });
    document.querySelectorAll('[data-trail-marker].is-found').forEach((marker) => marker.classList.remove('is-found'));
    restoreResetLabels();
    renderTrail();
    showToast('TRAIL RESET // FRESH BOOTS, CLEAN MAP', 1800);

    setTimeout(() => {
      if (window.location.pathname === '/') {
        window.location.reload();
      } else {
        window.location.assign('/');
      }
    }, 650);
  };

  trailResetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (trailResetArmed) {
        resetTrail();
        return;
      }

      trailResetArmed = true;
      trailResetButtons.forEach((item) => {
        item.textContent = 'RESET? CLICK AGAIN';
      });

      clearTimeout(trailResetTimer);
      trailResetTimer = setTimeout(() => {
        trailResetArmed = false;
        restoreResetLabels();
      }, 3200);
    });
  });

  const discoverTrail = (id, toast = 'TRAIL FIND') => {
    if (!id || foundMarkers.includes(id)) return false;
    foundMarkers.push(id);
    saveTrail();
    renderTrail();
    const unique = [...new Set(foundMarkers)];
    const mainCount = unique.filter((entry) => !entry.startsWith('offtrail-')).length;
    showToast(
      id.startsWith('offtrail-')
        ? 'BONUS PATCH FOUND // LOST BUT FUNCTIONAL'
        : toast + ' // ' + formatTrailProgress(mainCount),
      2200
    );
    maybeCelebrateTrail();
    return true;
  };

  window.unyieldingTrailDiscover = discoverTrail;

  document.querySelectorAll('[data-trail-marker]').forEach((marker) => {
    marker.addEventListener('click', () => {
      const id = marker.getAttribute('data-trail-marker');
      if (discoverTrail(id, 'TRAIL MARKER FOUND')) marker.classList.add('is-found');
    });
  });

  document.querySelectorAll('[data-trail-hover]').forEach((target) => {
    let discovered = false;
    const findIt = () => {
      if (discovered) return;
      discovered = discoverTrail(target.getAttribute('data-trail-hover'), 'TRAIL DETAIL FOUND');
    };

    target.addEventListener('pointerenter', findIt, { passive: true });
    target.addEventListener('focusin', findIt);
    target.addEventListener('click', findIt);
  });

  document.querySelectorAll('[data-trail-auto]').forEach((target) => {
    discoverTrail(target.getAttribute('data-trail-auto'), 'OFF-TRAIL FIND');
  });

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const target = event.target.closest('[data-trail-discovery]');
    if (!target) return;
    discoverTrail(target.getAttribute('data-trail-discovery'), 'TRAIL DETAIL FOUND');
  });

  trailToggle?.addEventListener('click', () => {
    const open = trailGuide.classList.toggle('is-open');
    trailToggle.setAttribute('aria-expanded', String(open));
    if (trailPanel) {
      trailPanel.inert = !open;
      trailPanel.setAttribute('aria-hidden', String(!open));
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (trailComplete?.classList.contains('is-active')) {
        event.preventDefault();
        closeTrailComplete({ restoreFocus: true });
        return;
      }

      if (trailGuide?.classList.contains('is-open')) {
        trailGuide.classList.remove('is-open');
        trailToggle?.setAttribute('aria-expanded', 'false');
        if (trailPanel) {
          trailPanel.inert = true;
          trailPanel.setAttribute('aria-hidden', 'true');
        }
        trailToggle?.focus();
        return;
      }

      const hoveredEgg = document.querySelector('[data-egg]:hover');
      const focusedEgg = document.activeElement instanceof Element
        ? document.activeElement.closest('[data-egg]')
        : null;
      const egg = focusedEgg || hoveredEgg;
      if (egg) {
        event.preventDefault();
        egg.classList.add('egg-tooltip-dismissed');
        return;
      }
    }

    if (event.key === 'Tab' && trailComplete?.classList.contains('is-active')) {
      const focusable = [...trailComplete.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
        .filter((element) => element instanceof HTMLElement && !element.hidden);
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  document.querySelectorAll('[data-egg]').forEach((egg) => {
    egg.addEventListener('pointerleave', () => egg.classList.remove('egg-tooltip-dismissed'));
    egg.addEventListener('focusin', () => egg.classList.remove('egg-tooltip-dismissed'));
  });

  renderTrail();

  try {
    if (localStorage.getItem(rewardKey) === 'earned') {
      trailGuide?.classList.add('has-earned-badge');
    }
  } catch {}

  if (reduceMotion) return;

  document.documentElement.classList.add('motion-enabled');

  const revealTargets = document.querySelectorAll(
    '.section-heading, .project-card, .principle, .feature-note, .identity-card, .workshop-card, .case-content > section, .proof-module, .range-card, .manifesto-grid, .work-console, .harness-question, .rule-card, .bench-note, .about-stack__card, .career-timeline article, .personal-tile, .contact-action, .contact-topic-grid article, .case-flow > section, .bridge-card'
  );

  revealTargets.forEach((el) => el.classList.add('reveal-ready'));

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });

    revealTargets.forEach((el) => observer.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('is-revealed'));
  }

  // Fine pointers animate card surfaces and the drafting spotlight; touch stays still.
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!finePointer) return;

  const spotlight = document.querySelector('.cursor-spotlight');
  let spotlightFrame;

  if (spotlight) {
    const moveSpotlight = (event) => {
      cancelAnimationFrame(spotlightFrame);
      spotlightFrame = requestAnimationFrame(() => {
        spotlight.style.setProperty('--cursor-x', event.clientX + 'px');
        spotlight.style.setProperty('--cursor-y', event.clientY + 'px');
        spotlight.classList.add('is-active');
      });
    };

    document.addEventListener('pointermove', moveSpotlight, { passive: true });
    document.addEventListener('pointerleave', () => spotlight.classList.remove('is-active'));
    window.addEventListener('blur', () => spotlight.classList.remove('is-active'));
  }

  document.querySelectorAll('.harness-question').forEach((card, index) => {
    let frame;
    const baseDirection = index % 2 === 0 ? -1 : 1;

    const resetHarnessQuestion = () => {
      cancelAnimationFrame(frame);
      card.style.setProperty('--hq-x', '0px');
      card.style.setProperty('--hq-y', '0px');
      card.style.setProperty('--hq-r', '0deg');
      card.style.setProperty('--hq-s', '1');
      card.classList.remove('is-harness-moving');
    };

    const kickHarnessQuestion = () => {
      const x = baseDirection * (5 + Math.random() * 7);
      const y = -5 - Math.random() * 8;
      const r = -baseDirection * (0.55 + Math.random() * 1.15);
      const scale = 1.012 + Math.random() * 0.014;

      card.style.setProperty('--hq-x', x.toFixed(1) + 'px');
      card.style.setProperty('--hq-y', y.toFixed(1) + 'px');
      card.style.setProperty('--hq-r', r.toFixed(2) + 'deg');
      card.style.setProperty('--hq-s', scale.toFixed(3));
      card.classList.add('is-harness-moving');
    };

    card.addEventListener('pointerenter', kickHarnessQuestion);

    card.addEventListener('pointermove', (event) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const px = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const py = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

        const x = (px - 0.5) * 16 + baseDirection * 3;
        const y = (py - 0.5) * 10 - 6;
        const r = (px - 0.5) * 2.2 - baseDirection * 0.45;

        card.style.setProperty('--hq-x', x.toFixed(1) + 'px');
        card.style.setProperty('--hq-y', y.toFixed(1) + 'px');
        card.style.setProperty('--hq-r', r.toFixed(2) + 'deg');
      });
    });

    card.addEventListener('pointerleave', resetHarnessQuestion);
    card.addEventListener('focusin', kickHarnessQuestion);
    card.addEventListener('focusout', resetHarnessQuestion);
  });

  // Shared physical motion for ordinary card surfaces. Specialized
  // interactions (project cards, Harness nodes/questions, case-study panels,
  // Workshop benches) keep their own behavior.
  const liveCardSelector = [
    '.principle-grid--punch .principle',
    '.range-card',
    '.bridge-card',
    '.rule-card',
    '.workshop-grid--wow .workshop-card',
    '.process-strip > div',
    '.career-timeline article',
    '.about-stack__card',
    '.contact-action',
    '.contact-topic-grid article',
    '.feature-note',
    '.identity-card',
    '.work-console',
    '.scouting-callout',
    '.personal-tile'
  ].join(', ');
  {
    document.querySelectorAll(liveCardSelector).forEach((card, index) => {
      // Avoid double-wiring anything that also belongs to a specialized system.
      if (
        card.matches(
          '.project-card, .harness-question, .harness-node, .harness-core, [data-case-signal], .case-flow > section'
        )
      ) return;

      card.classList.add('uc-live-card');

      let frame;
      const direction = index % 2 === 0 ? -1 : 1;
      const personality = (index % 4) + 1;

      const resetLiveCard = () => {
        cancelAnimationFrame(frame);
        card.style.setProperty('--live-x', '0px');
        card.style.setProperty('--live-y', '0px');
        card.style.setProperty('--live-r', '0deg');
        card.style.setProperty('--live-s', '1');
        card.style.setProperty('--live-glow-x', '50%');
        card.style.setProperty('--live-glow-y', '50%');
        card.classList.remove('is-live-moving');
      };

      const wakeLiveCard = () => {
        const kickX = direction * (5 + personality * 1.8);
        const kickY = -5 - personality * 1.2;
        const kickR = -direction * (0.35 + personality * 0.16);
        const kickS = 1.01 + personality * 0.003;

        card.style.setProperty('--live-x', kickX.toFixed(1) + 'px');
        card.style.setProperty('--live-y', kickY.toFixed(1) + 'px');
        card.style.setProperty('--live-r', kickR.toFixed(2) + 'deg');
        card.style.setProperty('--live-s', kickS.toFixed(3));
        card.classList.add('is-live-moving');
      };

      card.addEventListener('pointerenter', wakeLiveCard);

      card.addEventListener('pointermove', (event) => {
        cancelAnimationFrame(frame);

        frame = requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const px = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
          const py = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

          const travelX = 14 + personality * 1.5;
          const travelY = 10 + personality;
          const rotate = 1.4 + personality * 0.18;

          const x = (px - 0.5) * travelX + direction * 2.5;
          const y = (py - 0.5) * travelY - 5;
          const r = (px - 0.5) * rotate - direction * 0.28;
          const scale = 1.014 + (1 - Math.abs(px - 0.5) * 2) * 0.008;

          card.style.setProperty('--live-x', x.toFixed(1) + 'px');
          card.style.setProperty('--live-y', y.toFixed(1) + 'px');
          card.style.setProperty('--live-r', r.toFixed(2) + 'deg');
          card.style.setProperty('--live-s', scale.toFixed(3));
          card.style.setProperty('--live-glow-x', (px * 100).toFixed(1) + '%');
          card.style.setProperty('--live-glow-y', (py * 100).toFixed(1) + '%');
        });
      });

      card.addEventListener('pointerleave', resetLiveCard);
      card.addEventListener('focusin', wakeLiveCard);
      card.addEventListener('focusout', resetLiveCard);
    });
  }

  const tiltCards = document.querySelectorAll('.project-card');

  tiltCards.forEach((card) => {
    let frame;

    const reset = () => {
      cancelAnimationFrame(frame);
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
      card.style.setProperty('--glow-x', '50%');
      card.style.setProperty('--glow-y', '50%');
      card.style.setProperty('--art-x', '0px');
      card.style.setProperty('--art-y', '0px');
      card.classList.remove('is-tilting');
    };

    card.addEventListener('pointerenter', () => card.classList.add('is-tilting'));

    card.addEventListener('pointermove', (event) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const px = x / rect.width;
        const py = y / rect.height;
        const rotateY = (px - 0.5) * 14;
        const rotateX = (0.5 - py) * 10;
        const artX = (0.5 - px) * 22;
        const artY = (0.5 - py) * 16;

        card.style.setProperty('--tilt-x', rotateX.toFixed(2) + 'deg');
        card.style.setProperty('--tilt-y', rotateY.toFixed(2) + 'deg');
        card.style.setProperty('--glow-x', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--glow-y', (py * 100).toFixed(1) + '%');
        card.style.setProperty('--art-x', artX.toFixed(1) + 'px');
        card.style.setProperty('--art-y', artY.toFixed(1) + 'px');
      });
    });

    card.addEventListener('pointerleave', reset);
    card.addEventListener('blur', reset, true);
  });

  document.querySelectorAll('[data-case-signal]').forEach((panel) => {
    let frame;

    const resetPanel = () => {
      cancelAnimationFrame(frame);
      panel.style.setProperty('--signal-x', '0px');
      panel.style.setProperty('--signal-y', '0px');
      panel.style.setProperty('--signal-rx', '0deg');
      panel.style.setProperty('--signal-ry', '0deg');
      panel.classList.remove('is-alive');
    };

    panel.addEventListener('pointerenter', () => panel.classList.add('is-alive'));
    panel.addEventListener('pointermove', (event) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = panel.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;

        panel.style.setProperty('--signal-x', ((px - 0.5) * 10).toFixed(1) + 'px');
        panel.style.setProperty('--signal-y', ((py - 0.5) * 8).toFixed(1) + 'px');
        panel.style.setProperty('--signal-rx', ((0.5 - py) * 5).toFixed(2) + 'deg');
        panel.style.setProperty('--signal-ry', ((px - 0.5) * 7).toFixed(2) + 'deg');
      });
    });
    panel.addEventListener('pointerleave', resetPanel);
  });

  document.querySelectorAll('.case-flow > section').forEach((panel, index) => {
    let frame;
    panel.style.setProperty('--case-index', String(index));

    const resetCasePanel = () => {
      cancelAnimationFrame(frame);
      panel.style.setProperty('--case-move-x', '0px');
      panel.style.setProperty('--case-move-y', '0px');
      panel.style.setProperty('--case-rx', '0deg');
      panel.style.setProperty('--case-ry', '0deg');
      panel.classList.remove('is-case-moving');
    };

    panel.addEventListener('pointerenter', () => panel.classList.add('is-case-moving'));
    panel.addEventListener('pointermove', (event) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = panel.getBoundingClientRect();
        const px = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const py = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
        const direction = index % 2 === 0 ? 1 : -1;

        panel.style.setProperty('--case-move-x', (((px - 0.5) * 14) + direction * 2).toFixed(1) + 'px');
        panel.style.setProperty('--case-move-y', (((py - 0.5) * 10) - 5).toFixed(1) + 'px');
        panel.style.setProperty('--case-rx', ((0.5 - py) * 5.5).toFixed(2) + 'deg');
        panel.style.setProperty('--case-ry', (((px - 0.5) * 7.5) + direction * 0.35).toFixed(2) + 'deg');
      });
    });
    panel.addEventListener('pointerleave', resetCasePanel);
  });

  const hero = document.querySelector('.hero');
  const heroPanel = document.querySelector('.ai-proof-board, .hero-panel');

  if (hero && heroPanel) {
    let heroFrame;

    hero.addEventListener('pointermove', (event) => {
      cancelAnimationFrame(heroFrame);
      heroFrame = requestAnimationFrame(() => {
        const rect = hero.getBoundingClientRect();
        const px = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const py = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

        hero.style.setProperty('--hero-x', (px * 100).toFixed(1) + '%');
        hero.style.setProperty('--hero-y', (py * 100).toFixed(1) + '%');
        heroPanel.style.setProperty('--panel-x', ((px - 0.5) * 7).toFixed(2) + 'px');
        heroPanel.style.setProperty('--panel-y', ((py - 0.5) * 7).toFixed(2) + 'px');
      });
    });

    hero.addEventListener('pointerleave', () => {
      hero.style.setProperty('--hero-x', '78%');
      hero.style.setProperty('--hero-y', '18%');
      heroPanel.style.setProperty('--panel-x', '0px');
      heroPanel.style.setProperty('--panel-y', '0px');
    });
  }
})();
