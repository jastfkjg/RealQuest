"""Cocos guest transport keeps Web saves and authoritative commands intact."""
from sqlalchemy import select, func
from test_game import client, cmd
from app.db import Session
from app.models import Player


def test_client_session_does_not_replace_web_cookie(client):
    web_id = client.get('/api/state').json()['save_id']
    response = client.post('/api/client-session')
    assert response.status_code == 200
    assert 'set-cookie' not in response.headers
    guest = response.json()
    auth = {'Authorization': 'Bearer ' + guest['session_token']}
    assert guest['save_id'] != web_id
    created = client.post('/api/command', headers=auth, json={
        'request_id': 'cocos-create-0001', 'action': 'create',
        'data': {'name': '跨端旅人', 'appearance': 0}, 'save_id': guest['save_id'],
    })
    assert created.status_code == 200
    assert client.get('/api/state').json()['state']['character'] is None
    again = client.post('/api/client-session', headers=auth).json()
    assert again['save_id'] == guest['save_id']
    assert again['state']['character']['name'] == '跨端旅人'
    assert 'session_token' not in again
    client.cookies.clear()
    assert client.get('/api/state', headers=auth).json()['save_id'] == guest['save_id']
    replay = client.post('/api/command', headers=auth, json={
        'request_id': 'cocos-create-0001', 'action': 'create',
        'data': {'name': '跨端旅人', 'appearance': 0}, 'save_id': guest['save_id'],
    })
    assert replay.status_code == 200 and replay.json()['replayed'] is True


def test_invalid_explicit_client_auth_never_falls_back_or_creates_guest(client):
    cmd(client, 'create', {'name': '网页旅人'})
    with Session() as db:
        before = db.scalar(select(func.count()).select_from(Player))
    for token in ['invalid', 'Bearer wrong', 'Bearer ' + 'x' * 43]:
        auth = {'Authorization': token}
        assert client.get('/api/state', headers=auth).status_code == 401
        assert client.post('/api/client-session', headers=auth).status_code == 401
    assert client.get('/api/state').json()['state']['character']['name'] == '网页旅人'
    with Session() as db:
        assert db.scalar(select(func.count()).select_from(Player)) == before


def test_client_auth_preserves_origin_and_save_identity_guards(client):
    guest = client.post('/api/client-session').json()
    auth = {'Authorization': 'Bearer ' + guest['session_token']}
    assert client.post('/api/client-session', headers={**auth, 'Origin': 'https://unexpected.invalid'}).status_code == 403
    rejected = client.post('/api/command', headers=auth, json={
        'request_id': 'cocos-wrong-save', 'action': 'create',
        'data': {'name': '不能串档'}, 'save_id': '00000000-0000-0000-0000-000000000000',
    })
    assert rejected.status_code == 409
    assert client.get('/api/state', headers=auth).json()['state']['character'] is None


def test_web_recovery_opens_same_authoritative_save_in_client_and_back(client):
    import copy
    import uuid
    from app.models import Receipt
    cmd(client, 'create', {'name': '旧版旅人', 'appearance': 4})
    web = client.get('/api/state').json()
    # A historical save may be indoors with ongoing real-life activity.
    with Session.begin() as db:
        player = db.get(Player, web['save_id'])
        value = copy.deepcopy(player.state)
        value['location'] = 'home'
        value['position'] = {'x': 360, 'y': 192}
        value['inventory']['wood'] = 6
        value['timer'] = {'id': str(uuid.uuid4()), 'topic': '原版计时', 'elapsed': 10, 'started_at': 0, 'running': False}
        player.state = value
    file = client.post('/api/recovery-file').json()
    assert file['format'] == 'realquest-recovery' and file['version'] == 1
    preview = client.post('/api/recovery-preview', json={'recovery_key': file['recovery_key']}).json()
    assert preview['save_id'] == web['save_id'] and preview['timer']['topic'] == '原版计时'
    response = client.post('/api/client-recover', json={'recovery_key': file['recovery_key']})
    assert response.status_code == 200 and 'set-cookie' not in response.headers
    restored = response.json()
    assert restored['save_id'] == web['save_id']
    assert restored['state']['character']['appearance'] == 4
    assert restored['state']['location'] == 'home'
    assert restored['world']['interiors']['home']['width'] == 480
    auth = {'Authorization': 'Bearer ' + restored['session_token']}
    body = {'request_id': 'compatible-store-once', 'action': 'store', 'data': {'target': 'home_chest', 'item': 'wood', 'amount': 3}, 'save_id': web['save_id']}
    assert client.post('/api/command', headers=auth, json=body).status_code == 200
    assert client.post('/api/command', headers=auth, json=body).json()['replayed'] is True
    old_view = client.get('/api/state').json()
    assert old_view['state']['inventory']['wood'] == 3
    assert old_view['state']['storage']['wood'] == 3
    assert old_view['state']['timer'] == restored['state']['timer']
    # The inverse direction uses the exact same recovery file format and cookie endpoint.
    new_file = client.post('/api/recovery-file', headers=auth).json()
    client.cookies.clear()
    assert client.post('/api/recover', json={'recovery_key': new_file['recovery_key']}).status_code == 200
    assert client.get('/api/state').json()['save_id'] == web['save_id']
    with Session() as db:
        assert db.scalar(select(func.count()).select_from(Receipt).where(Receipt.request_id == 'compatible-store-once')) == 1
        assert db.scalar(select(func.count()).select_from(Player)) == 1


def test_client_recovery_rejects_fake_save_and_wrong_origin(client):
    cmd(client, 'create', {'name': '安全旅人'})
    before = client.get('/api/state').json()
    assert client.post('/api/client-recover', json={'recovery_key': 'x' * 43}).status_code == 404
    assert client.post('/api/client-recover', json={'recovery_key': 'x' * 43, 'state': {'gold': 9999}}).status_code == 422
    file = client.post('/api/recovery-file').json()
    assert client.post('/api/client-recover', headers={'Origin': 'https://unexpected.invalid'}, json={'recovery_key': file['recovery_key']}).status_code == 403
    assert client.get('/api/state').json()['save_id'] == before['save_id']
