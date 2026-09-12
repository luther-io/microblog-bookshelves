# Micro.blog Bookshelves — Raycast extension

Manage your [Micro.blog bookshelves](https://micro.blog/account/bookshelves) from Raycast.

## Commands

| Command            | What it does                                                                            |
| ------------------ | --------------------------------------------------------------------------------------- |
| Browse Bookshelves | List shelves → books. Move / copy / remove books, set covers, create or rename shelves. |
| Add Book           | Search Open Library by title, author, or ISBN and add a result to a shelf.              |
| Reading Goals      | View yearly goals and update the target.                                                |

## Setup

1. Create an app token at <https://micro.blog/account/apps>.
2. `pnpm install && pnpm dev` — the extension loads into Raycast v2 (falls back to v1).
3. Paste the token into the extension's **App Token** preference on first run.

## Development

```fish
pnpm dev         # ray develop with hot reload
pnpm build       # ray build → dist/
pnpm typecheck   # tsc --noEmit
pnpm lint        # oxlint
pnpm fmt         # oxfmt
```

Book search uses the public [Open Library search API](https://openlibrary.org/dev/docs/api/search); Micro.blog does
not expose one. The Micro.blog Books API is documented at <https://help.micro.blog/t/json-api-books/545>.

## Publishing to the Raycast Store

```fish
pnpm lint        # ray lint: manifest, icon, metadata, ESLint, Prettier
pnpm build       # must pass before publishing
pnpm publish     # forks raycast/extensions and opens the store PR
```

Screenshots go in `metadata/` as 2000×1250 PNGs (three to six of them). In Raycast, open the extension while
`pnpm dev` is running and use **Window Capture** (`⌘⇧C` in the root search, or the "Window Capture" command) to
export store-ready screenshots.
