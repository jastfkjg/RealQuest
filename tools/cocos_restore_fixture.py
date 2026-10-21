"""Deterministic data only for a controller-owned backup/recovery rehearsal."""
import argparse
import json
from pathlib import Path
import sqlite3
import sys
import time
import uuid
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'clients/cocos/tools'))
sys.path.insert(0, str(ROOT / 'backend'))
from test_guard import assert_fixture


def prepare(database, save):
    assert_fixture(database)
    from app.rules import upgrade_state
    from app.combat import floor_enemies
    from app.daynight import clock_view
    now = time.time()
    today = datetime.fromtimestamp(now, ZoneInfo('Asia/Shanghai')).date()
    yesterday = str(today - timedelta(days=1))
    ids = {name: str(uuid.uuid4()) for name in ['plan', 'archived_plan', 'book', 'archived_book', 'timer', 'exercise', 'active_life', 'claimed_life', 'cancelled_life', 'old_study', 'old_exercise']}
    with sqlite3.connect(database) as connection:
        row = connection.execute('SELECT state FROM players WHERE id=?', (save,)).fetchone()
        assert row, 'Existing isolated save required'
        state = upgrade_state(json.loads(row[0]))
        assert state['character']
        state.update(location='home', position={'x': 360, 'y': 208}, xp=154,
                     knowledge_points=3, health_points=2, skill_points=1,
                     knowledge_growth={'science': 2, 'magic': 3}, health_invested=8,
                     skill_growth={'planting': 1, 'ranching': 0, 'building': 2},
                     vitality={'current': 117, 'max': 120},
                     stamina={'current': 120, 'max': 120, 'updated_at': now},
                     buildings={'home': 2, 'workshop': 1, 'library': 2},
                     relationships={'lia': 8, 'noah': 6, 'mira': 5},
                     npc_days={'lia': str(today)}, npc_gifts={'mira': yesterday},
                     npc_helped={'noah': yesterday}, npc_encounter=None)
        state['inventory'].update(gold=123, wood=7, stone=4, seed=8, crop=3, plank=2,
                                  glow_staff=1, soup=2, gel=3, shell=1, crystal=2, gate_stone=0)
        state['storage'].update(wood=12, stone=9, seed=3, crop=4, plank=5, soup=1, reinforced_sword=1)
        state['attributes'].update(strength=30, wisdom=44, craft=25, stewardship=35, bond=20)
        state['plots'] = {'plot_0': {'planted_at': now - 1000, 'ready_at': now - 940}}
        state['gathered'] = {'wood_1': now + 30, 'stone_1': now - 1}
        state['stats'].update(wood=21, stone=12, harvest=8, sold=5, crafted=6)
        state['quests'] = {'settle_in': {'status': 'claimed', 'accepted_at': now - 20000, 'claimed_at': now - 10000},
                           'leave_valley': {'status': 'active', 'accepted_at': now - 5000}}
        state['tracked_quest'] = 'leave_valley'
        state['events'] = list(dict.fromkeys(state['events'] + ['visited_home', 'visited_workshop', 'visited_library', 'visited_shop', 'visited_guild', 'visited_crossing', 'visited_mountain', 'visited_city', 'visited_inn']))
        state['world_clock'].update(elapsed=187.5, updated_at=now, running_until=0, owner='')
        state['departure'].update(bridge_repaired=True, rope_ready=True, letter_delivered=True,
                                  booking_day=1, dock_work_day=1, inn_work_day=1, trail_work_day=0)
        state['village_intro'].update(dismissed=False, briefed=True, first_clear=True, returned=True, reviewed=True)
        state['village_combat'].update(gate_open=True, legacy_passage=False, boss_first=True,
                                       boss_reward_day=1, unlocked=5, day=clock_view(state, now)['day'],
                                       equipped='glow_staff', spark_learned=True, floors={})
        for floor in range(1, 6):
            state['location'] = 'cave_' + str(floor)
            for enemy in floor_enemies(state, now):
                enemy.update(hp=0, phase='dead')
        state['location'] = 'home'
        state['study_plans'] = {
            ids['plan']: {'id': ids['plan'], 'title': '恢复演练进行计划', 'daily_minutes': 25, 'created_at': now - 1000, 'archived_at': None},
            ids['archived_plan']: {'id': ids['archived_plan'], 'title': '恢复演练归档计划', 'daily_minutes': 15, 'created_at': now - 2000, 'archived_at': now - 900}}
        def book(key, date, title, archived=None):
            return {'id': ids[key], 'date': date, 'title': title, 'target_minutes': 25,
                    'created_at': now - 500, 'completed_at': None, 'archived_at': archived,
                    'plan_id': ids['plan'] if archived is None else ids['archived_plan'],
                    'timezone': 'Asia/Shanghai', 'knowledge_reward': 0}
        state['study_tasks'] = {ids['book']: book('book', str(today), '备份前仍在运行的原书页'),
                                ids['archived_book']: book('archived_book', yesterday, '旧日归档书页', now - 100)}
        state['timer'] = {'id': ids['timer'], 'topic': '备份前仍在运行的原书页', 'elapsed': 75,
                          'started_at': now - 120, 'running': True, 'study_task_id': ids['book']}
        state['exercise_tasks'] = {ids['exercise']: {'id': ids['exercise'], 'title': '旧锻炼约定',
            'target_minutes': 10, 'date': yesterday, 'timezone': 'Asia/Shanghai', 'created_at': now - 86400, 'completed_at': now - 86000}}
        state['activities'] += [
            {'id': ids['old_study'], 'kind': 'study', 'amount': 12, 'xp': 12, 'date': yesterday,
             'created_at': now - 86400, 'note': '隔离导入历史，未核验', 'source': 'import', 'verified': False,
             'study_task_id': ids['archived_book']},
            {'id': ids['old_exercise'], 'kind': 'exercise', 'amount': 10, 'xp': 10, 'date': yesterday,
             'created_at': now - 86000, 'note': '旧锻炼关联原记录', 'source': 'manual', 'verified': False,
             'exercise_task_id': ids['exercise']}]
        def life(key, kind, status, hours):
            accepted = now - 1800 if status == 'active' else now - 86400
            return {'id': ids[key], 'kind': kind, 'hours': hours, 'date': str(today) if status == 'active' else yesterday,
                    'giver': 'noah', 'accepted_at': accepted, 'ready_at': accepted + hours * 3600,
                    'status': status, 'claimed_at': accepted + hours * 3600 if status == 'claimed' else None,
                    'cancelled_at': accepted + 500 if status == 'cancelled' else None,
                    'reward': hours if status == 'claimed' else 0, 'source': 'npc_elapsed', 'verified': False}
        state['life_tasks'] = {ids[key]: life(key, kind, status, hours) for key, kind, status, hours in
                              [('active_life', 'study', 'active', 2), ('claimed_life', 'work', 'claimed', 1), ('cancelled_life', 'exercise', 'cancelled', 1)]}
        state['revision'] += 1
        connection.execute('UPDATE players SET state=? WHERE id=?', (json.dumps(state, ensure_ascii=False), save))
    return {'ids': ids, 'categories': ['position', 'inventory', 'storage', 'quests', 'village_intro', 'buildings', 'relationships',
             'npc_days', 'npc_gifts', 'npc_helped', 'plots', 'gathered', 'stats', 'events', 'attributes',
             'knowledge_points', 'health_points', 'skill_points', 'knowledge_growth', 'skill_growth', 'health_invested',
             'vitality', 'stamina', 'study_plans', 'study_tasks', 'timer', 'activities', 'exercise_tasks', 'life_tasks', 'village_combat', 'departure'],
            'provenance': 'Synthetic isolated save fixture; not player-earned progression, verified behavior, or balance evidence'}


def legacy_copy(database, destination, control):
    assert_fixture(database)
    source = Path(database).resolve()
    target = Path(destination).resolve(strict=True)
    assert target == source.parent / 'legacy/test.db', 'Only own prepared legacy schema is allowed'
    with sqlite3.connect(source) as current, sqlite3.connect(target) as legacy:
        assert legacy.execute('SELECT version_num FROM alembic_version').fetchall() == [('001',)]
        for table in ['players', 'receipts']:
            assert legacy.execute('SELECT count(*) FROM ' + table).fetchone()[0] == 0
            rows = current.execute('SELECT * FROM ' + table).fetchall()
            columns = [column[1] for column in current.execute('PRAGMA table_info(' + table + ')')]
            legacy.executemany('INSERT INTO ' + table + '(' + ','.join(columns) + ') VALUES(' + ','.join('?' for _ in columns) + ')', rows)
        from app.rules import initial_state
        current_state = json.loads(legacy.execute('SELECT state FROM players WHERE id=?', (control,)).fetchone()[0])
        old_state = initial_state()
        old_state.update(character=current_state['character'], revision=current_state['revision'])
        legacy.execute('UPDATE players SET state=? WHERE id=?', (json.dumps(old_state, ensure_ascii=False), control))
    return {'schema': '001', 'tables': ['players', 'receipts'], 'legacyControl': control,
            'legacyState': old_state, 'legacyFields': list(old_state), 'scope': 'Legacy database schema with copied main progress and a control save predating versioned state; credential tables did not exist in schema001'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=['prepare', 'legacy-copy'])
    parser.add_argument('--database', required=True)
    parser.add_argument('--save')
    parser.add_argument('--destination')
    parser.add_argument('--legacy-control')
    args = parser.parse_args()
    print(json.dumps(prepare(args.database, args.save) if args.operation == 'prepare' else legacy_copy(args.database, args.destination, args.legacy_control), ensure_ascii=False))
