# IAE Research Log Studio

Double-click `start-research-log.cmd`. The studio opens in your browser and stores its output in:

`Desktop/IAE Research Log`

That folder contains:

- `research-log/manifest.json`
- One JSON file per experiment
- `assets/` for uploaded experiment images

## Publish Safely

Use **Build website bundle** in the Studio. It creates:

- `website-upload/` with a synchronized public-only `research-log` and `assets` folder
- `iae-website-upload.zip` as a matching backup

Upload the contents of `website-upload` to the website repository. Do not publish files directly from the working archive because it may contain private entries.

Keep the command window open while using the studio. Closing it stops the local app but does not affect saved entries.
