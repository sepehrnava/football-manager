# football-manager
kir kos kon

## Spec-driven development

- [AGENTS.md](AGENTS.md): agent guide and selective reading to save tokens.
- [SPECS.md](SPECS.md): product scope and the list of feature specs.
- [PROJECT_STATUS.md](PROJECT_STATUS.md): current status, verification evidence and next step.
- [TASKS.md](TASKS.md): small tasks tied to acceptance criteria.
- [DECISIONS.md](DECISIONS.md): lasting architecture decisions.
- [Spec template](specs/_template.md): one numbered file per new feature.

Workflow: spec → acceptance criteria → small tasks → implementation → verification → status update.


A simple TypeScript project built with Expo SDK 57, React Native 0.86.3 and React 19.2.3.
Node.js available at setup time: 22.22.3, npm: 10.9.8, Windows 11 64-bit.
According to the SDK 57 documentation, the minimum compatible Node version is 22.13.x.

## Getting the project from GitHub

```powershell
git clone https://github.com/sepehrnava/football-manager.git
cd football-manager
npm.cmd ci
```

## Running again

In PowerShell, go to this folder and run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Start-Expo.ps1
```

This command allows the script to run for this invocation only and does not change any permanent Windows security setting. The script picks the current Wi-Fi address so the VPN address does not end up in the QR code. If Node is not found in a normal terminal, the script falls back to the Node bundled with Codex and adds its path for this run only:

```text
%LOCALAPPDATA%\hermes\node
```

On a network without a VPN you can also use the standard command:

```powershell
npm.cmd start -- --go --lan
```

## Viewing on this computer

For the web version of the app, run the command below first, then open http://localhost:8082 in this computer's browser:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Start-Expo.ps1 -Web
```

You can run this server in a separate PowerShell window from the phone server. Press Ctrl+C to stop it. The web version is a browser preview of the same React Native code. If you want the exact look and behavior of Android on the computer, you need to set up an Android emulator.

A new QR code is shown in the terminal; after a network change, do not use the old QR code. Keep the terminal open. Press Ctrl+C to stop.

## On an Android phone

1. Install Expo Go from https://expo.dev/go or Google Play.
2. Connect the phone and the computer to the same Wi-Fi network.
3. In Expo Go, tap Scan QR code and scan the QR code in the terminal.
4. The app should open on the "Pocket Manager" club creation screen.

Android Studio is not needed for this project or for running Expo Go on a phone. For an emulator and local native builds you will need the Android SDK tools. Android Studio, the SDK, adb and Java were not found during the initial check. Firmware virtualization is enabled and a hypervisor is available, but running an emulator has not been tested yet. System installation was not done with Administrator access.

## If the connection fails

The address shown in the QR code must be the Wi-Fi address. In the phone's browser, open this host's HTTP address with the /status suffix; in the example below, replace YOUR_WIFI_IP with the computer's Wi-Fi address:

```text
http://YOUR_WIFI_IP:8081/status
```

The correct response is: packager-status:running. If this page does not open, send the error text so the VPN, firewall and network device isolation can be checked. Do not turn off the firewall. If Windows asks for Node.js permission, allow it on trusted networks only.
According to the official Expo documentation, a tunnel connection can also be used on networks that block communication between devices; it must be prepared and tested separately and has not yet been tested in this setup.

## Checks performed

- Installed dependencies with npm and created package-lock.json.
- expo install --check: passed.
- Expo Doctor: all 21 checks passed.
- TypeScript in strict mode: passed.
- ESLint: installed and run as described in AGENTS.md.
- Server response on localhost and the Wi-Fi address: HTTP 200.
- Android bundle generation with Metro: passed.
- Web build generation and page response in a local browser: passed.
- Real display on a phone or emulator: awaiting user confirmation.

The official template has 23 warnings in npm audit (7 moderate and 16 high) in the dependency chain. Some of npm's suggested fixes downgrade Expo or React Native to very old versions; audit fix --force has not been run.

To reinstall dependencies exactly, run npm.cmd ci only when needed. To add libraries later, use npx.cmd expo install.

Official sources:
- https://docs.expo.dev/get-started/create-a-project/
- https://docs.expo.dev/more/create-expo/
- https://docs.expo.dev/versions/v57.0.0/
- https://docs.expo.dev/get-started/start-developing/
