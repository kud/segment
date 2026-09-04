---
"@kud/segment-ink": patch
---

Move onto `@kud/ink-ui@0.21.0`, seven minors on from the `0.14.0` this package was pinned to. Nothing here changes: the only exports it uses are `SelectableRow`, `Table`, `colors` and `Column`, all unchanged across the range. The bump matters for what comes with the package rather than what it renders — `0.16.0` began shipping `AGENTS.md` inside the tarball, so `node_modules/@kud/ink-ui/AGENTS.md` now exists to be read, and the root `CLAUDE.md` added alongside this points at it. That brief carries what the type definitions cannot: which components own their own Ink `useInput` versus which are presentational, and the traps. A pin below `0.16.0` left an agent with nothing to read and a standing invitation to hand-roll a component the library already provides.
