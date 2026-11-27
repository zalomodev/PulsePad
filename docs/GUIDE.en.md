# Voice + music setup

[Español](GUIDE.es.md) · [Back](../README.md)

## 1. Connect

Use headphones and a physical microphone. This PC also needs a compatible virtual audio bridge. PulsePad supports Steam Streaming Microphone if already active, or VB-CABLE; it does not bundle or install these drivers.

Open **Guide → Set up voice and music**, or **Enable for games**. In Audio settings, choose your physical mic under **Include my voice**, real headphones under **Listen here**, and the bridge playback endpoint under **Send to voice chat**.

| Bridge | Output in PulsePad | Microphone in the game |
| --- | --- | --- |
| Steam | Speakers (Steam Streaming Microphone) | Microphone (Steam Streaming Microphone) |
| VB-CABLE | CABLE Input | CABLE Output |

## 2. Mix

Speak normally and check the voice meter. Start with a low send level (10% by default), then bring music under your voice. Turning everything up may distort the virtual device. Keep headphones selected for local listening. Never select the virtual mic as your physical voice source.

## 3. Record and listen

Choose a track and the **virtual microphone input**, then record six seconds while speaking. This captures the actual selected input. Detecting signal confirms some audio arrived; listen to check voice and music separately and together. It does not prove remote quality.

The recording stays in memory for this session and is not uploaded or saved automatically. The test starts the selected track and stops it afterwards. Playback uses your local output, avoiding a loop back into the mix.

## 4. Join the game

Choose **Default** or the virtual input above as the game's microphone. Reconnect an already-open voice chat. With push to talk, hold its key while triggering a sound. Keep PulsePad running for global shortcuts. Shortcuts can be occupied by other apps, and games at different privilege levels may handle keyboard input differently.

If music gets cut off, try disabling noise suppression/automatic gain and adjusting sensitivity in the receiving app. These are game/chat settings, not PulsePad settings. See [Discord troubleshooting](https://support.discord.com/hc/en-us/articles/360045138471-Discord-Voice-and-Video-Troubleshooting-Guide) and [VB-CABLE's input/output description](https://vb-audio.com/Cable/).

## Troubleshooting

- **No bridge:** install or enable a compatible device, then Refresh devices. Local playback works without it.
- **Only music:** enable Include my voice, select the physical microphone and check Windows microphone permissions.
- **Only voice:** enable Send to voice chat and check the virtual output and sound/send levels.
- **Echo:** wear headphones, disable Windows' Listen to this device for the virtual input and avoid selecting the bridge as local speakers.
- **Distortion:** reduce send/music levels. The compressor cannot repair a clipped source or all driver gain issues.
- **Dropouts:** check push to talk, filters, sensitivity, device connection and voice-chat restart.
- **Another PC:** reselect devices; their IDs differ and profiles do not install missing drivers.

Disable game mode or exit to restore previous microphone roles if they still point to the bridge chosen by PulsePad. **Stop sounds does not mute your voice.** Forced termination can prevent restoration; use Windows Sound settings to restore the microphone manually if needed.
