import { nvdaTest as test } from '@guidepup/playwright';
import { expect } from '@playwright/test';

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

const normalize = (value) =>
  value.replace(/\s+/g, ' ').trim().toLowerCase();

test('NVDA can reach the primary heading on every public page', async ({ page, nvda }) => {
  for (const route of routes) {
    await page.goto(route, { waitUntil: 'networkidle' });

    const h1 = page.locator('h1').first();
    await expect(h1, route + ' should have one visible H1').toBeVisible();
    const expected = normalize(await h1.innerText());

    await nvda.navigateToWebContent();
    await nvda.perform(nvda.keyboardCommands.moveToNextHeadingLevel1);

    const spoken = normalize(await nvda.lastSpokenPhrase());
    expect(spoken, 'NVDA H1 announcement for ' + route).toContain(expected);
  }
});

test('NVDA can discover the primary navigation links', async ({ page, nvda }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await nvda.navigateToWebContent();

  let foundNavigation = false;
  for (let i = 0; i < 6; i += 1) {
    await nvda.perform(nvda.keyboardCommands.moveToNextLandmark);
    const phrase = normalize(await nvda.lastSpokenPhrase());
    if (phrase.includes('navigation')) {
      foundNavigation = true;
      break;
    }
  }

  expect(foundNavigation, 'NVDA should reach the primary navigation landmark').toBe(true);

  const visited = [];
  for (let i = 0; i < 8; i += 1) {
    await nvda.perform(nvda.keyboardCommands.moveToNextLink);
    visited.push(normalize(await nvda.itemText()));
  }

  const joined = visited.join(' | ');
  for (const expected of ['work', 'harness engineering', "nolan's workshop", 'about', 'contact']) {
    expect(joined, 'NVDA navigation links should include ' + expected).toContain(expected);
  }
});

test('NVDA can activate the Workshop saw and hear the result', async ({ page, nvda }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/woodworking/', { waitUntil: 'networkidle' });
  await nvda.navigateToWebContent();

  let foundSaw = false;
  for (let i = 0; i < 24; i += 1) {
    await nvda.perform(nvda.keyboardCommands.moveToNextButton);
    const item = normalize(await nvda.itemText());
    if (item.includes('run the saw')) {
      foundSaw = true;
      break;
    }
  }

  expect(foundSaw, 'NVDA should discover the native saw button').toBe(true);

  await nvda.clearSpokenPhraseLog();
  await nvda.act();
  await page.waitForTimeout(800);

  const spoken = normalize((await nvda.spokenPhraseLog()).join(' '));
  expect(spoken, 'Workshop result should be announced by the live region').toContain('offcut removed');
});
