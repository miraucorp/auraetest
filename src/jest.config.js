const path = require("path");
// load env variables from '.env.dev' file
require("dotenv").config({ path: path.resolve(__dirname + "/.env.dev") });
// missing env vars from '.env.dev' file:
process.env.AWS_REGION="fake";

module.exports = {
  setupFiles: [
    "dotenv/config"
  ],
  modulePathIgnorePatterns: [`${__dirname}/__tests__/mocks`],
  preset: "ts-jest",
  testEnvironment: "node",
}
