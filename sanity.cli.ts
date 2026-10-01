import {defineCliConfig} from "sanity/cli";

export default defineCliConfig({
  api: {
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "replace-with-project-id",
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "replace-with-dataset-name",
  },
});
