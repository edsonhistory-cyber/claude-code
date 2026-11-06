"""Score for the TL5 transmission film: a light bed (Gmaj9, 92 bpm) the whole way, a low motor under the engine,
a short hydraulic whine at every shift (the blocker ring matching speeds), a soft thud when the dogs lock, a quiet
click on every button the operator presses.

    python run_sfx.py sims/tractor-shared/score.py

Times from tractor-film/timeline.json (the SCRIPT beats in tractor-shared/film.js) and kin.js (SHIFT_DUR, PH).
"""

import json
import os

from sfx.score_kit import bed, chords, hz, motor, thud
from sfx.synth import click

TIMELINE = "../tractor-film/timeline.json"
OUT = os.path.join(os.environ.get("TEARDOWN_OUT", "teardown-out"), "tractor-score.wav")
TARGET_LUFS = -14.0
SEED = 23

CHORDS = chords("Gmaj9:G2 D3 F#3 A3 B3/G1", "Em9:E2 B2 D3 F#3 G3/E1", "Cmaj7:C3 E3 G3 B3/C2", "D6sus:D3 G3 A3 B3 E4/D2")
MOTIF = [(0.5, hz("B4")), (1.5, hz("D5")), (2.5, hz("A4"))]
SHIFT_DUR = 1.15
SYNC0, DOGS = 0.5, 0.88


def score(mix, tl):
    dur = tl["duration"]
    left, right, low, drums = bed(dur, 92, CHORDS, MOTIF, motif_voice="epiano", kicks=(0, 2.5), snares=(), hats=8, swing=0.0, keys_vel=0.65, keys_lp=3400)
    mix.put_stereo(0, left, right, 0.11)
    mix.put(0, low, 0.11)
    mix.put(0, drums, 0.04)
    for t in tl.get("shifts", []):
        mix.put(t + SYNC0 * SHIFT_DUR, motor(0.3, 260, 1500, 20), 0.018)
        mix.put(t + DOGS * SHIFT_DUR, thud(110, 0.04, 0.3), 0.06)
    for t in tl["beats"]:
        mix.put(t, click(2400, 0.025), 0.05)
