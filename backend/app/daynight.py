"""One server-owned world clock. Reality deadlines never use this clock."""
DAY_SECONDS = 1800
START_MINUTE = 360
CLOCK_LEASE_SECONDS = 10
FAINT_DAMAGE = 10
SHORT_REST_MINUTES = 30


def ensure_clock(state, now):
    clock = state.get('world_clock')
    if clock is None:
        state['world_clock'] = {'version': 2, 'start_minute': START_MINUTE,
            'elapsed': 0, 'updated_at': now, 'running_until': 0,
            'day_seconds': DAY_SECONDS, 'last_night': None}
    elif clock.get('version') != 2:
        # Preserve the previous resident clock's committed day/time. Never settle
        # an old live lease or punish a player for upgrading while offline.
        total = 510 + clock.get('elapsed', 0) * 1440 / clock.get('day_seconds', DAY_SECONDS)
        day, minute = max(1, int(total // 1440) + 1), total % 1440
        if minute < 60:
            day = max(1, day - 1)
            minute += 1440
        elif minute < START_MINUTE:
            minute = START_MINUTE
        clock.update(version=2, start_minute=START_MINUTE,
            elapsed=((day - 1) * 1440 + minute - START_MINUTE) * DAY_SECONDS / 1440,
            updated_at=now, running_until=0, day_seconds=DAY_SECONDS, last_night=None)


def clock_elapsed(state, now):
    clock = state.get('world_clock', {})
    # A missed heartbeat is unconfirmed offline time, not ten extra seconds of
    # play. Discard its tail instead of fainting someone on their next visit.
    active = clock.get('updated_at', now) <= now <= clock.get('running_until', 0)
    return clock.get('elapsed', 0) + (now - clock['updated_at'] if active else 0)


def clock_view(state, now):
    clock = state.get('world_clock', {})
    total = clock.get('start_minute', 510) + clock_elapsed(state, now) * 1440 / clock.get('day_seconds', DAY_SECONDS)
    if clock.get('version') == 2:
        day = int((clock['start_minute'] + clock.get('elapsed', 0) * 1440 / DAY_SECONDS - START_MINUTE) // 1440) + 1
        # Show 01:00 while awaiting the authoritative morning transition.
        total = min(total, (day - 1) * 1440 + 1500)
    else:
        day = int(total // 1440) + 1
    return {'day': day, 'minute': total % 1440, 'day_seconds': clock.get('day_seconds', DAY_SECONDS)}


def night_due(state, now):
    clock = state['world_clock']
    total = START_MINUTE + clock_elapsed(state, now) * 1440 / DAY_SECONDS
    day = int(clock.get('elapsed', 0) / DAY_SECONDS) + 1
    return total >= (day - 1) * 1440 + 1500 - 1e-7


def finish_day(state, now, kind, destination='home'):
    clock = state['world_clock']
    day = int(clock['elapsed'] / DAY_SECONDS) + 1
    before_hp, before_stamina = state['vitality']['current'], state['stamina']['current']
    if kind == 'faint':
        state['vitality']['current'] -= min(FAINT_DAMAGE, max(0, before_hp - 1))
    else:
        state['stamina']['current'] = state['stamina']['max']
        state['vitality']['current'] = min(state['vitality']['max'], before_hp + 20)
    clock.update(elapsed=day * DAY_SECONDS, updated_at=now, running_until=0)
    clock['last_night'] = {'day': day, 'kind': kind, 'health_delta': state['vitality']['current'] - before_hp,
        'stamina_delta': state['stamina']['current'] - before_stamina, 'at': now}
    state['stamina']['updated_at'] = now
    state['location'], state['position'] = (destination if kind == 'sleep' else 'home'), {'x': 288, 'y': 152}
    state['npc_encounter'] = None
    state['last_rest'] = now
    from .construction import settle_construction
    settle_construction(state, now)
    from .ranching import settle_ranch
    settle_ranch(state, now)
    if kind == 'sleep':
        if destination == 'home' and 'rested_home' not in state['events']:
            state['events'].append('rested_home')
        return f'睡到第 {day + 1} 天 06:00，体力已补满，生命恢复 {state["vitality"]["current"] - before_hp} 点。'
    return f'凌晨 01:00 体力不支，被送回家中。生命 −{before_hp - state["vitality"]["current"]}，体力未恢复；现在是第 {day + 1} 天 06:00。'


def settle_clock(state, now, running=None):
    ensure_clock(state, now)
    clock = state['world_clock']
    due = night_due(state, now)
    elapsed = clock_elapsed(state, now)
    # finish_day must use the ending day's committed timestamp, not a value
    # beyond midnight that might accidentally count another day.
    if due:
        message = finish_day(state, now, 'faint')
    else:
        clock.update(elapsed=elapsed, updated_at=max(now, clock['updated_at']))
        message = None
    if running is not None:
        clock['running_until'] = now + CLOCK_LEASE_SECONDS if running else 0
    return message


def sleep_rules():
    return {'wake_minute': START_MINUTE, 'deadline_minute': 60, 'faint_damage': FAINT_DAMAGE,
            'sleep_health': 20, 'short_rest_minutes': SHORT_REST_MINUTES,
            'short_rest_stamina': 20, 'short_rest_health': 10}
