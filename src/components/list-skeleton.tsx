import type { ReactElement } from "react";

export function ListSkeleton(): ReactElement {
  return (
    <div aria-busy aria-live="polite" className="animate-pulse space-y-4">
      <div className="h-10 rounded-md bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-52 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}
