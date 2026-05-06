# ScreenGuardian

ScreenGuardian is a Windows-focused Electron and Node.js parental control application. The Electron app is an admin dashboard only; screenshot capture runs in the background as `ScreenGuardianService`.

## Features

- Captures full-screen PNG screenshots every 1 to 3 minutes using `screenshot-desktop`.
- Stores screenshots locally first under `screenshots/YYYY-MM-DD` in the ScreenGuardian data directory.
- Logs screenshot and email events to `logs/activity.log`.
- Checks internet availability with DNS lookup to `google.com`.
- Sends pending screenshots in batches with `nodemailer` only when email reporting is explicitly enabled.
- Installs as a Windows startup service with `node-windows`.
- Minimizes the dashboard to the system tray on close.
- Requires admin password confirmation before exiting the tray app.

## Data Location

By default, Windows data is stored in:

```text
C:\ProgramData\ScreenGuardian
```

For development, set `SCREEN_GUARDIAN_DATA_DIR` to override the data folder.

Copy `.env.example` to `.env` if you want local development defaults for the data directory, screenshot intervals, or SMTP settings.

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

The installer is created in `dist/` as a `.exe` file. The installer requests administrator rights because the app is intended to manage a Windows service.

## Windows Service

Open an elevated Administrator terminal before installing or uninstalling the service.

```bash
npm run install-service
npm run uninstall-service
```

The installed service name is `ScreenGuardianService`. Windows Service Control Manager permissions prevent standard users from stopping or uninstalling the service when installed by an administrator.

## Email Settings

Email reporting is disabled by default. Configure SMTP settings in the dashboard and enable the email upload toggle. Screenshots remain stored locally even when offline or when email sending fails.

Set an admin password in the dashboard before using the tray Exit action.
