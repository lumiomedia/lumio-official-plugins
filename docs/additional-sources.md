# Additional Plugin Sources

Not every plugin needs to ship through the official Lumio marketplace.

## When a separate source makes sense

A separate repository or manifest source can make sense for plugins that are:

- experimental
- in active development
- intended for a limited audience
- distributed outside the official marketplace

## Example structure

- `lumio-official-plugins` -> official marketplace repo
- `lumio-community-plugins` -> community or third-party plugin repo
- `lumio-private-plugins` -> limited-distribution plugin repo

## How Lumio can support this

Lumio can support:

- one official marketplace URL
- optional additional manifest URLs
- manual install by manifest URL
- manual install by git URL

This keeps the official marketplace clean while still allowing additional plugin sources when needed.
