# Changelog

## 0.2.7

- Loads again on Lumio 0.1.617. The copy of the plugin that ships inside that app version stopped at startup, so the plugin never appeared; this version replaces it automatically.

## 0.2.6

- Uses much less memory and responds faster to the remote. The plugin no longer carries its own copy of a large UI library it barely used, which made it several megabytes smaller and removed dozens of duplicate keyboard and focus listeners that ran on every key press.

## 0.2.5

- The settings section is drawn on the app primitives.

## 0.2.4

- Settings for automatic watchlist cleanup.

## 0.2.1

- Runtime bundle refresh for latest SDK contract and separation updates

## 0.2.0

- Self-contained settings section with device auth flow, import and disconnect
- Fully separated from core — all Trakt UI lives in the plugin runtime

## 0.1.0

- Scaffolded metadata for the upcoming Trakt official plugin
