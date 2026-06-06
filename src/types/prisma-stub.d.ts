// Stub declaration for @prisma/client when the generated client is not available.
// Run `npx prisma generate` in production to get full type support.
declare module "@prisma/client" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export class PrismaClient {
    constructor(opts?: unknown);
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    $on(event: string, cb: (...args: unknown[]) => void): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [model: string]: any;
  }
}
