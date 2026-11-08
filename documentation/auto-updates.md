# Desktop updates

Packaged Ghost Runner checks GitHub Releases ten seconds after launch and every
four hours. It downloads stable updates automatically. The header shows download
progress and a **Restart to update** button. Updates also install when you quit
the app normally. Restarting stops the backend and interrupts running tasks, so
finish your tasks before clicking the button. Closing the macOS window only
hides it. Use Quit or the restart button to install.

The web dashboard and development Electron builds do not install updates. Linux
updates require the AppImage build, stored somewhere your user can write to.
The initial updater-enabled version must be installed manually. Older versions
without the updater cannot discover it.

## Publish a version

1. Push these changes to GitHub.
2. Create and publish a GitHub Release with a new tag such as `v1.1.0` pointing
   at the commit you want to ship. Use a higher version for every release.
3. Wait for **Publish desktop release** to finish. It builds Linux x64 AppImage,
   Windows x64 NSIS, and universal macOS DMG and ZIP installers when signing is
   configured, then attaches them and the `latest*.yml` metadata to that release.

The workflow takes the installer version from the release tag. It ignores
prereleases. Keep the ZIP, blockmaps, and YAML files attached to the release,
since the updater needs them. All enabled platform builds must succeed before the
workflow attaches files. A failed run can be rerun for the same release.

If a release already exists without files, run **Publish desktop release** from
the Actions tab on the default branch and enter its tag in `release_tag`. This
uses the current workflow to build the tagged source, so workflow fixes do not
require moving an existing tag. Publish a new version to ship application fixes.
The pnpm setup action reads the version from `package.json`; do not add a second
version in the workflow.

The update feed is the public repository `vinicius741/ghost-runner`, configured
in `package.json` under `build.publish`. Change it if you move the repository.
No GitHub token is bundled with the app. Private repositories need a separate
authenticated distribution service.

## macOS signing

macOS installs an update only when its code signature matches the certificate of
the app that is already installed. Ad-hoc signed builds (the default when no
certificate is configured) pin one exact build, so they can never update in
place. Ghost Runner uses a free self-signed certificate for this instead of a
paid Apple Developer ID.

### One-time setup (self-signed)

1. On your Mac, run `scripts/macos-create-signing-cert.sh`. It creates the
   certificate in `~/.ghost-runner-signing/` and trusts it for code signing on
   this Mac (macOS asks for your password once). Back up that folder. If you
   lose it, every installed copy needs one more manual reinstall.
2. Let GitHub Actions sign releases with the same certificate:
   ```bash
   base64 -i ~/.ghost-runner-signing/ghost-runner-signing.p12 | gh secret set MAC_CSC_LINK
   gh secret set MAC_CSC_KEY_PASSWORD < ~/.ghost-runner-signing/ghost-runner-signing.password
   ```
3. Build a signed copy with `scripts/macos-build-signed.sh` and replace the app
   in `/Applications` with `release/mac-arm64/Ghost Runner.app` by hand. This is
   the last manual install. Later releases update it automatically.

Always sign with the same certificate. A build signed with a different one is
rejected by installed apps.

Self-signed builds are not notarized. They run without warnings on the Mac that
built them and update normally, because updates downloaded by the app are not
quarantined. On another Mac, the first install from a downloaded DMG needs
right-click → **Open** (or `xattr -dr com.apple.quarantine`). macOS may also ask
once to allow Ghost Runner to update apps under **System Settings → Privacy &
Security → App Management**.

### Developer ID (optional)

To notarize instead, set `MAC_CSC_LINK` and `MAC_CSC_KEY_PASSWORD` to a
Developer ID Application certificate and add `APPLE_ID`,
`APPLE_APP_SPECIFIC_PASSWORD` and `APPLE_TEAM_ID`. When `APPLE_ID` is set, the
workflow signs and notarizes. Switching certificates requires one manual
reinstall.

### Without signing secrets

Without `MAC_CSC_LINK`, the workflow skips macOS and publishes Linux and
Windows. The release then has no `latest-mac.yml`, and installed macOS builds
cannot update from it. The dashboard reports this as unavailable update files,
with an explanation under **Update status details**. Full updater errors stay in
the desktop logs. Windows installers currently ship unsigned and may show
SmartScreen warnings.

Ad-hoc macOS builds show **Manual updates** and the installed version. They do
not check or download from the update feed. Development and non-AppImage Linux
builds also explain why automatic updates are disabled.

## Verify a release

Install a signed or supported packaged build, publish a higher version, and use
**Check for updates**. Verify that the download completes, restart from the
button, and confirm the new version in the header. Check that local tasks,
settings, schedules, and browser sessions remain in the app's user-data folder.
These files are excluded from installers.
