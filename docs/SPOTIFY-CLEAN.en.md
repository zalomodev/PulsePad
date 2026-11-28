# Spotify shortcuts and Clean versions (1.2 beta)

[Español](SPOTIFY-CLEAN.es.md) · [Main guide](GUIDE.en.md)

## Spotify without OAuth

Open **Spotify + Clean** and enable **Detect what is playing in the Spotify app**. Windows' media-session API supplies title and artist from the desktop Spotify app. A playing track produces an **Add this via Spotify?** suggestion. This reads metadata only, not the Spotify audio stream, cookies or account credentials.

Save a shortcut with an exact `https://open.spotify.com/track/...` link for exact-track launch. The app opens its `spotify:track:...` URI in Spotify. Without an exact link, PulsePad saves a search shortcut and tries to resume the current media session only when its title and artist match. Otherwise it opens a search, where you choose the song.

**Spotify remains the player.** Nothing is downloaded. These shortcuts are not routed through PulsePad's volume, microphone mix, waveform, loop or Clean processing. PulsePad does not provide a full embedded Spotify stream without authorization. Spotify must be installed and usable with your own session. Browser-only Spotify sessions are not detected by this desktop integration.

Sources: [Microsoft media sessions](https://learn.microsoft.com/en-us/uwp/api/windows.media.control.globalsystemmediatransportcontrolssessionmanager), [Spotify playback requirements](https://developer.spotify.com/documentation/web-playback-sdk/tutorials/getting-started).

## Clean versions of local files

This optional feature requires **Python 3.11+**. **OpenCode** is additionally required for AI selection of edits. Install these from their official sites, then use **Prepare free tools**. The app uses installed compatible Python modules or installs pinned dependencies into its own `clean-tools` virtual environment. Setup downloads about 600 MB of local models. Processing is CPU-based and can take minutes per song.

The original audio is always kept. Open a local sound's options and choose:

- **Censor · create Clean version:** transcribe locally, send the indexed transcript to the chosen zero-cost OpenCode model, validate its word selections, then replace those vocal spans with locally separated accompaniment.
- **Manual clean · select edits:** transcribe locally and mark the words yourself. This works without an OpenCode quota or model request.
- On an existing Clean copy, **Review this Clean version's edits** lets you change selections and create another copy. Existing versions are never overwritten.

Copies are named `Original name — Clean`, `Original name — Clean (2)`, etc. They are marked **review required**. Fade and padding settings smooth transitions around chosen words. Nothing is replaced with a bleep, and the sample duration stays unchanged. Instrumental separation can still leave artifacts or vocal bleed. Automatic transcription can miss or hallucinate lyrics; uncertain/repetitive spans are flagged or excluded. A Clean label does not certify completeness or acceptance by a platform.

## Automatic on import

**Off by default.** When enabled, each newly imported local file is saved first and queued for a separate Clean copy. Existing library entries, Spotify links and newly generated Clean copies are not recursively processed. A queue failure, cancellation or missing tool keeps the original and does not claim a successful edit. You can cancel queued/running jobs in the feature panel. Closing the app cancels its jobs and tool setup. Pending jobs are not resumed after restart.

## Free means no paid fallback

PulsePad reads the installed OpenCode CLI's current `opencode` catalog and permits only active text models with zero input/output prices. It invokes the official CLI, not a disguised request to a restricted free endpoint. The transcript is sent to that provider; audio stays local. OpenCode may store session history locally, and providers have their own retention policies. No OpenCode key is bundled or collected by PulsePad.

Providers can reject requests, change models or exhaust quotas. A quota error stops processing, briefly blocks further AI attempts and leaves the original intact. **No paid model is chosen automatically.** Manual word selection remains available. Live testing for this beta received a free-quota-exhausted response; successful remote AI classification is not claimed for that run. Local transcription, manual selection, instrumental rendering and separate-copy creation were tested with synthetic speech. Automatic import/queue behavior has separate tests with a mocked job executor.

References: [OpenCode CLI](https://opencode.ai/docs/cli/), [current model/free-tier documentation](https://opencode.ai/docs/console/models/).

## Models and private files

Local models live under the active data folder's `clean-models`. The instrumental model is downloaded from [UVR's model repository](https://github.com/TRvlvr/model_repo/releases/tag/all_public_uvr_models) and verified by SHA-256; transcription uses [faster-whisper](https://github.com/SYSTRAN/faster-whisper). Model files are not bundled with the app. Their upstream licenses and usage terms apply independently.

`clean-jobs` contains local transcripts, plans and temporary output; `clean-reports` stores editable reports for generated copies. These files can contain lyrics. They are not part of public releases. Close PulsePad before backing up or removing job files; keep reports if you want to revise existing Clean copies.
