"""Interactive local exporter. Credentials stay on this computer / Formula 1."""
import getpass
import os
from pathlib import Path
import sys
from datetime import datetime
import fastf1
from export_fastf1 import main


def run():
    print('F1 STATS / FastF1 - local download')
    print('Your F1 TV login is sent to Formula 1, not to the website or GitHub.')
    print('Input is local. The password is hidden while you type.')
    if not os.environ.get('F1_USERNAME'):
        os.environ['F1_USERNAME'] = input('F1 TV email: ').strip()
    if not os.environ.get('F1_PASSWORD'):
        os.environ['F1_PASSWORD'] = getpass.getpass('F1 TV password: ')
    year = input(f'Season [{datetime.now().year}]: ').strip() or str(datetime.now().year)
    round_number = input('Round number [18 = Austin 2026; Enter = latest]: ').strip() or 'latest'
    kind = input('Race or sprint [R/S, Enter = R]: ').strip().upper() or 'R'
    if not year.isdigit() or not 2018 <= int(year) <= datetime.now().year:
        raise ValueError('Invalid season.')
    if round_number != 'latest' and (not round_number.isdigit() or not 1 <= int(round_number) <= 30):
        raise ValueError('Invalid round number.')
    if kind not in ('R', 'S'):
        raise ValueError('Use R or S.')
    # Separate, local cache; no cache, account token or credential is exported.
    root = Path(__file__).resolve().parents[1]
    cache = root / '.fastf1-cache'
    cache.mkdir(exist_ok=True)
    fastf1.Cache.enable_cache(str(cache))
    sys.argv = [sys.argv[0], '--year', year, '--round', round_number, '--session', kind, '--output', str(root / 'exports')]
    try:
        main()
    finally:
        os.environ.pop('F1_USERNAME', None)
        os.environ.pop('F1_PASSWORD', None)
    print('\nDone. Open https://rigi36.github.io/f1stats/')
    print('Click Import FastF1 JSON and select the race JSON in:')
    print(root / 'exports')
    print('Choose YEAR-ROUND-R.json, not index-YEAR.json.')
    if os.name == 'nt':
        os.startfile(root / 'exports')

if __name__ == '__main__':
    try:
        run()
    except KeyboardInterrupt:
        print('\nCancelled.')
        sys.exit(1)
    except Exception as exc:
        # No credential or token values are printed.
        print('\nDownload failed. No race file was imported.')
        print(type(exc).__name__)
        print('Check the messages above. If F1 responds with HTTP 403, it refused access from this computer too.')
        sys.exit(1)
