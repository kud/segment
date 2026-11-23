# @kud/segment-ink

## 0.1.2

### Patch Changes

- e051d36: Keep the footer on screen on short and narrow terminals. The detail panels now give up settings rows before the footer is pushed off the bottom, re-budget when the window is resized rather than on the next keypress, and the catalog settings table fits inside its panel at 80 columns instead of running through the border.
- f5ad8ad: Upgrade to Ink 8 and React 19.3. `@kud/segment-ink` keeps accepting Ink 7 or 8 as a peer; the CLI now ships on Ink 8.

## 0.1.1

### Patch Changes

- 7f657f6: Move onto `@kud/ink-ui@0.21.0`, seven minors on from the `0.14.0` this package was pinned to. Nothing here changes: the only exports it uses are `SelectableRow`, `Table`, `colors` and `Column`, all unchanged across the range. The bump matters for what comes with the package rather than what it renders — `0.16.0` began shipping `AGENTS.md` inside the tarball, so `node_modules/@kud/ink-ui/AGENTS.md` now exists to be read, and the root `CLAUDE.md` added alongside this points at it. That brief carries what the type definitions cannot: which components own their own Ink `useInput` versus which are presentational, and the traps. A pin below `0.16.0` left an agent with nothing to read and a standing invitation to hand-roll a component the library already provides.
