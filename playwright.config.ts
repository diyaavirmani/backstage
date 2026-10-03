import {defineConfig} from "@playwright/test";
import {mkdtempSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

// Each run gets a brand-new temporary operational database, never .data/backstage.sqlite.
const dataDir=mkdtempSync(join(tmpdir(),"backstage-playwright-"));
const database=join(dataDir,"operations.sqlite");
process.env.BACKSTAGE_PLAYWRIGHT_DATA_DIR=dataDir;

export default defineConfig({
  testDir:"./tests/e2e",
  fullyParallel:false,
  workers:1,
  timeout:150_000,
  expect:{timeout:10_000},
  reporter:[["list"]],
  outputDir:".playwright-artifacts/test-results",
  globalTeardown:"./tests/e2e/global-teardown.ts",
  use:{baseURL:"http://127.0.0.1:3107",browserName:"chromium",trace:"retain-on-failure",screenshot:"only-on-failure"},
  webServer:{
    command:"npm run start -- --hostname 127.0.0.1",
    url:"http://127.0.0.1:3107/api/operations",
    reuseExistingServer:false,
    timeout:90_000,
    env:{...process.env,PORT:"3107",BACKSTAGE_DB_PATH:database,BACKSTAGE_PLAYWRIGHT_DATA_DIR:dataDir,NEXT_TELEMETRY_DISABLED:"1"},
    stdout:"pipe",
    stderr:"pipe",
  },
});
