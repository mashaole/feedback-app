import type {
  CreateFeedbackInput,
  FeedbackAnalysis,
  FeedbackListQuery,
  FeedbackRecord,
  FeedbackRow,
  PriorityLabel,
  SentimentLabel,
} from "@/server/models";
import type { PaginatedResult } from "@/server/models/paginated-result";
import type { IFeedbackRepository } from "@/server/ports/feedback-repository.port";
import type { ILogger } from "@/server/ports/logger.port";
import type { Pool, QueryResult, QueryResultRow } from "pg";

const MAX_PAGE_SIZE = 100;

function mapRow(row: FeedbackRow): FeedbackRecord {
  return {
    id: Number(row.id),
    text: row.text,
    email: row.email,
    createdAt: row.created_at,
    summary: row.summary,
    sentiment: row.sentiment as SentimentLabel,
    tags: row.tags ?? [],
    priority: row.priority as PriorityLabel,
    nextAction: row.next_action,
  };
}

function normalizePageParams(
  page: number,
  pageSize: number,
): { offset: number; limit: number; page: number; pageSize: number } {
  const safePage = Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1);
  const rawSize = Number.isFinite(pageSize)
    ? Math.floor(pageSize)
    : MAX_PAGE_SIZE;
  const safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, rawSize));
  const offset = (safePage - 1) * safeSize;
  return {
    offset,
    limit: safeSize,
    page: safePage,
    pageSize: safeSize,
  };
}

/** Postgres implementation of IFeedbackRepository (parameterized SQL only). */
export class FeedbackDao implements IFeedbackRepository {
  private readonly log: ILogger;

  constructor(
    private readonly pool: Pool,
    logger: ILogger,
  ) {
    this.log = logger.child({ component: "FeedbackDao" });
  }

  private async query<TResult extends QueryResultRow>(
    label: string,
    sql: string,
    values: unknown[],
  ): Promise<QueryResult<TResult>> {
    try {
      return await this.pool.query<TResult>(sql, values);
    } catch (err: unknown) {
      this.log.error("feedback_dao_query_failed", {
        label,
        err,
      });
      throw err;
    }
  }

  async create(
    input: CreateFeedbackInput,
    analysis: FeedbackAnalysis,
  ): Promise<FeedbackRecord> {
    const sql = `
      INSERT INTO feedback (
        text, email, summary, sentiment, tags, priority, next_action
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values: unknown[] = [
      input.text,
      input.email,
      analysis.summary,
      analysis.sentiment,
      analysis.tags,
      analysis.priority,
      analysis.nextAction,
    ];
    const res = await this.query<FeedbackRow>("create", sql, values);
    const row = res.rows[0];
    if (!row) {
      throw new Error("FeedbackDao.create returned no row");
    }
    return mapRow(row);
  }

  async findById(id: number): Promise<FeedbackRecord | null> {
    const sql = "SELECT * FROM feedback WHERE id = $1";
    const res = await this.query<FeedbackRow>("findById", sql, [id]);
    const row = res.rows[0];
    return row ? mapRow(row) : null;
  }

  async list(
    query: FeedbackListQuery,
  ): Promise<PaginatedResult<FeedbackRecord>> {
    const sentimentParam =
      query.sentiment === undefined || query.sentiment === null
        ? null
        : query.sentiment;

    const tagParam =
      query.tag === undefined || query.tag === null ? null : query.tag;

    const { offset, limit, page, pageSize } = normalizePageParams(
      query.page,
      query.pageSize,
    );

    const filterParams: unknown[] = [sentimentParam, tagParam];
    const listParams: unknown[] = [
      sentimentParam,
      tagParam,
      limit,
      offset,
    ];

    const whereClause = `
      WHERE ($1::text IS NULL OR sentiment = $1)
      AND ($2::text IS NULL OR $2 = ANY(tags))
    `;

    const countSql =
      `SELECT COUNT(*) AS cnt FROM feedback ${whereClause}`;
    const listSql = `
      SELECT * FROM feedback
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const [countResult, rowsResult] = await Promise.all([
      this.query<{ cnt: string }>(
        "list.count",
        countSql,
        filterParams,
      ),
      this.query<FeedbackRow>(
        "list.rows",
        listSql,
        listParams,
      ),
    ]);

    const countRaw = countResult.rows[0]?.cnt;
    const total =
      countRaw === undefined ? 0 : Number(countRaw);

    return {
      items: rowsResult.rows.map(mapRow),
      total,
      page,
      pageSize,
    };
  }
}
