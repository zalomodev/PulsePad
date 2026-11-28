# Third-party notices

PulsePad's original application code is MIT-licensed. Third-party licenses remain separate.

- **Electron:** MIT, https://github.com/electron/electron . Its LICENSE and Chromium notices are bundled as `LICENSE` / `LICENSES.chromium.html`.
- **Chromium, Node.js and Electron components:** their upstream licenses and bundled notices apply.
- **ffmpeg-static / FFmpeg:** development-only tooling, not included in PulsePad 1.1 release binaries. Independent redistribution must meet the build-specific GPL/LGPL terms: https://github.com/eugeneware/ffmpeg-static and https://ffmpeg.org/legal.html .
- **VB-CABLE / Steam virtual devices:** separate products, not bundled, owned, endorsed or installed by PulsePad. Obtain drivers from their official providers.

Icons are inline SVG paths authored for this app. COM interface reference: https://github.com/LizardByte/Sunshine/blob/master/src/platform/windows/PolicyConfig.h . No Sunshine binaries are included.

No songs, personal libraries, credentials or recordings are included in the public release.

Optional Clean processing downloads, but does not bundle, the UVR MDX instrumental model and faster-whisper/Systran model files. Their upstream usage terms apply independently: https://github.com/TRvlvr/model_repo and https://github.com/SYSTRAN/faster-whisper . Python audio dependencies are installed separately in the user environment. OpenCode is a separately installed CLI: https://opencode.ai . Spotify metadata is read through Windows media sessions; no Spotify SDK, credentials or audio are bundled.
