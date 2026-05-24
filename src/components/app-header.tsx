"use client";

import Link from "next/link";
import type { ReactElement } from "react";

export function AppHeader(): ReactElement {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <Link
          href="/"
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
        >
          Submit
        </Link>
        <Link
          href="/feedback"
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
        >
          All feedback
        </Link>
      </div>
    </header>
  );
}
