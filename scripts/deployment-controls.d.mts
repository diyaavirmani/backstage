export class RequestBodyTooLarge extends Error {}
export function readRequestTextBounded(request: Request, maxBytes: number): Promise<string>;
export function validateMutationOrigin(request: Request, options?: {configuredOrigin?: string; production?: boolean}): {ok: boolean; reason?: string};
export function safeLimit(value: string | undefined, fallback: number, max?: number): number;
export function discoveryQuotaLimits(env?: NodeJS.ProcessEnv): {perSession: number; global: number};
export function discoveryRetryAfterSeconds(now?: Date): number;
export function quotaSubjectHash(value: string): string;
