# Trakt

Trakt is the planned official Lumio plugin for account login, watched sync,
watchlists, lists and collection surfaces.

This plugin has been scaffolded in metadata-first form while Trakt logic still
spans core watch-state flows and server routes.

## Intended scope

- device-code login and token refresh
- watched history sync
- watchlist sync
- collection surfaces on Home
- plugin-owned settings and status UI

## SDK gap

Trakt needs a stronger sync contract so plugins can observe or drive watched
and watchlist mutations without core importing Trakt-specific functions.

## Migration status

Current Lumio builds still route several watched and watchlist actions through
core Trakt helpers. This plugin folder marks the start of that extraction.
