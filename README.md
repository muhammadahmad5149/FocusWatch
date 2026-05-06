# ScreenGuardian

ScreenGuardian is a Windows-focused Electron and Node.js parental control application. The Electron app shows standard users that monitoring is running, while screenshot capture runs in the background as `ScreenGuardianService`.

## Features

- Captures full-screen PNG screenshots every 1 to 3 minutes using `screenshot-desktop`.
- Stores screenshots locally first under `screenshots/YYYY-MM-DD` in the ScreenGuardian data directory.
- Logs screenshot and email events to `logs/activity.log`.
- Checks internet availability with DNS lookup to `google.com`.
- Sends pending screenshots in batches with `nodemailer` only when email reporting is explicitly enabled.
- Starts the tray app at user login.
- Installs as an automatic Windows startup service with restart-on-failure recovery.
- Minimizes the dashboard to the system tray on close.
- Requires admin password authentication before showing email settings, logs, screenshot folders, or exit controls.

## Data Location

By default, Windows data is stored in:

```text
C:\ProgramData\ScreenGuardian
```

For development, set `SCREEN_GUARDIAN_DATA_DIR` to override the data folder.

Copy `.env.example` to `.env` if you want local development defaults for the data directory, screenshot intervals, or SMTP settings.

On Windows, the installer protects the data directory so only `SYSTEM` and local Administrators have access. Standard users can see ScreenGuardian status in the tray app but cannot browse, edit, or delete captured data directly.

## Development

```bash
npm install
npm start
```

Run the service directly during development:

```bash
npm run service
```

## Build Windows EXE

Build the Windows installer on a Windows machine from an Administrator terminal:

```bash
npm install
npm run dist:win
```

The installer is created in `dist/` as a `.exe` file. The installer uses a per-machine install for service setup, while the tray app runs as the logged-in user so standard users can see ScreenGuardian status.

## Windows Service

Open an elevated Administrator terminal before installing or uninstalling the service.

```bash
npm run install-service
npm run uninstall-service
```

The installed service name is `ScreenGuardianService`. Windows Service Control Manager permissions prevent standard users from stopping or uninstalling the service when installed by an administrator, and service recovery restarts it after failures.

## Email Settings

Email reporting is disabled by default. Configure SMTP settings in the dashboard and enable the email upload toggle. Screenshots remain stored locally even when offline or when email sending fails.

Set an admin password before using protected dashboard controls. Keep real SMTP credentials in the protected app settings or local development `.env`; the packaged app does not include `.env`.
