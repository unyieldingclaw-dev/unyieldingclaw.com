/**
 * Nolan's Workshop plaque, cutting-table, and bench interactions.
 * The boards move only when the visitor starts the demo; reduced-motion users
 * get the same reveal without the saw travel.
 */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;


  // Dust drops from the plaque's top edge, crosses the lettering, then settles
  // along the bottom rule. Keep the particles sparse enough to read through.
  const plaque = document.querySelector('[data-workshop-plaque]');
  const plaqueDust = plaque?.querySelector('[data-plaque-dust]');
  let plaqueBusy = false;

  const shedPlaqueDust = () => {
    if (!plaque || !plaqueDust || plaqueBusy || reduceMotion ||
        document.documentElement.classList.contains('motion-paused')) return;

    plaqueBusy = true;
    plaqueDust.querySelectorAll('i').forEach((chip) => chip.remove());
    plaque.classList.remove('is-dusting');
    // Restart the dust bank animation on each new pass.
    void plaque.offsetWidth;
    plaque.classList.add('is-dusting');

    const travel = Math.max(80, plaqueDust.clientHeight - 15);
    for (let i = 0; i < 56; i += 1) {
      const chip = document.createElement('i');
      const size = 3 + (i % 5);
      const left = 4 + (i * 37 % 91);
      const drift = (i % 2 ? 1 : -1) * (7 + i % 5 * 4);
      chip.style.cssText = `left:${left}%;width:${size}px;height:${Math.max(2, size - 2)}px;background:${i % 3 ? '#a87545' : '#d4a367'}`;
      plaqueDust.append(chip);

      chip.animate([
        { transform: 'translate3d(0, -12px, 0) rotate(0deg)', opacity: 0 },
        { transform: 'translate3d(0, 12px, 0) rotate(20deg)', opacity: 0.82, offset: 0.12 },
        { transform: `translate3d(${drift}px, ${travel * 0.72}px, 0) rotate(${110 + i * 13}deg)`, opacity: 0.72, offset: 0.72 },
        { transform: `translate3d(${drift * 1.35}px, ${travel - size}px, 0) rotate(${140 + i * 17}deg)`, opacity: 0.74 }
      ], {
        duration: 1450 + i % 7 * 65,
        delay: i % 11 * 42,
        easing: 'cubic-bezier(.25,.08,.64,.94)',
        fill: 'forwards'
      });
    }

    // Once the chips land, the dust bank remains for the brush to clear.
    window.setTimeout(() => plaqueDust.querySelectorAll('i').forEach((chip) => chip.remove()), 2500);
    // A few loose flecks converge on the nozzle while the canister is parked.
    window.setTimeout(() => {
      const width = plaqueDust.clientWidth;
      const height = plaqueDust.clientHeight;
      const nozzleX = width - 166;
      for (let i = 0; i < 18; i += 1) {
        const fleck = document.createElement('i');
        const startX = width * (0.07 + (i * 29 % 87) / 100);
        const size = 2 + i % 3;
        fleck.className = 'plaque-dust__suction';
        fleck.style.cssText = `left:${startX}px;top:${height - 11 - i % 4 * 3}px;width:${size}px;height:${size}px;background:#ad7847`;
        plaqueDust.append(fleck);
        fleck.animate([
          { transform: 'translate3d(0,0,0)', opacity: .8 },
          { transform: `translate3d(${nozzleX - startX}px,-22px,0)`, opacity: 0 }
        ], { duration: 580 + i % 4 * 110, delay: i % 6 * 65, easing: 'ease-in', fill: 'forwards' });
      }
    }, 3000);
    window.setTimeout(() => {
      plaque.classList.remove('is-dusting');
      plaqueDust.querySelectorAll('i').forEach((chip) => chip.remove());
      plaqueBusy = false;
    }, 5600);
  };

  plaque?.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') shedPlaqueDust();
  });
  plaque?.addEventListener('focusin', shedPlaqueDust);
  plaque?.addEventListener('pointerup', (event) => {
    if (event.pointerType !== 'mouse') shedPlaqueDust();
  });

  const cutStage = document.querySelector('[data-saw-cut]');
  const cutTrigger = document.querySelector('[data-saw-trigger]');
  const shopLive = document.querySelector('[data-shop-live]');
  const dustBurst = document.querySelector('[data-saw-dust]');
  const bench = document.querySelector('[data-sawdust-bench]');
  const canvas = document.querySelector('[data-sawdust-canvas]');
  const wipeCue = bench?.querySelector('[data-wipe-cue]');
  const benchClear = bench?.querySelector('[data-bench-clear]');
  const benchImpact = bench?.querySelector('[data-bench-impact]');

  let cutting = false;
  let cutComplete = false;
  let brushing = false;
  let benchDustStarted = false;
  let benchDustFinished = false;
  let benchRevealComplete = false;

  const cleanGrid = {
    columns: 18,
    rows: 12,
    threshold: 0.82,
    cells: new Set(),
  };

  const ctx = canvas?.getContext('2d');

  const sizeBenchCanvas = () => {
    if (!bench || !canvas || !ctx) return;
    const rect = bench.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
  };

  const clearBenchCompletely = () => {
    if (!bench || !canvas || !ctx) return;
    const rect = bench.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    bench.classList.remove('is-dusty', 'is-buried', 'is-cleaning', 'is-cleared', 'is-revealing', 'is-revealed');
    benchDustStarted = false;
    benchDustFinished = false;
    benchRevealComplete = false;
    cleanGrid.cells.clear();
    if (benchClear) benchClear.hidden = true;
  };

  const depositBenchDust = (progress, finalPass = false) => {
    if (!bench || !canvas || !ctx) return;
    const rect = bench.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    if (!benchDustStarted) {
      benchDustStarted = true;
      bench.classList.add('is-dusty');
    }

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    const dustColors = [
      '#d8b77f',
      '#cda56d',
      '#e3c58f',
      '#b9854f',
      '#efd9ad',
      '#a96f3d'
    ];

    const drawParticle = (x, y, size, alpha, color, angle = 0, aspect = 1) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.scale(aspect, 1);
      ctx.beginPath();
      ctx.ellipse(0, 0, size, Math.max(0.35, size * 0.42), 0, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.restore();
    };

    const addRandomDust = (count, density = 1, centerBias = false) => {
      for (let i = 0; i < count; i++) {
        const biased = centerBias && Math.random() < 0.58;
        const x = biased
          ? rect.width * (0.16 + Math.random() * 0.68)
          : Math.random() * rect.width;

        // Fine dust settles everywhere, but there is a little more material
        // toward the lower half and left edge where the saw is feeding it.
        const settle = Math.pow(Math.random(), 0.82);
        let y = rect.height * (0.08 + settle * 0.9);
        if (Math.random() < 0.22) y = rect.height * (0.56 + Math.random() * 0.4);

        const fine = Math.random() < 0.86;
        const size = fine
          ? 0.35 + Math.random() * (1.35 + density * 0.75)
          : 1.8 + Math.random() * (3.6 + density * 1.3);

        const alpha = fine
          ? 0.24 + Math.random() * (0.34 + density * 0.12)
          : 0.34 + Math.random() * (0.36 + density * 0.12);

        const angle = Math.random() * Math.PI;
        const aspect = fine ? 0.75 + Math.random() * 1.3 : 1.2 + Math.random() * 2.4;
        const color = dustColors[Math.floor(Math.random() * dustColors.length)];

        drawParticle(x, y, size, alpha, color, angle, aspect);

        // Occasional paired flecks create little clumps instead of a perfect spray.
        if (!fine && Math.random() < 0.38) {
          drawParticle(
            x + (-4 + Math.random() * 8),
            y + (-3 + Math.random() * 6),
            size * (0.35 + Math.random() * 0.45),
            alpha * 0.72,
            dustColors[Math.floor(Math.random() * dustColors.length)],
            Math.random() * Math.PI,
            0.8 + Math.random() * 1.8
          );
        }
      }
    };

    const addBottomDrift = (count, strength) => {
      for (let i = 0; i < count; i++) {
        const x = Math.random() * rect.width;
        const edgeNoise = Math.sin(x * 0.031) * 6 + Math.sin(x * 0.073) * 3;
        const y = rect.height - (4 + Math.random() * (18 + strength * 34)) + edgeNoise;
        const size = 0.8 + Math.random() * (2.5 + strength * 2.4);
        const color = dustColors[Math.floor(Math.random() * dustColors.length)];

        drawParticle(
          x,
          Math.min(rect.height - 2, Math.max(rect.height * 0.64, y)),
          size,
          0.34 + Math.random() * 0.48,
          color,
          Math.random() * Math.PI,
          0.9 + Math.random() * 2.2
        );
      }
    };

    if (!finalPass) {
      // Each animation tick adds a little more mess. No smooth gradient,
      // just progressively denser particulate.
      addRandomDust(58, 0.35 + progress * 0.8, progress > 0.45);
      addBottomDrift(16, progress);
    } else {
      // Final pass: bury the message with dense, irregular fine dust.
      addRandomDust(2600, 1.15, true);
      addBottomDrift(900, 1.2);

      // A broad band of fine dust across the message area. Still granular:
      // many tiny specks, never a filled radial blob.
      for (let i = 0; i < 1600; i++) {
        const x = rect.width * (0.08 + Math.random() * 0.84);
        const y = rect.height * (0.27 + Math.random() * 0.5);
        const size = 0.35 + Math.random() * 1.8;
        const color = dustColors[Math.floor(Math.random() * dustColors.length)];

        drawParticle(
          x,
          y,
          size,
          0.38 + Math.random() * 0.42,
          color,
          Math.random() * Math.PI,
          0.8 + Math.random() * 2
        );
      }

      // A few irregular piles made of overlapping particles, not gradients.
      const pileCenters = [
        [0.24, 0.62],
        [0.47, 0.54],
        [0.68, 0.61],
        [0.82, 0.72]
      ];

      pileCenters.forEach(([px, py], pileIndex) => {
        const spreadX = rect.width * (0.09 + pileIndex * 0.005);
        const spreadY = rect.height * (0.07 + pileIndex * 0.004);

        for (let i = 0; i < 360; i++) {
          const theta = Math.random() * Math.PI * 2;
          const radius = Math.sqrt(Math.random());
          const x = rect.width * px + Math.cos(theta) * spreadX * radius;
          const y = rect.height * py + Math.sin(theta) * spreadY * radius;
          const size = 0.55 + Math.random() * 2.7;

          drawParticle(
            x,
            y,
            size,
            0.4 + Math.random() * 0.45,
            dustColors[Math.floor(Math.random() * dustColors.length)],
            Math.random() * Math.PI,
            0.8 + Math.random() * 2.2
          );
        }
      });
    }

    ctx.globalAlpha = 1;
    ctx.restore();

    if (finalPass) {
      benchDustFinished = true;
      bench.classList.add('is-buried');
      if (benchClear) benchClear.hidden = false;
    }
  };

  const spawnDust = (progress) => {
    if (!dustBurst) return;

    const engaged = progress > 0.055 && progress < 0.955;
    const count = engaged ? 7 : 3;

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('i');
      const chip = Math.random() < 0.28;
      const x = Math.max(2, Math.min(98, 98 - progress * 96));

      particle.classList.toggle('is-chip', chip);
      particle.style.setProperty('--x', x + '%');
      particle.style.setProperty('--dx', (26 + Math.random() * (chip ? 88 : 54)) + 'px');
      particle.style.setProperty('--dy', (-46 + Math.random() * (chip ? 92 : 70)) + 'px');
      particle.style.setProperty('--spin', (-220 + Math.random() * 440) + 'deg');
      particle.style.setProperty('--size', (chip ? 3.4 + Math.random() * 5.2 : 1.1 + Math.random() * 3.2) + 'px');
      particle.style.setProperty('--life', (chip ? 0.72 + Math.random() * 0.42 : 0.52 + Math.random() * 0.38) + 's');
      particle.style.setProperty('--alpha', (0.58 + Math.random() * 0.34).toFixed(2));
      dustBurst.appendChild(particle);
      setTimeout(() => particle.remove(), 1250);
    }
  };

  const runCut = () => {
    if (!cutStage || cutting || cutComplete) return;
    window.unyieldingTrailDiscover?.('workshop-saw', 'SHOP TRAIL FIND');
    cutting = true;

    if (bench && canvas && ctx) {
      clearBenchCompletely();
      bench.classList.add('is-cut-active');
    }

    if (reduceMotion) {
      cutStage.classList.add('is-cut');
      depositBenchDust(1, true);
      bench?.classList.remove('is-cut-active');
      cutComplete = true;
      cutting = false;
      if (shopLive) shopLive.textContent = 'Offcut removed. Measure twice. Cut once. Stare at it for 20 minutes anyway.';
      return;
    }

    cutStage.classList.add('is-cutting');
    const started = performance.now();
    const duration = 2150;
    let lastDustAt = 0;
    let lastBenchDustAt = 0;

    const emit = (now) => {
      const progress = Math.min(1, (now - started) / duration);

      if (now - lastDustAt > 52) {
        spawnDust(progress);
        lastDustAt = now;
      }

      if (now - lastBenchDustAt > 72) {
        depositBenchDust(progress, false);
        lastBenchDustAt = now;
      }

      if (progress >= 0.055) cutStage.classList.add('is-cut-engaged');
      if (progress >= 0.90) cutStage.classList.add('is-cut-clearing');

      if (progress < 1 && cutting) {
        requestAnimationFrame(emit);
      } else {
        depositBenchDust(1, true);
        bench?.classList.remove('is-cut-active');
      }
    };
    requestAnimationFrame(emit);

    setTimeout(() => {
      cutStage.classList.add('is-cut');
      cutStage.classList.remove('is-cutting', 'is-cut-engaged', 'is-cut-clearing');
      cutComplete = true;
      cutting = false;
      if (shopLive) shopLive.textContent = 'Offcut removed. Measure twice. Cut once. Stare at it for 20 minutes anyway.';
    }, duration);
  };

  cutStage?.addEventListener('pointerenter', () => {
    if (finePointer) runCut();
  });

  // Desktop keeps the hover surprise. On touch devices the whole board is
  // tappable, with the visible button as the obvious/accessibility-safe path.
  cutStage?.addEventListener('click', (event) => {
    if (finePointer) return;
    if (event.target instanceof Element && event.target.closest('[data-saw-trigger]')) return;
    runCut();
  });

  cutTrigger?.addEventListener('click', runCut);

  const markCleanCoverage = (x, y, radius, rect) => {
    const cellWidth = rect.width / cleanGrid.columns;
    const cellHeight = rect.height / cleanGrid.rows;
    const effectiveRadius = radius * 0.92;

    for (let row = 0; row < cleanGrid.rows; row++) {
      for (let column = 0; column < cleanGrid.columns; column++) {
        const cellX = (column + 0.5) * cellWidth;
        const cellY = (row + 0.5) * cellHeight;
        const distance = Math.hypot(cellX - x, cellY - y);

        if (distance <= effectiveRadius) {
          cleanGrid.cells.add(row * cleanGrid.columns + column);
        }
      }
    }

    return cleanGrid.cells.size / (cleanGrid.columns * cleanGrid.rows);
  };

  const kickUpImpactDust = () => {
    if (!benchImpact || reduceMotion) return;
    benchImpact.replaceChildren();

    for (let i = 0; i < 34; i++) {
      const particle = document.createElement('i');
      const angle = (-165 + Math.random() * 150) * Math.PI / 180;
      const distance = 24 + Math.random() * 68;
      particle.style.setProperty('--impact-x', (Math.cos(angle) * distance).toFixed(1) + 'px');
      particle.style.setProperty('--impact-y', (Math.sin(angle) * distance - 8).toFixed(1) + 'px');
      particle.style.setProperty('--impact-r', (-160 + Math.random() * 320).toFixed(0) + 'deg');
      particle.style.setProperty('--impact-size', (1.5 + Math.random() * 4.5).toFixed(1) + 'px');
      particle.style.setProperty('--impact-delay', (Math.random() * 90).toFixed(0) + 'ms');
      benchImpact.appendChild(particle);
    }

    benchImpact.classList.remove('is-puffing');
    void benchImpact.offsetWidth;
    benchImpact.classList.add('is-puffing');
    setTimeout(() => benchImpact.replaceChildren(), 1050);
  };

  const revealCleanBench = () => {
    if (!bench || !canvas || !ctx || benchRevealComplete) return;
    benchRevealComplete = true;
    benchDustFinished = false;

    const rect = bench.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    bench.classList.remove('is-buried', 'is-cleaning');
    bench.classList.add('is-cleared');
    if (benchClear) benchClear.hidden = true;
    window.unyieldingTrailDiscover?.('workshop-dust', 'SAWDUST TRAIL FIND');
    if (shopLive) shopLive.textContent = 'Bench cleared. Congratulations. You have now cleaned more of my shop than I have today.';

    requestAnimationFrame(() => {
      bench.classList.add('is-revealing');

      if (reduceMotion) {
        bench.classList.add('is-revealed');
        return;
      }

      setTimeout(kickUpImpactDust, 680);
      setTimeout(() => {
        bench.classList.remove('is-revealing');
        bench.classList.add('is-revealed');
      }, 1220);
    });
  };

  const clearDust = (event) => {
    if (!bench || !canvas || !ctx || !benchDustFinished || benchRevealComplete) return;
    if (!finePointer && !brushing) return;

    bench.classList.add('is-cleaning');

    const rect = bench.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const radius = finePointer ? 66 : 56;
    const gradient = ctx.createRadialGradient(x, y, 5, x, y, radius);
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(0.62, 'rgba(0,0,0,0.94)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const cleaned = markCleanCoverage(x, y, radius, rect);
    if (cleaned >= cleanGrid.threshold) revealCleanBench();
  };

  benchClear?.addEventListener('click', revealCleanBench);

  if (bench && canvas && ctx) {
    sizeBenchCanvas();
    clearBenchCompletely();

    bench.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'touch' || event.pointerType === 'pen') {
        brushing = true;
        clearDust(event);
      }
    });

    bench.addEventListener('pointermove', clearDust);

    const stopBrushing = () => {
      brushing = false;
    };

    bench.addEventListener('pointerup', stopBrushing);
    bench.addEventListener('pointercancel', stopBrushing);

    window.addEventListener('resize', () => {
      const wasDusty = benchDustFinished && !benchRevealComplete;
      const wasRevealed = benchRevealComplete;
      sizeBenchCanvas();

      if (wasDusty) {
        cleanGrid.cells.clear();
        depositBenchDust(1, true);
      }

      if (wasRevealed) {
        const rect = bench.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
      }
    }, { passive: true });
  }
})();
