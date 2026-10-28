"""Integer silver ledger. Preserve the historical `gold` ID and all saved amounts."""
import json
from pathlib import Path
SILVER_PER_GOLD = 100
VERSION = 1
PREVIOUS_QUESTS = {q['id']: q for q in json.loads(Path(__file__).with_name('quest_contracts_v2.json').read_text())}

def money(silver):
    gold, rest = divmod(int(silver), SILVER_PER_GOLD)
    return (f'{gold:,}金' + (f' {rest}银' if rest else '')) if gold else f'{rest}银'

def ensure_economy(state):
    if 'economy_version' in state:
        return
    # Already accepted contracts keep their rewards; never multiply a balance,
    # reset possessions, or issue catch-up rewards when reading an old journey.
    for key, contract in state.get('quests', {}).items():
        if key in PREVIOUS_QUESTS and contract.get('definition_version') != 1:
            contract.setdefault('definition_version', 2)
    state['economy_version'] = VERSION

def upgrade_costs(level):
    return {'wood': level * 6, 'stone': level * 3, 'gold': [0,30,120][level]}
