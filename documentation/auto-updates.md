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

All installers are built and signed in GitHub Actions. Publishing a release or
a test build needs only the GitHub CLI (`gh auth login`) with push access to
the repository. No signing key is needed on the machine that starts it, so any
of your machines or coding agents can release.

## Publish a version

From a checkout of the repository on any machine:

```bash
pnpm release              # next patch version, e.g. 1.1.2 -> 1.1.3
pnpm release minor        # or major, or an exact version such as 1.4.0
pnpm release --dry-run    # show the version and commit without publishing
```

The command releases the current `main` on GitHub (pass `--ref <branch or
commit>` for another one), so push your changes first. It:

1. Picks the next version from the latest published release.
2. Checks that CI passed for that commit, waiting if it is still running.
   `--skip-ci-check` skips this.
3. Starts **Publish desktop release**, which creates a draft release with
   generated notes and builds Linux x64 AppImage, Windows x64 NSIS and universal
   macOS DMG and ZIP installers.
4. Attaches the installers and `latest*.yml` update metadata, verifies that
   every file is present and matches the version, then publishes the release.
5. Waits for the workflow and checks the published files again. `--no-wait`
   returns as soon as the build starts.

Installed apps only see the release after it is published, so a failed build
leaves an unpublished draft and never breaks updates. Fix the cause and run the
same command again with the exact version (for example `pnpm release 1.1.3`),
or rerun the failed jobs from the Actions tab. Both reuse the draft.

The installer version comes from the release tag. `package.json` does not need
a version bump. Versions must increase with every release.

Without a terminal, run **Publish desktop release** from the Actions tab with a
new tag in `release_tag`. Publishing a release by hand on GitHub also builds and
attaches the files, but apps can see that release while the files build.

### Repair or check a release

Run **Publish desktop release** from the Actions tab with an existing tag in
`release_tag`. It rebuilds that tag with the current workflow and attaches the
files again, so workflow fixes do not require moving a tag. To check a release
without changing it:

```bash
pnpm release:verify v1.1.3
```

The update feed is the public repository `vinicius741/ghost-runner`, configured
in `package.json` under `build.publish`. Change it if you move the repository.
No GitHub token is bundled with the app. Private repositories need a separate
authenticated distribution service.

## Signed test builds

To try a branch in a real signed app without publishing a release, run
**Signed test build** from the Actions tab (or
`gh workflow run test-build.yml -f ref=<branch>`). It builds macOS by default,
or every platform, and attaches the installers to the run as artifacts for 14
days.

A test build is versioned as the next patch with a `-test` suffix, such as
`1.1.3-test.7`. Installed apps do not downgrade it to the current release, and
they update normally once that next version is released.

## macOS signing

macOS installs an update only when its code signature matches the certificate of
the app that is already installed. Ad-hoc signed builds (the default when no
certificate is configured) pin one exact build, so they can never update in
place. Ghost Runner uses a free self-signed certificate instead of a paid Apple
Developer ID.

Releases fail rather than skip macOS when the signing secrets are missing,
because a release without `latest-mac.yml` stops updates on every installed Mac.

### Where the certificate lives

| Location | Purpose |
| --- | --- |
| GitHub repository secrets `MAC_CSC_LINK` and `MAC_CSC_KEY_PASSWORD` | Used by the workflows to sign every build. |
| Your password manager | The only copy you can recover. Store the `.p12` file and its password there. |

GitHub secrets cannot be read back, not even by the repository owner, so they are
not a backup. If the certificate is lost, every installed copy needs one manual
reinstall of a build signed with a new certificate. Always sign with the same
certificate.

Once the certificate is in your password manager, delete the local copy with
`rm -rf ~/.ghost-runner-signing`. No machine needs it for releases or test
builds.

### Create a certificate or restore the secrets

1. On a Mac, run `scripts/macos-create-signing-cert.sh`. It writes the
   certificate and its password to `~/.ghost-runner-signing/` and trusts it for
   code signing on that Mac (macOS asks for your password once).
2. Upload it to GitHub:
   ```bash
   base64 -i ~/.ghost-runner-signing/ghost-runner-signing.p12 | gh secret set MAC_CSC_LINK
   gh secret set MAC_CSC_KEY_PASSWORD < ~/.ghost-runner-signing/ghost-runner-signing.password
   ```
3. Save both files in your password manager, then delete
   `~/.ghost-runner-signing`.

To restore the secrets later, save the two files from your password manager to a
temporary folder and repeat step 2 with those paths.

A new certificate requires one manual install of a build signed with it. Use a
DMG from the next release or a signed test build.

### Local signed builds (optional)

`scripts/macos-build-signed.sh` builds a signed app on a Mac that has the
certificate in `~/.ghost-runner-signing/`. Signed test builds make this
unnecessary. If you use it, keep the default DMG and ZIP targets. A `--dir`
build omits `app-update.yml`, and that app cannot check for updates.

### Installing on a Mac

Self-signed builds are not notarized. Updates downloaded by the app are not
quarantined, so they install without warnings. The first install from a
downloaded DMG or test build needs right-click → **Open** (or
`xattr -dr com.apple.quarantine "/Applications/Ghost Runner.app"`). macOS may
also ask once to allow Ghost Runner to update apps under **System Settings →
Privacy & Security → App Management**.

Ad-hoc signed local builds show **Manual updates** and the installed version.
They do not check or download from the update feed. Development and
non-AppImage Linux builds also explain why automatic updates are disabled. If a
release is missing update files for a platform, the dashboard reports them as
unavailable, with details under **Update status details**. Full updater errors
stay in the desktop logs.

### Developer ID (optional)

To notarize instead, set `MAC_CSC_LINK` and `MAC_CSC_KEY_PASSWORD` to a
Developer ID Application certificate and add `APPLE_ID`,
`APPLE_APP_SPECIFIC_PASSWORD` and `APPLE_TEAM_ID`. When `APPLE_ID` is set, the
workflow signs and notarizes. Switching certificates requires one manual
reinstall.

Windows installers currently ship unsigned and may show SmartScreen warnings.

## Verify a release

Install a signed or supported packaged build, publish a higher version, and use
**Check for updates**. Verify that the download completes, restart from the
button, and confirm the new version in the header. Check that local tasks,
settings, schedules, and browser sessions remain in the app's user-data folder.
These files are excluded from installers.
