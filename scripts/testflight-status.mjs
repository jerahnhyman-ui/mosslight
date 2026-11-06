// Follow one commit through Xcode Cloud and TestFlight using the App Store
// Connect API. Credentials come only from the environment (GitHub secrets):
//   ASC_KEY_ID, ASC_ISSUER_ID, ASC_PRIVATE_KEY (the full .p8 contents)
// Optional: COMMIT_SHA (default GITHUB_SHA), BETA_GROUP (default "Beta"),
// BUNDLE_ID, TIMEOUT_MINUTES (default 90), ASSIGN_GROUP ("false" to skip).
// Prints the Xcode Cloud run, version/build number and TestFlight state, and
// exits non-zero if the build fails or is not Testing in the group in time.
import { createPrivateKey, sign } from "node:crypto";
import { appendFileSync } from "node:fs";

const env = process.env;
for (const name of ["ASC_KEY_ID", "ASC_ISSUER_ID", "ASC_PRIVATE_KEY"])
  if (!env[name]) {
    console.error(`Missing ${name}. Add it as a GitHub Actions secret.`);
    process.exit(2);
  }
const commit = (env.COMMIT_SHA || env.GITHUB_SHA || "").toLowerCase();
if (!/^[0-9a-f]{40}$/.test(commit)) {
  console.error("COMMIT_SHA must be a full 40-character commit SHA.");
  process.exit(2);
}
const bundleId = env.BUNDLE_ID || "com.mountaineerapps.mosslight";
const groupName = env.BETA_GROUP || "Beta";
const deadline = Date.now() + Number(env.TIMEOUT_MINUTES || 90) * 60_000;
const key = createPrivateKey(env.ASC_PRIVATE_KEY.replace(/\\n/g, "\n"));

const b64 = (value) => Buffer.from(value).toString("base64url");
let token = "";
let tokenExpiry = 0;
function bearer() {
  const now = Math.floor(Date.now() / 1000);
  if (token && now < tokenExpiry - 60) return token;
  tokenExpiry = now + 15 * 60; // Apple allows at most 20 minutes.
  const header = b64(
    JSON.stringify({ alg: "ES256", kid: env.ASC_KEY_ID, typ: "JWT" }),
  );
  const payload = b64(
    JSON.stringify({
      iss: env.ASC_ISSUER_ID,
      iat: now,
      exp: tokenExpiry,
      aud: "appstoreconnect-v1",
    }),
  );
  const signature = sign("sha256", Buffer.from(`${header}.${payload}`), {
    key,
    dsaEncoding: "ieee-p1363",
  });
  token = `${header}.${payload}.${b64(signature)}`;
  return token;
}
async function api(path, init = {}) {
  const response = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${bearer()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = body.errors?.map((e) => e.detail || e.title).join("; ");
    throw new Error(
      `${response.status} ${path}: ${detail || "request failed"}`,
    );
  }
  return body;
}
const wait = (seconds) => new Promise((r) => setTimeout(r, seconds * 1000));
const lines = [];
const report = (line) => {
  console.log(line);
  lines.push(line);
};
function finish(code) {
  if (env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      env.GITHUB_STEP_SUMMARY,
      `## TestFlight status\n\n${lines.map((l) => `- ${l}`).join("\n")}\n`,
    );
  process.exit(code);
}

const app = (
  await api(`/v1/apps?filter[bundleId]=${encodeURIComponent(bundleId)}`)
).data?.[0];
if (!app) {
  report(`No App Store Connect app found for ${bundleId}.`);
  finish(1);
}
const product = (await api(`/v1/apps/${app.id}/ciProduct`)).data;
const group = (
  await api(
    `/v1/betaGroups?filter[app]=${app.id}&filter[name]=${encodeURIComponent(groupName)}`,
  )
).data?.[0];
if (!group) {
  report(`TestFlight group "${groupName}" not found.`);
  finish(1);
}
report(`Commit \`${commit.slice(0, 7)}\` · app ${bundleId}`);

// 1. Find the Xcode Cloud run for this commit and wait for it to finish.
let run = null;
for (let lastProgress = ""; Date.now() < deadline; await wait(60)) {
  const runs = await api(
    `/v1/ciProducts/${product.id}/buildRuns?sort=-number&limit=20`,
  );
  run = runs.data.find(
    (r) => r.attributes.sourceCommit?.commitSha?.toLowerCase() === commit,
  );
  if (!run) {
    console.log("Waiting for Xcode Cloud to start a run for this commit…");
    continue;
  }
  const { executionProgress, completionStatus, number } = run.attributes;
  if (executionProgress !== lastProgress)
    console.log(`Xcode Cloud run #${number}: ${executionProgress}`);
  lastProgress = executionProgress;
  if (executionProgress === "COMPLETE") break;
}
if (!run || run.attributes.executionProgress !== "COMPLETE") {
  report(
    run
      ? "Xcode Cloud run did not finish in time."
      : "No Xcode Cloud run started for this commit.",
  );
  finish(1);
}
report(
  `Xcode Cloud run #${run.attributes.number}: ${run.attributes.completionStatus}`,
);
if (run.attributes.completionStatus !== "SUCCEEDED") finish(1);

// 2. Wait for Apple's processing, make sure the build is in the group, and
//    wait for its internal TestFlight state to become Testing.
let assigned = false;
for (; Date.now() < deadline; await wait(60)) {
  const uploaded = (await api(`/v1/ciBuildRuns/${run.id}/builds`)).data?.[0];
  if (!uploaded) {
    console.log("Waiting for the uploaded build to appear…");
    continue;
  }
  const detail = await api(
    `/v1/builds/${uploaded.id}?include=preReleaseVersion,buildBetaDetail`,
  );
  const build = detail.data;
  const included = detail.included ?? [];
  const version = included.find((i) => i.type === "preReleaseVersions")
    ?.attributes.version;
  const beta = included.find((i) => i.type === "buildBetaDetails")?.attributes;
  const label = `${version ?? "?"} (${build.attributes.version})`;
  const processing = build.attributes.processingState;
  if (processing === "FAILED" || processing === "INVALID") {
    report(`Build ${label}: processing ${processing}`);
    finish(1);
  }
  if (processing !== "VALID") {
    console.log(`Build ${label}: processing ${processing}`);
    continue;
  }
  if (!assigned) {
    const members = await api(
      `/v1/betaGroups/${group.id}/relationships/builds?limit=200`,
    );
    assigned = members.data.some((m) => m.id === build.id);
    if (!assigned && env.ASSIGN_GROUP !== "false") {
      await api(`/v1/betaGroups/${group.id}/relationships/builds`, {
        method: "POST",
        body: JSON.stringify({ data: [{ type: "builds", id: build.id }] }),
      });
      assigned = true;
      console.log(`Added build ${label} to ${groupName}.`);
    }
  }
  const state = beta?.internalBuildState;
  console.log(`Build ${label}: ${state ?? "unknown"}`);
  if (assigned && state === "IN_BETA_TESTING") {
    report(`Build ${label} is **Testing** in ${groupName}.`);
    finish(0);
  }
  if (state === "MISSING_EXPORT_COMPLIANCE") {
    report(
      `Build ${label} needs the export-compliance answer in App Store Connect.`,
    );
    finish(1);
  }
}
report("Timed out before the build reached Testing.");
finish(1);
