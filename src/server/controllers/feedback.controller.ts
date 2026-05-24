import {
  toFeedbackDto,
  toPaginatedListDto,
} from "@/server/http/feedback-dto.mapper";
import {
  BadJsonBodyError,
  parseJsonBody,
} from "@/server/lib/parse-json-body";
import type {
  CreateFeedbackInput,
  FeedbackListQuery,
} from "@/server/models";
import type { ValidationIssue } from "@/server/models/api-error";
import { AppError } from "@/server/models/app-error";
import type { FeedbackService } from "@/server/services/feedback.service";
import type {
  PaginatedFeedbackListDto,
} from "@/shared/api/feedback.contract";
import {
  createFeedbackBodySchema,
  feedbackIdParamSchema,
  idempotencyKeySchema,
  listFeedbackQuerySchema,
} from "@/shared/validation/feedback.schemas";
import {
  sanitizeFeedbackText,
  sanitizeNullableEmail,
  sanitizeNullableTag,
} from "@/shared/validation/sanitize";
import type { z } from "zod";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function issuesFromZod(err: z.ZodError): ValidationIssue[] {
  return err.issues.map((issue) => ({
    path: issue.path.map(String).join(".") === ""
      ? "body"
      : issue.path.map(String).join("."),
    message: issue.message,
  }));
}

function throwValidation(err: z.ZodError): never {
  throw new AppError(
    "Validation failed",
    400,
    "VALIDATION_ERROR",
    issuesFromZod(err),
  );
}

export interface FeedbackControllers {
  list(
    req: NextRequest,
  ): Promise<Response>;

  create(
    req: NextRequest,
  ): Promise<Response>;

  getByParamId(
    req: NextRequest,
    routeCtx: { params: Promise<{ id: string }> },
  ): Promise<Response>;
}

function buildListRecordFromSearch(
  req: NextRequest,
): FeedbackListQuery {
  const qs = req.nextUrl.searchParams;

  const raw: Record<string, unknown> = {
    page: qs.get("page") ?? undefined,
    pageSize: qs.get("pageSize") ?? undefined,
    sentiment:
      qs.get("sentiment") === null ? undefined : (qs.get("sentiment") as string),
    tag: qs.get("tag") === null ? undefined : (qs.get("tag") as string),
  };

  const parsed = listFeedbackQuerySchema.safeParse(raw);
  if (!parsed.success) {
    throwValidation(parsed.error);
  }

  const tagSan = sanitizeNullableTag(parsed.data.tag ?? null);

  const sentimentParsed = parsed.data.sentiment ?? null;

  return {
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
    sentiment:
      sentimentParsed === undefined || sentimentParsed === null
        ? null
        : sentimentParsed,
    tag: tagSan,
  };
}

export function createFeedbackControllers(
  service: FeedbackService,
): FeedbackControllers {
  return {
    async list(req: NextRequest): Promise<Response> {
      const query = buildListRecordFromSearch(req);
      const page = await service.listFeedback(query);

      const payload: PaginatedFeedbackListDto = toPaginatedListDto(page);

      return NextResponse.json(payload, {
        status: 200,
        headers: { "cache-control": "no-store" },
      });
    },

    async create(req: NextRequest): Promise<Response> {
      let jsonBody: unknown;

      try {
        jsonBody = await parseJsonBody(req);
      }
      catch (err: unknown) {
        if (err instanceof BadJsonBodyError) {
          throw new AppError(
            err.message,
            400,
            "VALIDATION_ERROR",
            [{ path: "body", message: err.message }],
          );
        }
        throw err;
      }

      const parsedBody = createFeedbackBodySchema.safeParse(jsonBody);
      if (!parsedBody.success) {
        throwValidation(parsedBody.error);
      }

      const textSan = sanitizeFeedbackText(parsedBody.data.text);

      const emailSan = sanitizeNullableEmail(parsedBody.data.email);

      if (textSan.length < 1 || textSan.length > 10000) {
        throw new AppError(
          "Validation failed",
          400,
          "VALIDATION_ERROR",
          [{
            path: "text",
            message: textSan.length < 1
              ? "Feedback text is required"
              : "Text exceeds maximum length.",
          }],
        );
      }

      const rawIdemHeader =
        req.headers.get("Idempotency-Key")
        ?? req.headers.get("idempotency-key");

      let validatedIdempotencyKey: string | undefined;

      if (typeof rawIdemHeader === "string" && rawIdemHeader.trim() !== "") {
        const ikSnap = idempotencyKeySchema.safeParse(rawIdemHeader);

        if (!ikSnap.success) {
          throw new AppError(
            "Validation failed",
            400,
            "VALIDATION_ERROR",
            ikSnap.error.issues.map((singular) => ({
              path:
                singular.path.join(".") === ""
                  ? "Idempotency-Key"
                  : singular.path.join("."),
              message: singular.message,
            })),
          );
        }

        validatedIdempotencyKey = ikSnap.data;
      }

      const input: CreateFeedbackInput = {
        text: textSan,
        email: emailSan,
      };

      const outcome = await service.createFeedback(
        input,

        validatedIdempotencyKey === undefined
          ? undefined
          : { idempotencyKey: validatedIdempotencyKey },
      );

      const dtoBody = toFeedbackDto(outcome.record);

      const resBuilt = NextResponse.json(dtoBody, {
        status: 201,
        headers: { "cache-control": "no-store" },
      });

      if (outcome.replayed) {
        resBuilt.headers.set("Idempotent-Replayed", "true");
      }

      return resBuilt;
    },

    async getByParamId(
      _req: NextRequest,
      routeCtx,
    ): Promise<Response> {
      const paramsResolved = await routeCtx.params;
      const parsed = feedbackIdParamSchema.safeParse(paramsResolved);

      if (!parsed.success) {
        throw new AppError(
          "Invalid feedback id.",
          400,
          "INVALID_ID",
          [{ path: "id", message: "Invalid id" }],
        );
      }

      const record = await service.getFeedback(parsed.data.id);

      const dtoBody = toFeedbackDto(record);

      return NextResponse.json(dtoBody, {
        status: 200,
        headers: { "cache-control": "no-store" },
      });
    },
  };
}
