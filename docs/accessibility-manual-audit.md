# Manual assistive-technology audit

The automated accessibility gate covers axe WCAG 2.2 A/AA rules, reflow,
text spacing, keyboard flows, target size, and selected accessibility-tree
states. It does **not** replace testing with an actual screen reader.

Use this checklist before making a formal WCAG 2.2 AA conformance claim and
after any substantial navigation, interaction, or layout change.

## Windows — NVDA + Chrome

Test at minimum: Home, Work, Harness Engineering, Nolan's Workshop, one case
study, About, and Contact.

1. Start NVDA and Chrome with a fresh browser session.
2. Load the page and confirm the title is announced.
3. Press Tab once. "Skip to content" should be the first focusable item.
4. Activate it. Focus should move to the main content.
5. Navigate by landmarks. Header/navigation, main, and footer should be clear.
6. Navigate by headings. The page should have one useful H1 and a sensible
   hierarchy without skipped context.
7. Navigate by links and buttons. Names should make sense out of context.
8. Confirm decorative artwork is not announced as meaningless images.
9. At 200% and 400% browser zoom, confirm reading order remains sensible and
   no information requires horizontal scrolling except intentionally scrollable
   code.
10. Enable Windows High Contrast / forced colors and repeat the primary flows.

### Trail

1. Discover one Trail item so the Trail control appears.
2. Open the Trail with keyboard only.
3. Confirm the guide is announced and its controls are reachable.
4. Press Escape. Focus should return to the Trail toggle.
5. Complete the Trail in a test profile.
6. Confirm the completion dialog is announced as a dialog and background
   content is not reachable until the dialog is closed.
7. Test "Continue Exploring", "Pin the Badge", and the two-step reset.

### Harness Engineering

1. Focus the MODEL control and activate it with Enter/Space.
2. Confirm the Matrix experience is announced as a modal dialog.
3. Confirm focus lands on the close control.
4. Confirm Tab stays inside the dialog.
5. Press Escape and verify focus returns to MODEL.

### Nolan's Workshop

1. Reach "run the saw // yes, really" by Tab.
2. Activate it with Enter and Space.
3. Confirm the completion status is announced.
4. After sawdust appears, reach "Clear the bench without dragging".
5. Activate it with keyboard only and confirm the completion status is
   announced.
6. Verify no essential action requires hover, drag, or precise pointer motion.

## iPhone — VoiceOver + Safari

Repeat Home, Harness Engineering, Nolan's Workshop, and Contact.

1. Turn on VoiceOver.
2. Swipe through the page from the top.
3. Use the Rotor to inspect Headings, Links, Landmarks, and Form Controls.
4. Confirm navigation order follows the visual/content order.
5. Confirm buttons and links have concise, understandable names.
6. Confirm Trail controls, Matrix dialog, saw trigger, and reset controls can be
   activated with VoiceOver.
7. Rotate portrait/landscape and verify content remains usable.
8. Increase text size in iOS Accessibility settings and retest.
9. Confirm decorative graphics are skipped and no hidden overlay text is
   announced while its overlay is closed.

## Pass criteria

A manual run passes only when:

- all content and functionality are available without a mouse;
- screen-reader order matches the intended reading order;
- names, roles, states, and values are understandable;
- modal content owns focus while open and returns it correctly when closed;
- hidden content is not announced;
- status changes are announced when they matter;
- no interaction depends solely on hover, drag, color, animation, or precise
  pointer movement;
- zoom, larger text, portrait/landscape, and high-contrast modes do not remove
  information or functionality.

Record device, browser, screen-reader version, date, failures, and fixes for
each manual run.
