# Private Plugins

Not every plugin belongs in the public or official marketplace.

## A clean split

Use this repo for:

- official Lumio plugins
- user-facing, trusted plugins

Use separate private repos for:

- scraper plugins
- internal experiments
- staging plugins
- legally sensitive integrations

## Example structure

- `lumio-official-plugins` -> official marketplace repo
- `lumio-private-plugins` -> private marketplace repo
- `lumio-scrapers-private` -> private scraper/plugin repo

## How Lumio can support this

Lumio can support:

- one official marketplace URL
- optional extra manifest URLs
- manual install by manifest URL
- manual install by git URL

That keeps the official experience clean while still allowing private installs.
