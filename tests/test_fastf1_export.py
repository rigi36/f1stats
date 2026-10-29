import unittest, importlib.util, json
from types import SimpleNamespace
from pathlib import Path
import pandas as pd
spec=importlib.util.spec_from_file_location('exporter',Path(__file__).parents[1]/'scripts/export_fastf1.py')
e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
class ExportTest(unittest.TestCase):
 def test_flags_age_and_json(self):
  row=dict(DriverNumber='18',LapNumber=16,Stint=2,Compound='SOFT',TyreLife=4,FreshTyre=False,TrackStatus='46',LapTime=pd.Timedelta(seconds=100),PitInTime=pd.NaT,PitOutTime=pd.Timedelta(seconds=1505),LapStartDate=pd.Timestamp('2026-10-25T20:00:00'),Sector1Time=pd.Timedelta(seconds=30),Sector2Time=pd.Timedelta(seconds=40),Sector3Time=pd.Timedelta(seconds=30))
  session=SimpleNamespace(laps=pd.DataFrame([row]),results=pd.DataFrame([dict(DriverNumber='18',Abbreviation='STR',TeamName='Aston Martin',TeamColor='229977',Position=15,Laps=55)]),t0_date=pd.Timestamp('2026-10-25'),date=pd.Timestamp('2026-10-25'),event=SimpleNamespace(Country='United States',Location='Austin'))
  p=e.convert(session,2026,18,'R')
  self.assertEqual(p['source'],'fastf1');self.assertEqual(p['laps'][0]['reasons'],['OUT','SC','VSC']);self.assertEqual(p['laps'][0]['tyre_age'],3);self.assertFalse(p['laps'][0]['tyre_fresh']);self.assertEqual(p['results'][0]['position'],15)
  json.dumps(p,allow_nan=False)
if __name__=='__main__':unittest.main()
