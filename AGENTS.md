<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Deployment context

For deployment or environment work, read `local/deployment.md` if it exists.

## UI and PR conventions

1. **shadcn first.** Before building a UI control, check `components/ui/` and the shadcn catalog. Add missing components with `npx shadcn@latest add <name>` (config in `components.json`: style `radix-mira`, hugeicons, the `cn` helper from `@/lib/utils`), then format the generated files with oxfmt (`npm run format`). Import Radix primitives from the existing `radix-ui` package; don't add individual `@radix-ui/*` packages.
2. **Compare the options before choosing.** List each reasonable shadcn or Radix candidate with pros and cons: what a screen reader announces, keyboard behaviour, mobile vs desktop layout, new dependencies and maintenance. Recommend one and put the comparison in the PR description. Example: for a "show one pane at a time" switcher, Tabs beat ToggleGroup, because a single-select ToggleGroup is announced as radio buttons rather than tabs that control a panel.
3. **Prefer CSS breakpoints over JS for layout.** Use Tailwind responsive classes to show, hide or rearrange content. Reach for a JS media-query hook only when the component structure itself has to change, and reuse the shared `useMediaQuery` hook in `lib/` if one exists instead of writing another.
4. **One issue per branch and per PR.** Every PR body starts with `Closes #N`. If a PR covers only part of an issue, split that issue into sub-issues and close one; `Part of #N` is only a mention, so it doesn't link the PR or put it on the project board. Add the PR to the issue's milestone so it shows up on the project board.
