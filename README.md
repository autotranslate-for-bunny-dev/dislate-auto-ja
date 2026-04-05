English | [日本語](./README.ja.md)

# Dislate Auto-JA

`Dislate Auto-JA` is a Bunny plugin that automatically translates non-Japanese server messages into Japanese while keeping DM translation manual via long-press or `/translate`.

## Bunny install URL

Add this URL in Bunny after GitHub Pages finishes deploying:

`https://autotranslate-for-bunny-dev.github.io/dislate-auto-ja/dislate/`

## Features

- Auto-translates non-Japanese messages in guild channels, threads, and forum posts
- Skips 1:1 DMs and group DMs for privacy, while keeping long-press translate available
- Preserves mentions, role mentions, slash command references, timestamps, URLs, code spans/blocks, and custom emoji
- Keeps the original text visible when immersive translation is enabled
- Includes an in-app Debug Logs page for troubleshooting auto translation

## Local development

```bash
npm install
npm run build
```

The plugin build output is written to `dist/dislate/`.

## Publishing

This repository deploys `dist/` to GitHub Pages from GitHub Actions on pushes to `main`.

- Repo: `autotranslate-for-bunny-dev/dislate-auto-ja`
- Pages base URL: `https://autotranslate-for-bunny-dev.github.io/dislate-auto-ja/`
- Bunny plugin URL: `https://autotranslate-for-bunny-dev.github.io/dislate-auto-ja/dislate/`

Plugin-specific details live in `plugins/dislate/README.md`.
