# FastF1

FastF1 3.9 requires an active F1 TV subscription for most timing data.

1. Repository **Settings → Secrets and variables → Actions**: add repository secrets `F1_USERNAME` and `F1_PASSWORD`. Never put credentials in source files or exported JSON.
2. **Actions → Update FastF1 → Run workflow**: choose year, round number (or `latest`), and `R` / `S`.
3. Successful exports are committed to `data/fastf1` and published to Pages. Failed runs preserve previous exports.
4. Select **FastF1** on the site. Only exported races appear. Repeat the workflow for other races.

Selections and exclusion reasons are separate per source and session. Existing OpenF1 saves and imports are retained. PNGs name their source; no silent fallback.

Local export after installing `scripts/fastf1-requirements.txt` and authenticating with FastF1:

```sh
python scripts/export_fastf1.py --year 2026 --round 18 --session R
```

The export contains lap times, sector times, tyre stints and ages, pit entries, track status and classification. No telemetry download is required. SC/VSC/RED exclusions use FastF1's lap TrackStatus. The site keeps the same arithmetic mean and manual inclusion rules for both sources. Neither source receives corrections from the other.

Authentication reference: https://github.com/theOehrly/Fast-F1/blob/main/docs/api_reference/accounts_auth.rst


## Local download (Windows)

Download the repository ZIP and extract it. Install Python 3.12+ if necessary. Run `START_FASTF1.cmd`; it creates a local virtual environment, installs FastF1 and launches `scripts/local_fastf1.py`. The script asks for F1 TV credentials locally (password hidden), then season, round and R/S. Austin 2026 is round 18, R.

Successful exports appear in `exports/`. Import the race JSON (e.g. `2026-18-R.json`, not the index) with **Импорт FastF1 JSON** on the website. It stays in the browser's IndexedDB. No upload to GitHub or the site's server occurs. Keep the JSON as a backup.

Credentials are not included in exports. FastF1 may retain its authentication token in its standard local account storage. The timing cache, exports and virtual environment are ignored by Git. The local download is not guaranteed to work if F1 refuses the computer too.
