import { getApplicationContainer } from "@/server/container";
import { createFeedbackControllers } from "@/server/controllers/feedback.controller";
import { assertApiKeyWhenConfigured } from "@/server/middleware/api-key-auth";
import {
  corsApplyToResponse,
  corsPreflightIfNeeded,
  isApiMethodAllowed,
} from "@/server/middleware/cors";
import {
  fallbackErrorEnvelope,
  statusFromError,
} from "@/server/middleware/error-serializer";
import { evaluateApiRateLimit } from "@/server/middleware/rate-limit";
import { runWithRequestContext } from "@/server/middleware/request-context.storage";
import { incomingOrGeneratedRequestId } from "@/server/middleware/request-id";
import { AppError, isAppError } from "@/server/models/app-error";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export type ApiRateTier = "read" | "write";

let controllersCache:
  | ReturnType<typeof createFeedbackControllers>
  | undefined;

function feedbackControllersMemo() {
  controllersCache ??= createFeedbackControllers(
    getApplicationContainer().feedbackService,
  );

  return controllersCache;
}

export function lazyFeedbackControllers() {
  return feedbackControllersMemo();
}

export async function withFeedbackApiEnvelope(
  req: NextRequest,
  tier: ApiRateTier,
  work: () => Promise<Response>,
): Promise<Response> {
  const cnt = getApplicationContainer();
  const env = cnt.env;

  const requestId = incomingOrGeneratedRequestId(
    req.headers.get("x-request-id"),
  );

  const preflight = corsPreflightIfNeeded(req, env);

  if (preflight !== null) {
    preflight.headers.set("x-request-id", requestId);

    return corsApplyToResponse(preflight, req, env);
  }

  if (!isApiMethodAllowed(req.method)) {
    let res405: Response = NextResponse.json(
      {
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Method not allowed.",
          requestId,
        },
      },
      {
        status: 405,
        headers: {
          Allow: "GET, POST, OPTIONS",
          "cache-control": "no-store",
        },
      },
    );

    res405.headers.set("x-request-id", requestId);

    res405 = corsApplyToResponse(res405, req, env);

    return res405;
  }

  assertApiKeyWhenConfigured(req, env);

  const rl = evaluateApiRateLimit(req, env, tier);

  if (!rl.allowed) {
    const transient = new AppError(
      "Rate limit exceeded.",
      429,
      "RATE_LIMIT_EXCEEDED",
      undefined,
      rl.retryAfterMs,
    );

    let res429: Response = NextResponse.json(
      { error: fallbackErrorEnvelope(transient, requestId, env) },
      {
        status: 429,
        headers: {
          "cache-control": "no-store",
          "retry-after": String(Math.ceil(rl.retryAfterMs / 1000)),
        },
      },
    );

    res429.headers.set("x-request-id", requestId);

    res429 = corsApplyToResponse(res429, req, env);

    return res429;
  }

  const baseLogger = cnt.logger.child({ requestId });

  const startedNs = process.hrtime.bigint();

  return await runWithRequestContext(
    { requestId, logger: baseLogger, startedNs },
    async () => {
      try {
        const rawResponse = await work();

        let outWrapped: Response =
          rawResponse instanceof NextResponse
            ? rawResponse
            : new NextResponse(rawResponse.body, rawResponse);

        const elapsedSafe = Number(process.hrtime.bigint() - startedNs) / 1e6;

        baseLogger.info("http_access", {
          method: req.method,
          pathname: req.nextUrl.pathname,
          status: outWrapped.status,
          latencyMs: Math.round(elapsedSafe * 1000) / 1000,
        });

        outWrapped.headers.set("x-request-id", requestId);

        outWrapped = corsApplyToResponse(outWrapped, req, env);

        return outWrapped;
      }
      catch (errUnknown: unknown) {
        const status = statusFromError(errUnknown, env);

        const envBodyUnknown = fallbackErrorEnvelope(
          errUnknown,
          requestId,
          env,
        );

        const latencyErr = Number(process.hrtime.bigint() - startedNs) / 1e6;

        baseLogger.warn("http_error", {
          method: req.method,
          pathname: req.nextUrl.pathname,
          status,
          latencyMs: Math.round(latencyErr * 1000) / 1000,
          code: isAppError(errUnknown) ? errUnknown.code : "UNKNOWN",
        });

        let resErr: Response = NextResponse.json(
          { error: envBodyUnknown },
          { status, headers: { "cache-control": "no-store" } },
        );

        if (
          typeof envBodyUnknown.retryAfterMs === "number"
          && envBodyUnknown.retryAfterMs > 0
        ) {
          resErr.headers.set(
            "retry-after",
            String(Math.ceil(envBodyUnknown.retryAfterMs / 1000)),
          );
        }

        resErr.headers.set("x-request-id", requestId);

        resErr = corsApplyToResponse(resErr, req, env);

        return resErr;
      }
    },
  );
}
