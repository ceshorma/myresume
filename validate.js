#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const Ajv2020 = require("ajv/dist/2020").default;
const addFormats = require("ajv-formats");

const projectRoot = __dirname;
const schemaPath = path.join(projectRoot, "schemas", "resume.schema.json");
const dataPath = path.join(projectRoot, "resume-data.json");

const loadJson = (filePath) => {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Failed to read ${filePath}:`, error.message);
    process.exit(1);
  }
};

const schema = loadJson(schemaPath);
const data = loadJson(dataPath);

const ajv = new Ajv2020({
  strict: true,
  strictSchema: true,
  allErrors: true,
});
addFormats(ajv);

const validate = ajv.compile(schema);
const valid = validate(data);

if (!valid) {
  console.error("resume-data.json failed schema validation. Errors:");
  console.error(ajv.errorsText(validate.errors, { separator: "\n" }));
  process.exit(1);
}

console.log("resume-data.json is valid against the schema.");
