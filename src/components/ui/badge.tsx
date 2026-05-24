import type { ReactElement } from "react";

interface BadgeSentimentOpts {
  kind: "sentiment";
  value: "positive" | "neutral" | "negative";
}

interface BadgePriorityOpts {
  kind: "priority";
  value: "P0" | "P1" | "P2" | "P3";
}

interface BadgeNeutralOpts {
  kind: "neutral";
  label: string;
}

type BadgeVariants = BadgeSentimentOpts | BadgePriorityOpts | BadgeNeutralOpts;

const sentimentTone: Record<BadgeSentimentOpts["value"], string> = {
  positive:
    "bg-emerald-100 text-emerald-900 border-emerald-500 dark:bg-emerald-950 dark:text-emerald-50 dark:border-emerald-600",
  neutral:
    "bg-zinc-100 text-zinc-900 border-zinc-400 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-600",
  negative:
    "bg-rose-100 text-rose-900 border-rose-400 dark:bg-rose-950 dark:text-rose-50 dark:border-rose-600",
};

const priorityTone: Record<BadgePriorityOpts["value"], string> = {
  P0:
    "bg-orange-200 text-orange-950 border-orange-500 dark:bg-orange-900 dark:text-orange-50 dark:border-orange-500",
  P1:
    "bg-yellow-200 text-yellow-950 border-yellow-500 dark:bg-yellow-900 dark:text-yellow-50 dark:border-yellow-500",
  P2:
    "bg-blue-100 text-blue-950 border-blue-500 dark:bg-blue-900 dark:text-blue-50 dark:border-blue-500",
  P3:
    "bg-slate-200 text-slate-950 border-slate-500 dark:bg-slate-800 dark:text-slate-50 dark:border-slate-500",
};

const baseRounded =
  "inline-flex items-center justify-center whitespace-nowrap border font-semibold";

/** Reusable badge for sentiments priorities and noun tags assignment Task 6 */
export function Badge(props: BadgeVariants): ReactElement {
  if (props.kind === "sentiment") {
    return (
      <span className={`${baseRounded} rounded-full px-[10px] py-[5px] text-[11px] capitalize leading-tight ${sentimentTone[props.value]}`}>
        {props.value}
      </span>
    );
  }

  if (props.kind === "priority") {
    return (
      <span className={`${baseRounded} rounded-md px-[7px] py-[4px] font-mono text-[11px] uppercase leading-tight ${priorityTone[props.value]}`}>
        {props.value}
      </span>
    );
  }

  const label = props.label.trim().slice(0, 64);

  return (
    <span className={`${baseRounded} rounded-md px-[8px] py-[3px] text-[11px] capitalize dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 border-zinc-300 bg-white text-zinc-900`}
    >
      {label}
    </span>
  );
}
