# Mosslight on Xcode Cloud and TestFlight

The repository contains a Capacitor iOS app, a shared Xcode scheme, and executable
Xcode Cloud build hooks. The game is bundled inside the app and works offline. The app targets iOS/iPadOS
16.4 or newer, matching the bundled browser code’s Safari requirements.
GitHub Actions checks the JavaScript build; Xcode Cloud handles Apple archives,
managed signing, and TestFlight distribution.

Mosslight is connected to Xcode Cloud with automatic signing configured in the
project. A successful signed archive and TestFlight upload still require
verification in App Store Connect. The account setup below also applies when
connecting a new Apple team or repository.

The existing App Store Connect app is **MossLight2** (app ID `6827876891`),
while its Xcode Cloud product and active workflow are named **Mosslight**.
They share bundle ID `com.mountaineerapps.mosslight`. Internal builds are
distributed to the existing **Beta** group. Verify the exact uploaded build
number against the release commit before assigning it; an archive success
alone does not confirm that testers have access.

## 1. Register the app and connect the repository

1. Use an active Apple Developer Program membership with access to App Store
   Connect and Xcode Cloud. Accept any outstanding agreements.
2. Register an explicit App ID. The project currently uses
   `com.mountaineerapps.mosslight`; confirm that your team owns this identifier, or
   replace it in `capacitor.config.ts` and both `PRODUCT_BUNDLE_IDENTIFIER`
   entries in `ios/App/App.xcodeproj/project.pbxproj`.
3. In App Store Connect, create an iOS app named **Mosslight** using that App ID.
   Choose your own SKU and primary language. App-name availability is determined
   by Apple.
4. Push the project and lockfile to the connected GitHub repository. On a Mac with
   Xcode 26 or newer and Node 22 LTS, run:

   ```sh
   npm ci
   npm run build
   npx cap sync ios
   open ios/App/App.xcodeproj
   ```

5. In the **App** target's **Signing & Capabilities**, select your Apple team and
   leave **Automatically manage signing** enabled. Confirm the bundle identifier
   and commit the resulting project change. Do not add signing keys to Git.
6. Choose **Product → Xcode Cloud → Create Workflow** for the **App** scheme.
   Connect the GitHub repository when prompted and grant Apple the required
   repository access. Xcode Cloud settings are managed in Xcode/App Store
   Connect; this repository cannot create them through a YAML file.

## 2. Configure the workflow

| Setting         | Value                                                               |
| --------------- | ------------------------------------------------------------------- |
| Workflow name   | Mosslight                                                           |
| Repository      | `jerahnhyman-ui/mosslight`                                           |
| Project         | `ios/App/App.xcodeproj`                                             |
| Scheme          | `App` (shared)                                                      |
| Xcode           | Xcode 26 or newer, with its compatible macOS image                  |
| Start condition | Branch changes on `main`; use manual runs during setup              |
| Action          | Archive — iOS, Release, Any iOS Device                              |
| Distribution    | TestFlight (Internal Testing Only)                                  |
| Tester group    | Beta — verify each new build is assigned and shows Testing          |

A TestFlight post-action can automate group assignment. The current release
procedure still verifies the group after processing, regardless of automation.

No App Store Connect API key, `.p12`, or provisioning-profile secret is required
for Xcode Cloud managed signing. The Apple team authorization is performed in
Xcode/App Store Connect. Do not paste Apple credentials into chat or source files.

Xcode Cloud discovers `ios/App/ci_scripts/ci_post_clone.sh` beside the Xcode
project. It selects Node 22, installs from `package-lock.json`, runs the game
tests, builds the web bundle, and syncs the Capacitor Swift package. The
repository preflight then verifies the generated assets and dependency lock. The
`ci_pre_xcodebuild.sh` hook fails early if those assets or the package are absent.
Keep these hooks executable in Git. CocoaPods is not required: this project uses
Swift Package Manager. The generated `CapApp-SPM` package pins the remote
`capacitor-swift-pm` dependency to the Capacitor version in the npm lockfile.

Xcode Cloud disables automatic dependency resolution. Commit the matching Swift
dependency lockfile at
`ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved`.
It locks the Capacitor release to its Git revision; `Package.swift` alone is not
enough. After updating Capacitor, run `npm run ios:sync`, then on a Mac resolve
the updated dependencies and commit both lockfiles and the generated manifest:

```sh
xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj -scheme App
npm run ios:check
```

Keep `package-lock.json`, `CapApp-SPM/Package.swift`, and `Package.resolved` in
sync. The repository preflight rejects a missing Swift lockfile or a Capacitor
version mismatch before the Xcode Cloud archive starts.

## 3. Run the first build

1. Trigger the workflow in Xcode or App Store Connect. Verify that the post-clone
   script, archive, signing, and upload steps succeed.
2. Wait for Apple's TestFlight processing. In App Store Connect, complete beta
   app information, export-compliance questions, and a contact address if asked.
   The current app declares no non-exempt encryption; revisit that declaration
   if future features add encryption that changes the answer.
3. Add internal testers to the selected group. They install the processed build
   through Apple's TestFlight app. External testers require Apple's beta review
   and are a separate distribution choice.
4. On a real iPhone and iPad, verify movement and jump together, pause/resume,
   audio after backgrounding, landscape layout, checkpoints, and level completion.

Xcode Cloud supplies the archive's build number. Increase the marketing version
in the Xcode project for a new app release. Do not distribute a second archive
with a previously uploaded version/build-number pair.

## Local checks

```sh
npm test
npm run build
npm run test:browser
npx cap sync ios
node scripts/check-testflight.mjs
```

These checks verify repository assets and settings only. A passing result does
not prove Apple account access, code signing, an iOS compilation, or a successful
TestFlight upload. Native compilation and device testing require Xcode/macOS.

For living-garden updates, follow the [release acceptance and physical-device
playtest](LIVING_GARDEN.md#release-acceptance). Check all three guardian fights,
save migration, the home grove and cosmetic purchases, mode-specific records,
and unlocked challenge rooms. Existing firefly rescues must survive an update.
Record a physical-device playtest separately from the automated and archive
results; neither substitutes for touch feel on an actual phone.

## Common build failures

- **A resolved file is required when automatic dependency resolution is disabled:**
  commit the workspace's `Package.resolved` at the path above. If Capacitor was
  updated, resolve packages on a Mac and commit the refreshed lockfile before
  retrying. Do not disable Xcode Cloud's dependency locking.
- **Generated Capacitor Swift package missing:** check the `npm ci` and `cap sync ios`
  output in the post-clone log. Do not resolve packages before that hook finishes.
- **No signing team / App ID unavailable:** select the correct team and an App ID
  owned by it, then commit the project settings.
- **Post-clone hook not found:** keep the scripts at `ios/App/ci_scripts` and retain
  their executable file mode.
- **Repository access denied:** reconnect GitHub in Xcode Cloud's repository
  settings; this workspace's Git credentials do not authorize Apple's service.
- **Upload succeeded but testers see no build:** wait for processing, resolve
  compliance prompts, and assign the build to the intended TestFlight group.
