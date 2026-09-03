declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(filename: string);
    exec(sql: string): void;
    prepare(sql: string): {
      get(...parameters: unknown[]): Record<string, unknown> | undefined;
      all(...parameters: unknown[]): Record<string, unknown>[];
      run(...parameters: unknown[]): { changes: number; lastInsertRowid: number };
    };
  }
}
