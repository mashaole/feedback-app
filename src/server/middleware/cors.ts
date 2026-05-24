import type { ParsedEnv } from "@/server/config/env";
import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_METHODS_FOR_API = ["GET", "POST", "OPTIONS"] as const;

function mergeExposeHeaders(res: Response, add: readonly string[]): void {
  const priorRaw = res.headers.get("Access-Control-Expose-Headers");
  const acc = new Set<string>();

  if (typeof priorRaw === "string" && priorRaw.trim() !== "") {
    priorRaw.split(",").forEach((fragment) => {
      const trimmed = fragment.trim();

      if (trimmed !== "") {
        acc.add(trimmed);
      }
    });
  }

  add.forEach((token) => {
    acc.add(token);
  });

  res.headers.set("Access-Control-Expose-Headers", [...acc].join(", "));
}

export function corsApplyToResponse(
  res: Response,
  req: NextRequest,
  env: ParsedEnv,
): Response {
  const originHeader = req.headers.get("origin");
  let allowOrigin: string | null = null;

  if (typeof originHeader === "string") {
    if (env.CORS_ORIGIN_LIST.includes(originHeader)) {
      allowOrigin = originHeader;
    }
  }

  const allowMethods = ALLOWED_METHODS_FOR_API.join(", ");

  if (allowOrigin !== null) {
    res.headers.set("Access-Control-Allow-Origin", allowOrigin);
    res.headers.set("Vary", "Origin");
  }

  res.headers.set("Access-Control-Allow-Methods", allowMethods);

  const acrh = req.headers.get("access-control-request-headers");

  if (typeof acrh === "string" && acrh.trim() !== "") {
    res.headers.set("Access-Control-Allow-Headers", acrh);
  }
  else {
    res.headers.set(
      "Access-Control-Allow-Headers",
      [
        "Content-Type",
        "x-request-id",
        "x-api-key",
        "Authorization",
        "Idempotency-Key",
      ].join(", "),
    );
  }

  mergeExposeHeaders(res, ["Idempotent-Replayed"]);

  if (originHeader !== null && env.NODE_ENV !== "production") {
    res.headers.set("Access-Control-Max-Age", "86400");
  }

  return res;
}

export function isApiMethodAllowed(method: string): boolean {
  const m = method.toUpperCase();
  return ALLOWED_METHODS_FOR_API.some((allowed) => allowed === m);
}

export function corsPreflightIfNeeded(
  req: NextRequest,
  env: ParsedEnv,
): NextResponse | null {
  const method = req.method.toUpperCase();

  if (method !== "OPTIONS") {
    return null;
  }

  const originHeader = req.headers.get("origin");
  let allowOrigin: string | null = null;

  if (
    typeof originHeader === "string"
    && env.CORS_ORIGIN_LIST.includes(originHeader)
  ) {
    allowOrigin = originHeader;
  }

  const res = new NextResponse(null, { status: 204 });

  if (allowOrigin !== null) {
    res.headers.set("Access-Control-Allow-Origin", allowOrigin);
    res.headers.set("Vary", "Origin");
  }

  res.headers.set(
    "Access-Control-Allow-Methods",
    ALLOWED_METHODS_FOR_API.join(", "),
  );
  res.headers.set(
    "Access-Control-Allow-Headers",
    req.headers.get("access-control-request-headers")
      ??
      [
        "Content-Type",
        "x-request-id",
        "x-api-key",
        "Idempotency-Key",
      ].join(", "),
  );

  return res;
}
