---
"@kud/segment-cli": minor
---

Running `segment` with no subcommand now opens an interactive browser for
sources, destinations and the destination catalog, built on the new
`@kud/segment-ink`. Ink and React are loaded through a dynamic import, so
one-shot commands like `segment sources list` do not pay for them.

Adds `--mock` to explore the interface with fixture data and no credential, and
`--screen <name>` to open directly on a screen (`--screen list` prints the
names). Piping the bare command now refuses with guidance instead of an uncaught
raw-mode stack trace.
