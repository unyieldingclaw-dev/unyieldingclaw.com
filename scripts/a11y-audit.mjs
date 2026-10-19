import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const baseURL = process.env.A11Y_BASE_URL || 'http://127.0.0.1:4321';

const routes = [
  '/',
  '/work/',
  '/harness-engineering/',
  '/woodworking/',
  '/about/',
  '/contact/',
  '/work/personal-memory-bank/',
  '/work/ai-code-review-agent/',
  '/work/side-quest-atlas/',
  '/work/pitlogic/',
  '/work/tipsy-bunghole/',
  '/work/bowling-tracker/',
];

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'reflow-320', width: 320, height: 900 },
];

const wcagTags = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22a',
  'wcag22aa',
];

let failures = 0;

const logFailure = (message) => {
  failures += 1;
  console.error('\n❌ ' + message);
};

const formatNodes = (violation) =>
  violation.nodes.slice(0, 5).map((node) => '    - ' + node.target.join(' ')).join('\n');

const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: 'reduce',
    });

    for (const route of routes) {
      const page = await context.newPage();
      const url = new URL(route, baseURL).toString();
      const response = await page.goto(url, { waitUntil: 'networkidle' });

      if (!response || response.status() >= 400) {
        logFailure(`${viewport.name} ${route}: page returned ${response?.status() ?? 'no response'}`);
        await page.close();
        continue;
      }

      const results = await new AxeBuilder({ page })
        .withTags(wcagTags)
        .analyze();

      if (results.violations.length) {
        for (const violation of results.violations) {
          logFailure(
            `${viewport.name} ${route}: axe ${violation.id} — ${violation.help}\n` +
            formatNodes(violation)
          );
        }
      }

      const reflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));

      if (reflow.scrollWidth > reflow.clientWidth + 2) {
        logFailure(
          `${viewport.name} ${route}: horizontal overflow ${reflow.scrollWidth}px > ${reflow.clientWidth}px`
        );
      }

      // Text-spacing stress test for WCAG 1.4.12.
      await page.addStyleTag({
        content: `
          * {
            line-height: 1.5 !important;
            letter-spacing: 0.12em !important;
            word-spacing: 0.16em !important;
          }
          p, li, blockquote { margin-bottom: 2em !important; }
        `,
      });

      const spacingOverflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));

      if (spacingOverflow.scrollWidth > spacingOverflow.clientWidth + 2) {
        logFailure(
          `${viewport.name} ${route}: text-spacing causes horizontal overflow ${spacingOverflow.scrollWidth}px > ${spacingOverflow.clientWidth}px`
        );
      }

      await page.close();
    }

    await context.close();
  }

  // Keyboard skip-link audit on every route.
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

    for (const route of routes) {
      const page = await context.newPage();
      await page.goto(new URL(route, baseURL).toString(), { waitUntil: 'networkidle' });
      await page.keyboard.press('Tab');

      const firstFocus = await page.evaluate(() => ({
        className: document.activeElement?.className || '',
        text: document.activeElement?.textContent?.trim() || '',
      }));

      if (!String(firstFocus.className).includes('skip-link')) {
        logFailure(`${route}: first keyboard focus is not the skip link (got "${firstFocus.text}")`);
      } else {
        await page.keyboard.press('Enter');
        const focusedMain = await page.evaluate(() => document.activeElement?.id === 'main-content');
        if (!focusedMain) logFailure(`${route}: skip link did not move focus to main content`);
      }

      await page.close();
    }

    await context.close();
  }

  // Harness dialog keyboard/focus behavior.
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(new URL('/harness-engineering/', baseURL).toString(), { waitUntil: 'networkidle' });

    const trigger = page.locator('[data-matrix-trigger]');
    await trigger.focus();
    await page.keyboard.press('Enter');

    const opened = await page.locator('[data-matrix-overlay]').getAttribute('aria-hidden');
    if (opened !== 'false') logFailure('Harness Matrix: dialog did not expose itself to assistive technology');

    const closeFocused = await page.evaluate(() => document.activeElement?.hasAttribute('data-matrix-close'));
    if (!closeFocused) logFailure('Harness Matrix: focus did not move to the close control');

    await page.keyboard.press('Escape');
    const returned = await page.evaluate(() => document.activeElement?.hasAttribute('data-matrix-trigger'));
    if (!returned) logFailure('Harness Matrix: Escape did not return focus to the trigger');

    await page.close();
    await context.close();
  }

  // Trail guide keyboard behavior when progress exists.
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();

    await page.addInitScript(() => {
      localStorage.setItem('unyielding-claw-trail-v2', JSON.stringify(['home-basecamp']));
    });

    await page.goto(new URL('/', baseURL).toString(), { waitUntil: 'networkidle' });
    const toggle = page.locator('.trail-guide__toggle');

    await toggle.focus();
    await page.keyboard.press('Enter');

    const panelState = await page.locator('.trail-guide__panel').evaluate((el) => ({
      inert: el.inert,
      hidden: el.getAttribute('aria-hidden'),
    }));

    if (panelState.inert || panelState.hidden !== 'false') {
      logFailure('Trail guide: open panel remains inert or aria-hidden');
    }

    await page.keyboard.press('Escape');

    const trailReturned = await page.evaluate(() => document.activeElement?.classList.contains('trail-guide__toggle'));
    if (!trailReturned) logFailure('Trail guide: Escape did not return focus to the toggle');

    await page.close();
    await context.close();
  }

  // Workshop interactions: saw is keyboard-triggerable and wiping is not required.
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(new URL('/woodworking/', baseURL).toString(), { waitUntil: 'networkidle' });

    const saw = page.locator('[data-saw-cut]');
    await saw.focus();
    await page.keyboard.press('Enter');

    const cutting = await saw.evaluate((el) => el.classList.contains('is-cutting'));
    if (!cutting) logFailure('Workshop saw: Enter does not start the interaction');

    await page.waitForTimeout(2400);

    const clearButton = page.locator('[data-bench-clear]');
    if (!(await clearButton.isVisible())) {
      logFailure('Workshop bench: non-drag clear control is not available after the cut');
    } else {
      await clearButton.focus();
      await page.keyboard.press('Enter');
      const cleared = await page.locator('[data-sawdust-bench]').evaluate((el) => el.classList.contains('is-cleared'));
      if (!cleared) logFailure('Workshop bench: keyboard non-drag clear control did not clear the bench');
    }

    await page.close();
    await context.close();
  }

  // Minimum target-size check for control-like elements. Inline text links are
  // intentionally excluded because WCAG 2.5.8 provides an inline exception.
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

    for (const route of routes) {
      const page = await context.newPage();
      await page.goto(new URL(route, baseURL).toString(), { waitUntil: 'networkidle' });

      const undersized = await page.evaluate(() => {
        const selectors = [
          'button',
          '[role="button"]',
          'nav a',
          '.button',
          '.trail-marker',
          '.trail-guide__toggle',
          '.footer-key-clue',
        ];

        return [...document.querySelectorAll(selectors.join(','))]
          .filter((el) => {
            if (!(el instanceof HTMLElement)) return false;
            const style = getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || el.hidden) return false;
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && (rect.width < 24 || rect.height < 24);
          })
          .map((el) => {
            const rect = el.getBoundingClientRect();
            return {
              target: el.outerHTML.slice(0, 180),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            };
          });
      });

      for (const target of undersized) {
        logFailure(
          `${route}: target smaller than 24×24 CSS px (${target.width}×${target.height}) — ${target.target}`
        );
      }

      await page.close();
    }

    await context.close();
  }
} finally {
  await browser.close();
}

if (failures) {
  console.error(`\nAccessibility audit failed with ${failures} issue(s).\n`);
  process.exit(1);
}

console.log('\n✅ Automated WCAG 2.2 AA audit passed for all routes and viewports.\n');
