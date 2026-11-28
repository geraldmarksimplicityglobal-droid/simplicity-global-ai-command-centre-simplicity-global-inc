import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../../../aif-runtime.html", import.meta.url), "utf8");

test("autonomous task console accepts one natural-language command without asking the user to classify risk", () => {
  const form = html.match(/<form id="job-form">([\s\S]*?)<\/form>/)?.[1] ?? "";
  assert.match(form, /textarea name="objective"/);
  assert.doesNotMatch(form, /select name="risk"|name="capabilities"/);
  assert.match(form, /Queue command/);
  assert.match(html, /risk: "read_only"/);
});

test("console explains that the worker reclassifies commands and blocks higher-risk work pending approval", () => {
  assert.match(html, /worker independently classifies/);
  assert.match(html, /appropriate approval/);
});
