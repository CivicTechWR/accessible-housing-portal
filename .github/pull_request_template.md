Closes #

<!--
Put the issue number after "Closes #". If this PR covers only part of an issue, split that issue into sub-issues and close one.
Add this PR to the issue's milestone too, so it shows on the project board.
-->

## What changed

<!-- A few sentences: what was wrong or missing, and what this PR does about it. -->

## UI changes

<!--
Delete this whole section if the PR doesn't change the UI.

Components considered: list each shadcn or Radix option you considered, with pros and cons:
screen-reader semantics, keyboard support, mobile vs desktop, and any new dependencies.
Say why the one you chose won.
Example: Tabs over ToggleGroup for a show-one-pane switcher, because Tabs announces the panel it controls and supports arrow keys.

Screenshots: use CI's, so before and after show the same seeded data at the same sizes.
- After: this PR's "Playwright Screenshots" job, playwright-screenshots artifact.
- Before: the same artifact from the latest CI run on main.
Each artifact has screenshots/mobile/<page>.png (Pixel 7, 412px wide) and screenshots/desktop/<page>.png (1440px).
Drop the Before row for a brand-new page, and add the page to e2e/pages.ts so CI captures it.
For states CI doesn't capture (an open menu, an error, a step partway through a flow), take your own at the same sizes.
If the change is an interaction or a multi-step flow, add a short screen recording too.
-->

### Components considered

### Screenshots

|        | Mobile | Desktop |
| ------ | ------ | ------- |
| Before |                |         |
| After  |                |         |

## Testing

<!-- What you ran or checked, such as unit tests, lint, a screen reader, or keyboard-only navigation. -->
