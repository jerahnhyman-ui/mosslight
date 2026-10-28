import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let failures = 0;
const read = (path) => readFileSync(resolve(root, path), "utf8");
function check(label, condition) {
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition) failures += 1;
}
const required = [
  "package-lock.json",
  "ios/App/App.xcodeproj/project.pbxproj",
  "ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme",
  "ios/App/App/Info.plist",
  "ios/App/App/PrivacyInfo.xcprivacy",
  "ios/App/CapApp-SPM/Package.swift",
  "ios/App/App/public/index.html",
  "ios/App/App/capacitor.config.json",
  "ios/App/App/config.xml",
  "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
];
for (const path of required) check(path, existsSync(resolve(root, path)));
if (failures) process.exit(1);

const config = JSON.parse(read("ios/App/App/capacitor.config.json"));
const project = read("ios/App/App.xcodeproj/project.pbxproj");
const plist = read("ios/App/App/Info.plist");
const scheme = read(
  "ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme",
);
const icon = readFileSync(resolve(root, required.at(-1)));
check("Web assets are bundled; no development server URL", !config.server?.url);
check(
  "Bundle ID matches both native configurations",
  [...project.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g)].filter(
    (m) => m[1] === config.appId,
  ).length === 2,
);
check(
  "Automatic signing configured",
  (project.match(/CODE_SIGN_STYLE = Automatic;/g) ?? []).length === 2,
);
check(
  "Shared scheme archives the App target",
  scheme.includes('buildForArchiving="YES"') &&
    scheme.includes('BlueprintIdentifier="504EC3031FED79650016851F"'),
);
check(
  "App privacy manifest is included in Resources",
  project.includes("PrivacyInfo.xcprivacy in Resources"),
);
check(
  "Encryption declaration present",
  /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\s*\/>/.test(plist),
);
check(
  "Native app supports landscape",
  plist.includes("UIInterfaceOrientationLandscapeLeft") &&
    plist.includes("UIInterfaceOrientationLandscapeRight"),
);
check(
  "App icon is 1024×1024 opaque RGB PNG",
  icon.toString("ascii", 1, 4) === "PNG" &&
    icon.readUInt32BE(16) === 1024 &&
    icon.readUInt32BE(20) === 1024 &&
    icon[25] === 2,
);
for (const name of ["ci_post_clone.sh", "ci_pre_xcodebuild.sh"]) {
  const path = resolve(root, "ios/App/ci_scripts", name);
  check(
    `${name} exists and is executable`,
    existsSync(path) && Boolean(statSync(path).mode & 0o111),
  );
}
console.log(
  "\nRepository validation only. Apple team access, Xcode compilation, signing, workflow activation, and TestFlight upload require verification in Xcode Cloud.",
);
if (!project.includes("DEVELOPMENT_TEAM ="))
  console.log(
    "ACTION: Select your Apple Developer team in Xcode before activating the cloud workflow.",
  );
process.exitCode = failures ? 1 : 0;
