import {access,stat} from "node:fs/promises";
import {dirname,resolve} from "node:path";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET() {
  if (!process.env.RAILWAY_ENVIRONMENT_ID) return Response.json({status:"ready"});
  const dbPath=resolve(/*turbopackIgnore: true*/ process.env.BACKSTAGE_DB_PATH||"/data/backstage.sqlite");
  const mountPath=process.env.RAILWAY_VOLUME_MOUNT_PATH?resolve(/*turbopackIgnore: true*/ process.env.RAILWAY_VOLUME_MOUNT_PATH):"";
  if (!mountPath||dirname(dbPath)!==mountPath) return Response.json({status:"not_ready"},{status:503});
  try {
    const info=await stat(mountPath);
    if(!info.isDirectory())throw new Error("not_directory");
    await access(mountPath,2);
    return Response.json({status:"ready"});
  } catch {
    return Response.json({status:"not_ready"},{status:503});
  }
}
