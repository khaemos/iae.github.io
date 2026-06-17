# Research Log Publishing Workflow

This folder contains the public experiment entries shown on the website.

## Publish A New Entry

1. Draft the full private note somewhere else, such as Obsidian, a private GitHub repo, or a local notebook folder.
2. Copy `_template.json`.
3. Rename the copy with the next experiment number, for example:
   `003-resonant-terminal-test.json`
4. Fill in the public-safe summary, objective, apparatus, observations, next test, tags, and measurements.
5. Add the new file name to `manifest.json`.
6. Upload the updated `research-log` folder with the website files.

## Keep Private Notes Private

Do not put private notes in this folder. GitHub Pages publishes everything in the deployed folder.

Use this folder only for public entries.

## Entry File Rules

- Keep `visibility` set to `"public"` for entries you want shown.
- Use ISO dates: `YYYY-MM-DD`.
- Keep file names lowercase with hyphens.
- Do not use trailing commas in JSON.
- If the site does not show a new entry, check that the file name in `manifest.json` exactly matches the uploaded JSON file.
