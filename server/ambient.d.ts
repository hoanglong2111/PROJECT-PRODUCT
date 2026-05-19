declare module 'pg' {
  export type QueryResultRow = Record<string, unknown>;

  export type QueryResult<T extends QueryResultRow = QueryResultRow> = {
    rowCount: number | null;
    rows: T[];
  };

  export type PoolClient = {
    query: <T extends QueryResultRow = QueryResultRow>(queryText: string, values?: unknown[]) => Promise<QueryResult<T>>;
    release: () => void;
  };

  export class Pool {
    constructor(config?: { connectionString?: string });
    connect: () => Promise<PoolClient>;
    end: () => Promise<void>;
    query: <T extends QueryResultRow = QueryResultRow>(queryText: string, values?: unknown[]) => Promise<QueryResult<T>>;
  }

  const pg: {
    Pool: typeof Pool;
  };

  export default pg;
}
