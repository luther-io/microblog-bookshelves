/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** App Token - Micro.blog app token. Create one at https://micro.blog/account/apps */
  "appToken": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `bookshelves` command */
  export type Bookshelves = ExtensionPreferences & {}
  /** Preferences accessible in the `add-book` command */
  export type AddBook = ExtensionPreferences & {}
  /** Preferences accessible in the `reading-goal` command */
  export type ReadingGoal = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `bookshelves` command */
  export type Bookshelves = {}
  /** Arguments passed to the `add-book` command */
  export type AddBook = {}
  /** Arguments passed to the `reading-goal` command */
  export type ReadingGoal = {}
}

