import type { ReactElement } from "react";

import { Badge } from "@/components/ui/badge";

interface TagListProps {
  labels: readonly string[];

  ariaLabel?: string;
}

/** Renders noun tags via neutral badges; skips empties dedup preserves order */

export function TagList({ labels, ariaLabel }: TagListProps): ReactElement {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const raw of labels) {
    const t = raw.trim();
    if (t === "" || seen.has(t)) {
      continue;
    }
    seen.add(t);
    unique.push(t);
  }

  return (
    <ul
      className="flex flex-wrap gap-2"
      aria-label={ariaLabel ?? "Analysis tags"}
    >
      {unique.map((tag) => (
        <li key={tag}>
          <Badge kind="neutral" label={tag} />
        </li>
      ))}
    </ul>
  );
}
