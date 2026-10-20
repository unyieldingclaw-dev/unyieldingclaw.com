/**
 * Optional Matrix Easter egg for the system diagram; the page's static labels
 * remain available when this canvas effect is paused or unavailable.
 */
(() => {
  const trigger = document.querySelector('[data-matrix-trigger]');
  const overlay = document.querySelector('[data-matrix-overlay]');
  const canvas = document.querySelector('[data-matrix-canvas]');
  const close = document.querySelector('[data-matrix-close]');
  if (!trigger || !overlay || !canvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  let animationFrame;
  let stopTimer;
  let running = false;
  let neoBuffer = '';
  let previousFocus = null;

  const sizeCanvas = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const stopMatrix = ({ restoreFocus = true } = {}) => {
    running = false;
    cancelAnimationFrame(animationFrame);
    clearTimeout(stopTimer);
    overlay.classList.remove('is-active');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.inert = true;

    if (restoreFocus && previousFocus instanceof HTMLElement) {
      previousFocus.focus({ preventScroll: true });
    }
  };

  const startMatrix = () => {
    if (running) return;
    window.unyieldingTrailDiscover?.('harness-matrix', 'MATRIX FOUND');
    previousFocus = document.activeElement;
    running = true;
    overlay.inert = false;
    overlay.classList.add('is-active');
    overlay.setAttribute('aria-hidden', 'false');
    close?.focus({ preventScroll: true });

    if (reduceMotion) {
      stopTimer = setTimeout(stopMatrix, 2600);
      return;
    }

    sizeCanvas();
    const fontSize = 17;
    let columns = Math.ceil(window.innerWidth / fontSize);
    let drops = Array(columns).fill(0).map(() => Math.random() * -40);

    const draw = () => {
      if (!running) return;
      ctx.fillStyle = 'rgba(0, 8, 4, 0.11)';
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.fillStyle = '#53ff8a';
      ctx.font = fontSize + 'px ui-monospace, monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = Math.random() > 0.5 ? '1' : '0';
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > window.innerHeight && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.75 + Math.random() * 0.35;
      }

      animationFrame = requestAnimationFrame(draw);
    };

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    draw();
    stopTimer = setTimeout(stopMatrix, 5200);
  };

  trigger.addEventListener('click', startMatrix);
  close?.addEventListener('click', stopMatrix);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay || event.target === canvas) stopMatrix();
  });

  document.addEventListener('keydown', (event) => {
    if (running && event.key === 'Tab') {
      event.preventDefault();
      close?.focus();
      return;
    }

    if (event.key === 'Escape' && running) {
      stopMatrix();
      return;
    }
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;
    if (event.key.length !== 1) return;
    neoBuffer = (neoBuffer + event.key.toLowerCase()).slice(-3);
    if (neoBuffer === 'neo') {
      startMatrix();
      neoBuffer = '';
    }
  });

  window.addEventListener('resize', () => {
    if (running && !reduceMotion) sizeCanvas();
  }, { passive: true });
})();
