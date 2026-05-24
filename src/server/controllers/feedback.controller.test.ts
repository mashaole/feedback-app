import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { createFeedbackControllers } from "@/server/controllers/feedback.controller";
import { AppError } from "@/server/models/app-error";
import type { FeedbackRecord } from "@/server/models";
import type { FeedbackService } from "@/server/services/feedback.service";

const sampleRecord: FeedbackRecord = {
  id: 1,
  text: "Great product",
  email: null,
  createdAt: new Date("2026-05-24T12:00:00.000Z"),
  summary: "Positive note",
  sentiment: "positive",
  tags: ["product"],
  priority: "P3",
  nextAction: "Share with team",
};

function buildService(
  overrides: Partial<FeedbackService> = {},
): FeedbackService {
  return {
    createFeedback: vi.fn().mockResolvedValue({
      replayed: false,
      record: sampleRecord,
    }),
    getFeedback: vi.fn().mockResolvedValue(sampleRecord),
    listFeedback: vi.fn().mockResolvedValue({
      items: [sampleRecord],
      total: 1,
      page: 1,
      pageSize: 20,
    }),
    ...overrides,
  } as unknown as FeedbackService;
}

describe("feedback.controller", () => {
  it("POST returns 400 when JSON body is invalid", async () => {
    const controllers = createFeedbackControllers(buildService());
    const req = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      body: "{not-json",
      headers: { "content-type": "application/json" },
    });

    await expect(controllers.create(req)).rejects.toMatchObject({
      statusCode: 400,
      code: "VALIDATION_ERROR",
    });
  });

  it("POST returns 201 with DTO on happy path", async () => {
    const createFeedback = vi.fn().mockResolvedValue({
      replayed: false,
      record: sampleRecord,
    });
    const controllers = createFeedbackControllers(
      buildService({ createFeedback }),
    );

    const req = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      body: JSON.stringify({ text: "Great product" }),
      headers: { "content-type": "application/json" },
    });

    const res = await controllers.create(req);

    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: number; summary: string };
    expect(body.id).toBe(1);
    expect(body.summary).toBe("Positive note");
    expect(createFeedback).toHaveBeenCalledOnce();
  });

  it("GET by id returns 400 for invalid route id", async () => {
    const controllers = createFeedbackControllers(buildService());

    const req = new NextRequest("http://localhost/api/feedback/0");

    await expect(
      controllers.getByParamId(req, {
        params: Promise.resolve({ id: "0" }),
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_ID",
    });
  });

  it("GET by id propagates 404 from service", async () => {
    const controllers = createFeedbackControllers(
      buildService({
        getFeedback: vi.fn().mockRejectedValue(
          new AppError("Feedback not found.", 404, "NOT_FOUND"),
        ),
      }),
    );

    const req = new NextRequest("http://localhost/api/feedback/99");

    await expect(
      controllers.getByParamId(req, {
        params: Promise.resolve({ id: "99" }),
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
    });
  });

  it("GET list returns paginated payload", async () => {
    const listFeedback = vi.fn().mockResolvedValue({
      items: [sampleRecord],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    const controllers = createFeedbackControllers(
      buildService({ listFeedback }),
    );

    const req = new NextRequest(
      "http://localhost/api/feedback?page=1&sentiment=positive",
    );

    const res = await controllers.list(req);
    const body = (await res.json()) as {
      items: { id: number }[];
      total: number;
    };

    expect(res.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.items[0]?.id).toBe(1);
    expect(listFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ sentiment: "positive" }),
    );
  });
});
