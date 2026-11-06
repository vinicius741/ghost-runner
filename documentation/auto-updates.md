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

The update feed is the public repository `vinicius741/ghost-runner`, configured
in `package.json` under `build.publish`. Change it if you move the repository.
No GitHub token is bundled with the app. Private repositories need a separate
authenticated distribution service.

## macOS signing

Add these GitHub Actions repository secrets to enable macOS releases:

| Secret | Value |
| --- | --- |
| `MAC_CSC_LINK` | Base64-encoded Developer ID Application `.p12` certificate |
| `MAC_CSC_KEY_PASSWORD` | Password for that certificate |
| `APPLE_ID` | Apple developer account email |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password for notarization |
| `APPLE_TEAM_ID` | Apple developer team ID |

macOS auto-updates require signed builds. Without `MAC_CSC_LINK`, the workflow
skips macOS and publishes Linux and Windows. Once that secret is present, the
remaining signing secrets are required. Keep the same signing identity across releases. Windows
installers currently ship unsigned and may show SmartScreen warnings.

## Verify a release

Install a signed or supported packaged build, publish a higher version, and use
**Check for updates**. Verify that the download completes, restart from the
button, and confirm the new version in the header. Check that local tasks,
settings, schedules, and browser sessions remain in the app's user-data folder.
These files are excluded from installers.
