import {config} from "dotenv";

// Load the ignored local secrets file for Node scripts and the Sanity CLI.
// Existing process environment values take precedence over the file.
config({path: ".env.local", quiet: true});
