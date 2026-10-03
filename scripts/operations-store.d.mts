export type OperationsDatabase = {close():void};
export function openOperationsStore(path?: string): OperationsDatabase;
export function consumeDiscoveryQuota(db: OperationsDatabase, sessionToken: string | undefined, limits: {perSession:number;global:number}, now?: Date): {allowed:boolean;reason:string|null;globalRemaining:number;sessionRemaining:number};
export function resolveWorkspace(db: OperationsDatabase, presentedToken: string | undefined): {token:string;workspaceId:string;role:string};
export function getOverview(db: OperationsDatabase, workspaceId: string, role: string, month?: string | null): Record<string,unknown>;
export function mutate(db: OperationsDatabase, workspaceId: string, role: string, action: Record<string,unknown>, trustedResearchEvidence?: Record<string,unknown> | null): Record<string,unknown>;
export function researchVenues(workspaceId: string): Array<{id:string;catalogId:string;name:string;city:string;locality:string;summary:string;kind:"research";sources:Array<{id:string;title:string;url:string}>}>;
