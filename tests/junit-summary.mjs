// Turns the Playwright JUnit report into GitHub Actions job-summary markdown.
// Usage: node tests/junit-summary.mjs test-results/junit.xml >> "$GITHUB_STEP_SUMMARY"
import { readFileSync } from "node:fs";

const file = process.argv[2] ?? "test-results/junit.xml";

let xml;
try {
  xml = readFileSync(file, "utf8");
} catch {
  console.log("## Console functional tests\n");
  console.log(`No JUnit report was produced at \`${file}\` — the suite did not run.`);
  process.exit(0);
}

const unescape = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#10;/g, "\n")
    .replace(/&#13;/g, "")
    .replace(/&amp;/g, "&");

const clean = (s) =>
  unescape(s)
    // strip ANSI colour codes the reporter embeds in failure messages
    .replace(/\u001b\[[0-9;]*m/g, "")
    .trim();

const attr = (tag, name) => {
  const m = new RegExp(`${name}="([^"]*)"`).exec(tag);
  return m ? m[1] : "";
};

const num = (tag, name) => Number(attr(tag, name) || 0);

const rootTag = /<testsuites\b[^>]*>/.exec(xml)?.[0] ?? "";
const suites = [...xml.matchAll(/<testsuite\b([^>]*)>([\s\S]*?)<\/testsuite>/g)].map(
  ([, rawAttrs, inner]) => {
    const tag = `<testsuite ${rawAttrs}>`;
    return {
      name: attr(tag, "name"),
      tests: num(tag, "tests"),
      failures: num(tag, "failures") + num(tag, "errors"),
      skipped: num(tag, "skipped"),
      time: num(tag, "time"),
      inner,
    };
  }
);

const failures = [];
for (const suite of suites) {
  for (const [, rawAttrs, body] of suite.inner.matchAll(
    /<testcase\b([^>]*)(?:\/>|>([\s\S]*?)<\/testcase>)/g
  )) {
    const tag = `<testcase ${rawAttrs}>`;
    const problem = /<(failure|error)\b([^>]*)(?:\/>|>([\s\S]*?)<\/\1>)/.exec(body ?? "");
    if (!problem) continue;
    failures.push({
      suite: suite.name,
      name: attr(tag, "name"),
      message: clean(attr(`<x ${problem[2]}>`, "message") || problem[3] || "failed"),
    });
  }
}

const total = suites.reduce((n, s) => n + s.tests, 0) || num(rootTag, "tests");
const skipped = suites.reduce((n, s) => n + s.skipped, 0);
const failed = failures.length || num(rootTag, "failures") + num(rootTag, "errors");
const passed = Math.max(total - failed - skipped, 0);
const duration = num(rootTag, "time") || suites.reduce((n, s) => n + s.time, 0);
const secs = (n) => `${n.toFixed(1)}s`;

const out = [];
out.push(`## Console functional tests ${failed === 0 ? "✅" : "❌"}`);
out.push("");
out.push("| Total | Passed | Failed | Skipped | Duration |");
out.push("| ----: | -----: | -----: | ------: | -------: |");
out.push(`| ${total} | ${passed} | ${failed} | ${skipped} | ${secs(duration)} |`);
out.push("");

if (suites.length > 0) {
  out.push("| Spec | Tests | Failed | Duration |");
  out.push("| :--- | ----: | -----: | -------: |");
  for (const s of suites) {
    out.push(`| ${s.name} | ${s.tests} | ${s.failures} | ${secs(s.time)} |`);
  }
  out.push("");
}

if (failures.length > 0) {
  out.push("### Failures");
  out.push("");
  for (const f of failures) {
    const message = f.message.split("\n").slice(0, 12).join("\n");
    out.push(`<details><summary><code>${f.suite}</code> — ${f.name}</summary>`);
    out.push("");
    out.push("```");
    out.push(message);
    out.push("```");
    out.push("");
    out.push("</details>");
    out.push("");
  }
}

console.log(out.join("\n"));
