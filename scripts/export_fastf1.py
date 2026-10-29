"""Export actual FastF1 timing data as static, source-labelled JSON for Pages."""
import argparse
import json
import math
from pathlib import Path
from datetime import datetime, timezone
import fastf1
import pandas as pd


def number(value):
    try:
        n = float(value)
        return n if math.isfinite(n) else None
    except (ValueError, TypeError):
        return None


def integer(value):
    n = number(value)
    return int(n) if n is not None else None


def seconds(value):
    return None if pd.isna(value) else value.total_seconds()


def timestamp(value):
    if pd.isna(value):
        return None
    t = pd.Timestamp(value)
    return (t.tz_localize('UTC') if t.tzinfo is None else t.tz_convert('UTC')).isoformat()


def convert(session, year, round_number, kind):
    key = f'ff1-{year}-{round_number}-{kind}'
    laps, stints, pits, drivers, results = [], [], [], [], []
    frame = session.laps.sort_values(['DriverNumber', 'LapNumber'])
    for _, r in session.results.iterrows():
        n = integer(r.get('DriverNumber'))
        if n is None:
            continue
        drivers.append(dict(driver_number=n, name_acronym=str(r.get('Abbreviation') or n), team_name=str(r.get('TeamName') or ''), team_colour=str(r.get('TeamColor') or '')))
        results.append(dict(driver_number=n, position=number(r.get('Position')), number_of_laps=number(r.get('Laps'))))
    for (dn, stint), group in frame.dropna(subset=['Stint', 'LapNumber']).groupby(['DriverNumber', 'Stint'], sort=False):
        first = group.iloc[0]
        age = number(first.get('TyreLife'))
        age = max(0, age - 1) if age is not None else None
        fresh = first.get('FreshTyre')
        if pd.notna(fresh) and bool(fresh):
            age = 0
        elif pd.notna(fresh) and not bool(fresh) and age == 0:
            age = None  # inconsistent age is unknown, not a new set
        stints.append(dict(driver_number=int(dn), stint_number=int(stint), lap_start=int(group.LapNumber.min()), lap_end=int(group.LapNumber.max()), compound=str(first.Compound), tyre_age_at_start=age))
    for _, row in frame.iterrows():
        n, lap_number = integer(row.DriverNumber), integer(row.LapNumber)
        if n is None or lap_number is None:
            continue
        duration = seconds(row.LapTime)
        reasons = []
        if duration is None or duration <= 0:
            reasons.append('NO TIME')
        if lap_number == 1:
            reasons.append('START')
        if pd.notna(row.PitInTime):
            reasons.append('PIT')
            pits.append(dict(driver_number=n, lap_number=lap_number, date=timestamp(session.t0_date + row.PitInTime)))
        if pd.notna(row.PitOutTime):
            reasons.append('OUT')
        track = str(row.TrackStatus)
        if '4' in track:
            reasons.append('SC')
        if '5' in track:
            reasons.append('RED')
        if '6' in track or '7' in track:
            reasons.append('VSC')
        stint = next((s for s in stints if s['driver_number'] == n and s['stint_number'] == integer(row.Stint)), None)
        start_age = stint['tyre_age_at_start'] if stint else None
        age = number(row.TyreLife)
        laps.append(dict(driver_number=n, lap_number=lap_number, lap_duration=duration,
            date_start=timestamp(row.LapStartDate), is_pit_out_lap=pd.notna(row.PitOutTime),
            duration_sector_1=seconds(row.Sector1Time), duration_sector_2=seconds(row.Sector2Time), duration_sector_3=seconds(row.Sector3Time),
            stint_number=integer(row.Stint) or 0, compound=str(row.Compound),
            tyre_age=max(0, age-1) if age is not None else None, tyre_age_at_start=start_age,
            tyre_fresh=None if start_age is None else start_age == 0, reasons=reasons))
    if not laps or not any(l['lap_duration'] for l in laps):
        raise RuntimeError('FastF1 returned no usable timed laps')
    return dict(format='f1stats-fastf1-v1', source='fastf1', library_version=fastf1.__version__, generated_at=datetime.now(timezone.utc).isoformat(),
        session=dict(session_key=key, year=year, round_number=round_number, country_name=str(session.event.Country), location=str(session.event.Location), session_name='Sprint' if kind == 'S' else 'Race', date_start=timestamp(session.date)),
        drivers=drivers, laps=laps, stints=stints, pits=pits, results=results)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--year', type=int, default=datetime.now(timezone.utc).year)
    parser.add_argument('--round', default='latest')
    parser.add_argument('--session', choices=['R', 'S'], default='R')
    parser.add_argument('--output', default='data/fastf1')
    args = parser.parse_args()
    schedule = fastf1.get_event_schedule(args.year, include_testing=False)
    if args.round == 'latest':
        now = pd.Timestamp.now(tz='UTC').tz_localize(None)
        completed = schedule[schedule.Session5DateUtc < now - pd.Timedelta(hours=4)]
        if completed.empty:
            raise RuntimeError('No completed race found')
        round_number = int(completed.iloc[-1].RoundNumber)
    else:
        round_number = int(args.round)
    session = fastf1.get_session(args.year, round_number, args.session)
    session.load(telemetry=False, weather=False, messages=False)
    payload = convert(session, args.year, round_number, args.session)
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    filename = f'{args.year}-{round_number}-{args.session}.json'
    # Write JSON only after full successful loading and conversion; reject NaN.
    text = json.dumps(payload, ensure_ascii=False, allow_nan=False, separators=(',', ':'))
    (out / filename).write_text(text, encoding='utf8')
    index_path = out / f'index-{args.year}.json'
    entries = json.loads(index_path.read_text(encoding='utf8')) if index_path.exists() else []
    entries = [e for e in entries if e['session_key'] != payload['session']['session_key']]
    entries.append(dict(**payload['session'], file=filename, generated_at=payload['generated_at']))
    entries.sort(key=lambda e: (e['round_number'], e['session_name'] == 'Race'))
    index_path.write_text(json.dumps(entries, ensure_ascii=False, allow_nan=False), encoding='utf8')
    print(f'Exported {len(payload["laps"])} laps to {out / filename}')

if __name__ == '__main__':
    main()
