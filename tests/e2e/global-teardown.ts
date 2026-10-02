import {rmSync} from "node:fs";

export default async function globalTeardown() {
  const directory=process.env.BACKSTAGE_PLAYWRIGHT_DATA_DIR;
  if(directory)rmSync(directory,{recursive:true,force:true});
}
