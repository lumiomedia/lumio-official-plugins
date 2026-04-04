# YouTube Plugin

Official Lumio YouTube plugin.

## Features

- connect with YouTube / Google
- subscriptions feed
- channels view
- playlists
- watch later
- home rows
- channel drill-down
- optional `Hide shorts`

## Auth model

This plugin supports two auth modes:

1. `Use Lumio app`
   Uses core-managed credentials configured once in Lumio.
2. `Use my own Google app`
   Lets a user override the auth client and API key with their own Google app.

## Why personal override exists

YouTube quotas can be tight for shared apps.

Personal override gives power users a way to:

- use their own Google OAuth client
- use their own YouTube Data API quota
- keep the plugin usable even if the shared Lumio quota is exhausted

## User flow

For normal users:

`Install plugin -> Connect YouTube -> done`

For advanced users:

`Enable personal override -> paste own client ID/API key -> Connect YouTube`

