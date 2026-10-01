"use client";

import {defineConfig} from "sanity";
import {structureTool} from "sanity/structure";
import {schemaTypes} from "./src/sanity/schemaTypes";

export default defineConfig({
  name: "backstage",
  title: "Backstage Venue Knowledge",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "replace-with-project-id",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "replace-with-dataset-name",
  basePath: "/studio",
  plugins: [structureTool()],
  schema: {types: schemaTypes},
});
