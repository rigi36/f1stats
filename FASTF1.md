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
