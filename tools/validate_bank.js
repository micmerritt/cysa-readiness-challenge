/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const BANK_PATH = path.join(ROOT, "data", "question_bank.json");
const BLUEPRINT_PATH = path.join(ROOT, "data", "blueprint.json");
const REMEDIATION_PATH = path.join(ROOT, "data", "remediation.json");

const ALLOWED_CATEGORIES = new Set([
  "log_analysis",
  "incident_response",
  "vuln_prioritization",
  "detection_reasoning",
]);

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function fail(errors) {
  console.error("\n❌ Validation failed:");
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

function ok(warnings) {
  console.log("\n✅ Validation passed.");
  if (warnings.length) {
    console.log("\n⚠️ Warnings:");
    for (const w of warnings) console.log(`- ${w}`);
  }
  process.exit(0);
}

function main() {
  const errors = [];
  const warnings = [];

  if (!fs.existsSync(BANK_PATH)) errors.push(`Missing ${BANK_PATH}`);
  if (!fs.existsSync(BLUEPRINT_PATH)) errors.push(`Missing ${BLUEPRINT_PATH}`);
  if (!fs.existsSync(REMEDIATION_PATH)) errors.push(`Missing ${REMEDIATION_PATH}`);
  if (errors.length) fail(errors);

  const bank = readJson(BANK_PATH);
  const blueprint = readJson(BLUEPRINT_PATH);
  const remediation = readJson(REMEDIATION_PATH);

  if (!Array.isArray(bank)) errors.push("question_bank.json must be an array.");

  const tagMap = remediation?.tags || {};
  const knownTags = new Set(Object.keys(tagMap));

  const idSet = new Set();
  const countsByCategory = new Map();
  for (const cat of ALLOWED_CATEGORIES) countsByCategory.set(cat, 0);

  const idPattern = /^[a-z0-9]+-[a-z0-9]+-[0-9]{3,}$/;

  bank.forEach((q, idx) => {
    const prefix = `Question #${idx + 1}`;

    if (typeof q !== "object" || q === null) {
      errors.push(`${prefix}: must be an object.`);
      return;
    }

    // Required fields
    const required = ["id", "category", "prompt", "choices", "answerIndex", "rationale"];
    for (const r of required) {
      if (!(r in q)) errors.push(`${prefix}: missing required field '${r}'.`);
    }

    // id
    if (typeof q.id !== "string" || q.id.trim().length < 6) {
      errors.push(`${prefix}: 'id' must be a non-empty string.`);
    } else {
      if (!idPattern.test(q.id)) {
        warnings.push(`${prefix}: id '${q.id}' does not match recommended pattern (e.g., cysa-log-001).`);
      }
      if (idSet.has(q.id)) errors.push(`${prefix}: duplicate id '${q.id}'.`);
      idSet.add(q.id);
    }

    // category
    if (typeof q.category !== "string" || !ALLOWED_CATEGORIES.has(q.category)) {
      errors.push(`${prefix}: invalid category '${q.category}'.`);
    } else {
      countsByCategory.set(q.category, (countsByCategory.get(q.category) || 0) + 1);
    }

    // prompt
    if (typeof q.prompt !== "string" || q.prompt.trim().length < 20) {
      errors.push(`${prefix}: 'prompt' must be a string (>= 20 chars).`);
    }

    // choices
    if (!Array.isArray(q.choices) || q.choices.length !== 4) {
      errors.push(`${prefix}: 'choices' must be an array of exactly 4 strings.`);
    } else {
      q.choices.forEach((c, i) => {
        if (typeof c !== "string" || c.trim().length === 0) {
          errors.push(`${prefix}: choice[${i}] must be a non-empty string.`);
        }
      });
    }

    // answerIndex
    if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex > 3) {
      errors.push(`${prefix}: 'answerIndex' must be an integer 0–3.`);
    } else if (Array.isArray(q.choices) && q.choices.length === 4) {
      // ok
    }

    // rationale
    if (typeof q.rationale !== "string" || q.rationale.trim().length < 10) {
      errors.push(`${prefix}: 'rationale' must be a string (>= 10 chars).`);
    }

    // tags
    if ("tags" in q) {
      if (!Array.isArray(q.tags)) {
        errors.push(`${prefix}: 'tags' must be an array (0–2 items).`);
      } else {
        if (q.tags.length > 2) errors.push(`${prefix}: 'tags' must have at most 2 items.`);
        const seen = new Set();
        q.tags.forEach((t) => {
          if (typeof t !== "string" || t.trim().length === 0) {
            errors.push(`${prefix}: tag must be a non-empty string.`);
            return;
          }
          if (seen.has(t)) errors.push(`${prefix}: duplicate tag '${t}'.`);
          seen.add(t);

          if (knownTags.size && !knownTags.has(t)) {
            warnings.push(`${prefix}: tag '${t}' not found in remediation.json tags.`);
          }
        });
      }
    }

    // domain (optional)
    if ("domain" in q) {
      if (!Number.isInteger(q.domain) || q.domain < 1 || q.domain > 4) {
        errors.push(`${prefix}: 'domain' must be an integer 1–4 if provided.`);
      }
    }

    // difficulty (optional)
    if ("difficulty" in q) {
      if (!Number.isInteger(q.difficulty) || q.difficulty < 1 || q.difficulty > 5) {
        errors.push(`${prefix}: 'difficulty' must be an integer 1–5 if provided.`);
      }
    }
  });

  // Blueprint feasibility check
  const bp = blueprint?.byCategory || {};
  for (const cat of Object.keys(bp)) {
    const need = bp[cat];
    if (!ALLOWED_CATEGORIES.has(cat)) {
      warnings.push(`blueprint.json includes unknown category '${cat}'.`);
      continue;
    }
    if (!Number.isInteger(need) || need < 0) {
      errors.push(`blueprint.json byCategory['${cat}'] must be a non-negative integer.`);
      continue;
    }
    const have = countsByCategory.get(cat) || 0;
    if (have < need) {
      errors.push(
        `Not enough questions for category '${cat}': need ${need}, have ${have}.`
      );
    }
  }

  if (errors.length) fail(errors);
  ok(warnings);
}

main();
