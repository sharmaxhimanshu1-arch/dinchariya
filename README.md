# Dinchariya

Habits, schedule, tasks, goals, journal and more, in one place. A Windows desktop app built with Electron.

## Download

Get the ready-to-run app from the [Releases](../../releases) page. Unzip it anywhere (for example `C:\Apps\Dinchariya`) and open `Dinchariya.exe`. Press F1 inside the app for the guide.

Your data lives in `%APPDATA%\Dinchariya`, separate from the app folder, so upgrading never touches it.

## Run from source

```
npm install
npm start          # run the app
npm run dist       # build the Windows installer and portable exe
```

## Layout

```
main.js            Electron main process: window, tray, auto-start, data storage
preload.js         safe bridge between the main process and the page
renderer/          the app UI (index.html, styles.css, app.js, core.js, views-*.js)
assets/            app icons
```
