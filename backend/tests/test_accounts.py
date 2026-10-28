"""Optional accounts preserve guest saves and enforce identity on the server."""
import copy
import hashlib
import time
from concurrent.futures import ThreadPoolExecutor
from sqlalchemy import select, func
from test_game import client, cmd
from app.db import Session
from app.models import Account, AccountSession, Player, Receipt

PASSWORD = 'a long woodland passphrase'


def guest(client, name='账号测试旅人'):
    data = client.post('/api/client-session').json()
    headers = {'Authorization': 'Bearer ' + data['session_token']}
    assert client.post('/api/command', headers=headers, json={
        'action': 'create', 'data': {'name': name}, 'request_id': 'account-test-create',
        'save_id': data['save_id']}).status_code == 200
    return data, headers


def register(client, data=None, headers=None, username='woodland', password=PASSWORD):
    return client.post('/api/account/register', headers=headers or {}, json={
        'username': username, 'password': password,
        **({'save_id': data['save_id']} if data else {})})


def auth(reply):
    return {'Authorization': 'Bearer ' + reply.json()['session_token']}


def test_binding_preserves_save_history_and_revokes_guest_credentials(client):
    data, headers = guest(client)
    recovery = client.post('/api/recovery-file', headers=headers).json()
    before = client.get('/api/export', headers=headers).json()
    result = register(client, data, headers, username=' WoodLand ')
    assert result.status_code == 200
    assert result.json()['save_id'] == data['save_id']
    assert result.json()['account'] == {'username': 'woodland'}
    assert client.get('/api/export', headers=auth(result)).json() == before
    assert client.get('/api/state', headers=headers).status_code == 401
    assert client.post('/api/client-recover', json={'recovery_key': recovery['recovery_key']}).status_code == 404
    assert client.post('/api/recovery-file', headers=auth(result)).status_code == 403
    assert client.get('/api/state', headers=auth(result)).json()['account']['username'] == 'woodland'
    with Session() as db:
        account = db.scalar(select(Account))
        assert account.password_hash.startswith('scrypt$131072$8$1$')
        assert PASSWORD not in account.password_hash
        assert db.scalar(select(func.count()).select_from(Receipt)) == len(before['ledger'])
    assert PASSWORD not in str(before)


def test_guest_flow_and_new_account_without_playing(client):
    data, headers = guest(client)
    result = register(client)
    assert result.status_code == 200 and result.json()['state']['character'] is None
    assert result.json()['save_id'] != data['save_id']
    assert client.get('/api/state', headers=headers).status_code == 200
    assert client.post('/api/client-session').json()['account'] is None


def test_case_insensitive_duplicate_rolls_back_without_touching_guest(client):
    first = register(client)
    data, headers = guest(client)
    before = client.get('/api/export', headers=headers).json()
    assert register(client, data, headers, username='WOODLAND').status_code == 409
    assert client.get('/api/export', headers=headers).json() == before
    assert client.get('/api/state', headers=auth(first)).status_code == 200


def test_login_logout_and_second_device_share_only_account_save(client):
    data, headers = guest(client)
    first = register(client, data, headers)
    second = client.post('/api/account/login', json={'username': 'WOODLAND', 'password': PASSWORD})
    assert second.status_code == 200 and second.json()['save_id'] == data['save_id']
    assert second.json()['session_token'] != first.json()['session_token']
    assert client.post('/api/account/logout', headers=auth(first)).json() == {'logged_out': True}
    assert client.post('/api/account/logout', headers=auth(first)).status_code == 200
    assert client.get('/api/state', headers=auth(first)).status_code == 401
    assert client.get('/api/state', headers=auth(second)).status_code == 200
    reboot = client.post('/api/client-session', headers=auth(second))
    assert reboot.json()['account']['username'] == 'woodland'
    assert reboot.json()['state']['character']['name'] == '账号测试旅人'


def test_wrong_password_unknown_user_and_cross_save_access(client):
    first = register(client)
    for name, password in [('woodland', 'wrong'), ('unknown', PASSWORD)]:
        response = client.post('/api/account/login', json={'username': name, 'password': password})
        assert response.status_code == 401 and response.json()['detail'] == '用户名或密码不正确'
    data, headers = guest(client)
    before = client.get('/api/export', headers=headers).json()
    response = client.post('/api/command', headers=auth(first), json={
        'request_id': 'cross-save-account', 'save_id': data['save_id'], 'action': 'create', 'data': {'name': '入侵'}})
    assert response.status_code == 409
    assert client.get('/api/export', headers=headers).json() == before
    assert client.post('/api/account/register', headers=headers, json={
        'username': 'another', 'password': PASSWORD, 'save_id': first.json()['save_id']}).status_code == 409


def test_expired_session_does_not_create_or_switch_player(client):
    response = register(client)
    with Session.begin() as db:
        db.scalar(select(AccountSession)).expires_at = time.time() - 1
        count = db.scalar(select(func.count()).select_from(Player))
    assert client.post('/api/client-session', headers=auth(response)).status_code == 401
    with Session() as db:
        assert db.scalar(select(func.count()).select_from(Player)) == count
    assert client.post('/api/account/login', json={'username': 'woodland', 'password': PASSWORD}).json()['save_id'] == response.json()['save_id']


def test_deleted_journey_retains_account_but_no_history_and_revokes_devices(client):
    data, headers = guest(client)
    first = register(client, data, headers)
    second = client.post('/api/account/login', json={'username': 'woodland', 'password': PASSWORD})
    body = {'request_id': 'account-delete-once', 'save_id': data['save_id']}
    assert client.post('/api/client-delete', headers=auth(first), json=body).status_code == 200
    assert client.post('/api/client-delete', headers=auth(first), json=body).status_code == 200
    assert client.get('/api/state', headers=auth(second)).status_code == 401
    with Session() as db:
        assert db.scalar(select(Account)).player_id is None
        assert db.get(Player, data['save_id']) is None
    new = client.post('/api/account/login', json={'username': 'woodland', 'password': PASSWORD})
    assert new.status_code == 200 and new.json()['save_id'] != data['save_id']
    assert new.json()['state']['character'] is None and new.json()['state']['activities'] == []


def test_username_password_validation_and_secret_redaction(client):
    for username in ['ab', 'bad name', '中文名字', 'a' * 25]:
        assert register(client, username=username).status_code == 422
    for password in ['short', 'a' * 129]:
        response = register(client, password=password)
        assert response.status_code == 422 and password not in response.text
    response = client.post('/api/account/login', json={'username': 'woodland', 'password': {'secret': PASSWORD}})
    assert response.status_code == 422 and PASSWORD not in response.text
    good = '中文也可以作为一段容易记住的长密码，并保留空格 '
    response = register(client, password=good)
    assert response.status_code == 200
    assert client.post('/api/account/login', json={'username': 'woodland', 'password': good}).status_code == 200
    assert client.post('/api/account/login', json={'username': 'woodland', 'password': good.strip()}).status_code == 401


def test_login_throttle_persists_and_does_not_mutate_saves(client):
    response = register(client)
    before = client.get('/api/export', headers=auth(response)).json()
    for _ in range(10):
        assert client.post('/api/account/login', json={'username': 'woodland', 'password': 'wrong'}).status_code == 401
    blocked = client.post('/api/account/login', json={'username': 'WOODLAND', 'password': PASSWORD})
    assert blocked.status_code == 429 and blocked.headers['Retry-After'] == '300'
    assert client.get('/api/export', headers=auth(response)).json() == before


def test_concurrent_registration_has_one_owner_and_no_lost_save(client):
    data, headers = guest(client)
    before = client.get('/api/export', headers=headers).json()
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(lambda _: register(client, data, headers), range(2)))
    assert sorted(r.status_code for r in responses) == [200, 401]
    good = next(r for r in responses if r.status_code == 200)
    assert client.get('/api/export', headers=auth(good)).json() == before
    # A lost registration response is recoverable with the just-created password.
    login = client.post('/api/account/login', json={'username': 'woodland', 'password': PASSWORD})
    assert login.json()['save_id'] == data['save_id']


def test_origin_guard_also_protects_account_changes(client):
    response = client.post('/api/account/register', headers={'Origin': 'https://untrusted.example'},
                           json={'username': 'woodland', 'password': PASSWORD})
    assert response.status_code == 403


def test_concurrent_login_delete_never_reactivates_old_journey_tokens(client):
    data, headers = guest(client)
    first = register(client, data, headers)
    with ThreadPoolExecutor(max_workers=2) as pool:
        login = pool.submit(client.post, '/api/account/login', json={'username': 'woodland', 'password': PASSWORD})
        deletion = pool.submit(client.post, '/api/client-delete', headers=auth(first),
                               json={'request_id': 'concurrent-account-delete', 'save_id': data['save_id']})
        logged, deleted = login.result(), deletion.result()
    assert logged.status_code == deleted.status_code == 200
    restarted = client.post('/api/account/login', json={'username': 'woodland', 'password': PASSWORD})
    assert restarted.json()['save_id'] != data['save_id']
    assert client.get('/api/state', headers=auth(first)).status_code == 401
    if logged.json()['save_id'] == data['save_id']:
        assert client.get('/api/state', headers=auth(logged)).status_code == 401
