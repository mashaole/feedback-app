import type { ReactElement } from "react";

export function DetailSkeleton(): ReactElement {
  return (
    <div aria-busy aria-live="polite" className="animate-pulse space-y-5">
      <div className="h-10 w-1/3 rounded-md bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-48 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}
