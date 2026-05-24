import { getApplicationContainer } from "@/server/container";
import { corsApplyToResponse, corsPreflightIfNeeded } from "@/server/middleware/cors";
import { incomingOrGeneratedRequestId } from "@/server/middleware/request-id";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Exported from each feedback route segment so OPTIONS preflight is always
 * allowed without counting toward POST rate buckets.
 */

export async function feedbackApiOptionsResponse(
  req: NextRequest,
): Promise<Response> {
  const env = getApplicationContainer().env;

  const preflightBuilt = corsPreflightIfNeeded(req, env);

  const rid = incomingOrGeneratedRequestId(req.headers.get("x-request-id"));

  if (preflightBuilt !== null) {
    const preflightTagged = corsApplyToResponse(preflightBuilt, req, env);
    preflightTagged.headers.set("x-request-id", rid);

    return preflightTagged;
  }

  const bare = new NextResponse(null, { status: 204 });

  bare.headers.set("x-request-id", rid);

  return corsApplyToResponse(bare, req, env);
}
