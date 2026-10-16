"""Explicit, isolated QA server for advancing NPC time without touching saves.

REALQUEST_NPC_QA=1 and the exact output/npc-life/test.db are required. Never use
this wrapper for normal play/deployment; production runs app.main:app directly.
Only filesystem-owned tests change clock-offset.txt, not browser input.
"""
import os
import sys
import time
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
EXPECTED = ROOT/'output/npc-life/test.db'
assert os.environ.get('REALQUEST_NPC_QA') == '1', 'Explicit NPC QA flag required'
assert os.environ.get('DATABASE_URL') == 'sqlite:///'+str(EXPECTED), 'Isolated fixture DB required'
sys.path.insert(0,str(ROOT/'backend'))
import app.main as main
real_time=time.time
clock=EXPECTED.with_name('clock-offset.txt')
def now():
    try: offset=float(clock.read_text())
    except (OSError,ValueError): offset=0
    return real_time()+offset
main.time.time=now
app=main.app
@app.get('/api/npc-fixture')
def fixture_identity():
    return {'fixture':'npc-life-v1','database':str(EXPECTED)}
