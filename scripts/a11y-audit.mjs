import { chromium, webkit } from 'playwright';
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

const wcagTags = ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa'];
let failures = 0;

const fail = (message) => {
  failures += 1;
  console.error('\n❌ ' + message);
};

const compactNodes = (violation) =>
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
      const response = await page.goto(new URL(route, baseURL).toString(), { waitUntil: 'networkidle' });

      if (!response || response.status() >= 400) {
        fail(`${viewport.name} ${route}: HTTP ${response?.status() ?? 'no response'}`);
        await page.close();
        continue;
      }

      const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
      for (const violation of results.violations) {
        fail(
          `${viewport.name} ${route}: axe ${violation.id} — ${violation.help}\n` +
          compactNodes(violation)
        );
      }

      const reflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));

      if (reflow.scrollWidth > reflow.clientWidth + 2) {
        fail(`${viewport.name} ${route}: horizontal overflow ${reflow.scrollWidth}px > ${reflow.clientWidth}px`);
      }

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

      const spacing = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));

      if (spacing.scrollWidth > spacing.clientWidth + 2) {
        fail(`${viewport.name} ${route}: text-spacing causes horizontal overflow ${spacing.scrollWidth}px > ${spacing.clientWidth}px`);
      }

      await page.close();
    }

    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

    for (const route of routes) {
      const page = await context.newPage();
      await page.goto(new URL(route, baseURL).toString(), { waitUntil: 'networkidle' });
      await page.keyboard.press('Tab');

      const first = await page.evaluate(() => ({
        className: document.activeElement?.className || '',
        text: document.activeElement?.textContent?.trim() || '',
      }));

      if (!String(first.className).includes('skip-link')) {
        fail(`${route}: first keyboard focus is not the skip link (got "${first.text}")`);
      } else {
        await page.keyboard.press('Enter');
        const focusedMain = await page.evaluate(() => document.activeElement?.id === 'main-content');
        if (!focusedMain) fail(`${route}: skip link did not move focus to main content`);
      }

      await page.close();
    }

    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(new URL('/harness-engineering/', baseURL).toString(), { waitUntil: 'networkidle' });

    const trigger = page.locator('[data-matrix-trigger]');
    await trigger.focus();
    await page.keyboard.press('Enter');

    if (await page.locator('[data-matrix-overlay]').getAttribute('aria-hidden') !== 'false') {
      fail('Harness Matrix: dialog did not expose itself to assistive technology');
    }

    if (!(await page.evaluate(() => document.activeElement?.hasAttribute('data-matrix-close')))) {
      fail('Harness Matrix: focus did not move to the close control');
    }

    await page.keyboard.press('Escape');

    if (!(await page.evaluate(() => document.activeElement?.hasAttribute('data-matrix-trigger')))) {
      fail('Harness Matrix: Escape did not return focus to the trigger');
    }

    await page.close();
    await context.close();
  }

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
      fail('Trail guide: open panel remains inert or aria-hidden');
    }

    await page.keyboard.press('Escape');

    if (!(await page.evaluate(() => document.activeElement?.classList.contains('trail-guide__toggle')))) {
      fail('Trail guide: Escape did not return focus to the toggle');
    }

    await page.close();
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(new URL('/woodworking/', baseURL).toString(), { waitUntil: 'networkidle' });

    const saw = page.locator('[data-saw-cut]');
    const sawTrigger = page.locator('[data-saw-trigger]');
    await sawTrigger.focus();
    await page.keyboard.press('Enter');

    if (!(await saw.evaluate((el) => el.classList.contains('is-cutting') || el.classList.contains('is-cut')))) {
      fail('Workshop saw: Enter does not start or complete the interaction');
    }

    await page.waitForTimeout(2400);

    const clearButton = page.locator('[data-bench-clear]');
    if (!(await clearButton.isVisible())) {
      fail('Workshop bench: non-drag clear control is not available after the cut');
    } else {
      await clearButton.focus();
      await page.keyboard.press('Enter');
      if (!(await page.locator('[data-sawdust-bench]').evaluate((el) => el.classList.contains('is-cleared')))) {
        fail('Workshop bench: keyboard non-drag clear control did not clear the bench');
      }
    }

    await page.close();
    await context.close();
  }

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
        fail(`${route}: target smaller than 24×24 CSS px (${target.width}×${target.height}) — ${target.target}`);
      }

      await page.close();
    }

    await context.close();
  }
} finally {
  await browser.close();
}

// Mobile Safari regression checks. Chromium catches accessibility structure;
// WebKit catches the touch/keyboard behavior that actually runs on iPhone.
{
  const safari = await webkit.launch({ headless: true });

  try {
    const context = await safari.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'no-preference',
    });

    // Workshop saw: both the visible control and the coarse-pointer board path
    // must start a real moving animation in WebKit.
    {
      const page = await context.newPage();
      await page.goto(new URL('/woodworking/', baseURL).toString(), { waitUntil: 'networkidle' });

      const stage = page.locator('[data-saw-cut]');
      const saw = page.locator('[data-circular-saw]');
      const trigger = page.locator('[data-saw-trigger]');

      const start = await saw.boundingBox();
      await trigger.tap();
      await page.waitForTimeout(350);
      const moving = await saw.boundingBox();

      if (!start || !moving || Math.abs(moving.x - start.x) < 20) {
        fail('Mobile Safari: Workshop saw did not visibly move after tapping the trigger');
      }

      if (!(await stage.evaluate((el) => el.classList.contains('is-cutting') || el.classList.contains('is-cut')))) {
        fail('Mobile Safari: Workshop saw did not enter the cut state');
      }

      await page.close();
    }

    // MIZ: iPhone has no hardware keyboard, so the footer keyboard clue must
    // expose an input, focus it from the tap, and trigger ZOU without Enter.
    {
      const page = await context.newPage();
      await page.goto(new URL('/', baseURL).toString(), { waitUntil: 'networkidle' });

      const keyboardClue = page.locator('[data-miz-keyboard]');
      // WebKit can wait forever for this footer control to become stable.
      // Scroll it into view and dispatch the tap; assert the opened input and focus below.
      await keyboardClue.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await keyboardClue.tap({ force: true });

      const input = page.locator('[data-miz-input]');
      if (!(await input.isVisible())) {
        fail('Mobile Safari: MIZ keyboard clue did not reveal the input');
      }

      const focused = await page.evaluate(() => document.activeElement?.hasAttribute('data-miz-input'));
      if (!focused) {
        fail('Mobile Safari: MIZ input did not receive focus from the tap');
      }

      await input.fill('MIZ');

      if (await page.locator('[data-miz-takeover]').getAttribute('aria-hidden') !== 'false') {
        fail('Mobile Safari: typing MIZ did not trigger ZOU');
      }

      await page.close();
    }

    await context.close();
  } finally {
    await safari.close();
  }
}

if (failures) {
  console.error(`\nAccessibility audit failed with ${failures} issue(s).\n`);
  process.exit(1);
}

console.log('\n✅ Automated WCAG 2.2 AA audit passed for all routes and viewports.\n');
