# Krill Image Studio

Local AI image creation app built with Tauri 2. The same source supports Windows and macOS.

## Local development

```bash
npm install
npm run dev
```

## Windows package

```powershell
npm run build -- --bundles nsis
```

The installer is written to `src-tauri/target/release/bundle/nsis/`.

## macOS packages with GitHub Actions

1. Create a private GitHub repository named `krill-image-studio`.
2. Push this project directory as the repository root.
3. Open the repository's Actions page.
4. Select `Build macOS DMG`, then choose `Run workflow`.
5. Download the two artifacts after the workflow completes:
   - `Krill-Image-Studio-macOS-apple-silicon`
   - `Krill-Image-Studio-macOS-intel`

The first workflow produces ad-hoc signed test builds. On first launch, macOS may require approval in System Settings > Privacy & Security.

## Production signing

For public distribution, replace ad-hoc signing with an Apple Developer `Developer ID Application` certificate and Apple notarization credentials. Never commit certificates, passwords, API keys, or signing secrets to the repository.

## Local data

- Windows credentials: Windows Credential Manager
- macOS credentials: Apple Keychain
- Settings and history: the operating system's local application data directory
- Generated images: the directory selected in Settings
