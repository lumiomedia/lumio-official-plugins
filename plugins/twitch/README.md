# Twitch Plugin

Twitch for Lumio Media Player.

This plugin lets Lumio connect to a user's Twitch account and surface live
channels, categories and personal content directly inside the app.

## What it does

- sign in with Twitch (device code flow)
- browse live channels and categories
- show followed streams
- browse VODs and clips
- add Twitch rows to the Lumio home screen
- register Twitch auth status through the shared Lumio auth capability layer

## Sign-in model

This plugin uses Lumio's managed Twitch OAuth application. Sign-in happens
through the device code flow (`/device/start` + `/device/poll`), so there is
no per-user Twitch developer app to configure.

## Status

This is the runtime scaffold. Surfaces (browse pages, home rows, settings)
are added in later releases.
