import {defineRailway,github,preserve,project,service,volume} from "railway/iac";

// This repository owns only its Backstage service and data volume in a Railway
// project. Keep other project resources outside this named partial.
export const partial="backstage";

export default defineRailway(()=>{
  const data=volume("backstage-data",{region:"asia-southeast1-eqsg3a",sizeMB:500});
  const app=service("Backstage",{
    source:github("diyaavirmani/backstage",{branch:"main"}),
    build:{builder:"DOCKERFILE",dockerfilePath:"Dockerfile"},
    deploy:{multiRegionConfig:{"asia-southeast1-eqsg3a":{numReplicas:1}},healthcheckPath:"/api/health",healthcheckTimeout:180,restartPolicyType:"ON_FAILURE",restartPolicyMaxRetries:10},
    volumeMounts:{"/data":data},
    env:{
      NODE_ENV:"production",
      NEXT_PUBLIC_SANITY_PROJECT_ID:"1428jmxu",
      NEXT_PUBLIC_SANITY_DATASET:"production",
      BACKSTAGE_DB_PATH:"/data/backstage.sqlite",
      DEMO_DISCOVERY_DAILY_PER_SESSION:"5",
      DEMO_DISCOVERY_DAILY_GLOBAL:"50",
      OPENAI_MODEL:"gpt-4.1-mini",
      RAILWAY_RUN_UID:"0",
      APP_ORIGIN:preserve(),
      SANITY_PROJECT_READ_TOKEN:preserve(),
      SANITY_CONTEXT_MCP_URL:preserve(),
      SANITY_ORGANIZATION_TOKEN:preserve(),
      OPENAI_API_KEY:preserve(),
    },
  });
  return project("Backstage",{resources:[app,data]});
});
