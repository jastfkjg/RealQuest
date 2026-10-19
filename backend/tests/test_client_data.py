"""Explicit cookie continuity and isolated, repeatable client data deletion."""
from sqlalchemy import select, func
from test_game import client, cmd
from app.db import Session
from app.models import Player, Receipt, RecoveryKey, GuestSession, ClientDeletion


def test_cookie_continuation_requires_existing_selected_journey(client):
    empty = client.get('/api/state').json()
    assert client.post('/api/client-from-web', json={'save_id': empty['save_id']}).status_code == 422
    cmd(client, 'create', {'name': '原网页旅人', 'appearance': 5})
    original = client.get('/api/state').json()
    assert client.post('/api/client-from-web', json={'save_id': '0' * 36}).status_code == 409
    assert client.post('/api/client-from-web', json={'save_id': original['save_id']}, headers={'Origin': 'https://wrong.invalid'}).status_code == 403
    response = client.post('/api/client-from-web', json={'save_id': original['save_id']})
    assert response.status_code == 200 and 'set-cookie' not in response.headers
    result = response.json()
    auth = {'Authorization': 'Bearer ' + result['session_token']}
    assert result['save_id'] == original['save_id']
    assert result['state']['character'] == original['state']['character']
    assert client.get('/api/state', headers=auth).json()['save_id'] == original['save_id']
    assert client.post('/api/client-from-web', json={'save_id': original['save_id']}, headers=auth).status_code == 400
    client.cookies.clear()
    assert client.post('/api/client-from-web', json={'save_id': original['save_id']}).status_code == 401
    with Session() as db:
        assert db.scalar(select(func.count()).select_from(Player)) == 1


def test_bearer_export_and_deletion_preserve_other_cookie_journey(client):
    cmd(client, 'create', {'name': '保留的网页旅人'})
    web = client.get('/api/state').json()
    guest = client.post('/api/client-session').json()
    auth = {'Authorization': 'Bearer ' + guest['session_token']}
    body = {'action': 'create', 'request_id': 'data-create-once', 'save_id': guest['save_id'], 'data': {'name': '待删除旅人', 'appearance': 3}}
    assert client.post('/api/command', json=body, headers=auth).status_code == 200
    credential = client.post('/api/recovery-file', headers=auth).json()
    second = client.post('/api/client-recover', json={'recovery_key': credential['recovery_key']}).json()
    second_auth = {'Authorization': 'Bearer ' + second['session_token']}
    exported = client.get('/api/export', headers=auth).json()
    assert exported['state']['character']['name'] == '待删除旅人'
    assert len(exported['ledger']) == 1
    request = {'save_id': guest['save_id'], 'request_id': 'delete-data-once'}
    assert client.post('/api/client-delete', json=request).status_code == 401
    assert client.post('/api/client-delete', json={**request, 'save_id': web['save_id']}, headers=auth).status_code == 409
    assert client.post('/api/client-delete', json=request, headers={**auth, 'Origin': 'https://wrong.invalid'}).status_code == 403
    deleted = client.post('/api/client-delete', json=request, headers=auth)
    assert deleted.json() == {'deleted': True, 'save_id': guest['save_id']}
    assert 'set-cookie' not in deleted.headers
    assert client.post('/api/client-delete', json=request, headers=auth).json() == deleted.json()
    assert client.post('/api/client-delete', json={**request, 'save_id': web['save_id']}, headers=auth).status_code == 409
    assert client.post('/api/client-delete', json={**request, 'request_id': 'another-request'}, headers=auth).status_code == 401
    assert client.get('/api/state', headers=auth).status_code == 401
    assert client.get('/api/export', headers=second_auth).status_code == 401
    assert client.post('/api/client-recover', json={'recovery_key': credential['recovery_key']}).status_code == 404
    assert client.get('/api/state').json()['save_id'] == web['save_id']
    with Session() as db:
        assert db.get(Player, guest['save_id']) is None
        for model in [Receipt, RecoveryKey, GuestSession]:
            assert db.scalar(select(func.count()).select_from(model).where(model.player_id == guest['save_id'])) == 0
        receipts = db.scalars(select(ClientDeletion)).all()
        assert len(receipts) == 1 and receipts[0].token_hash != guest['session_token']


def test_delete_continued_cookie_save_revokes_cookie_and_all_credentials(client):
    cmd(client, 'create', {'name': '同一旅程'})
    original = client.get('/api/state').json()
    credential = client.post('/api/recovery-file').json()
    linked = client.post('/api/client-from-web', json={'save_id': original['save_id']}).json()
    auth = {'Authorization': 'Bearer ' + linked['session_token']}
    assert client.post('/api/client-delete', headers=auth, json={'save_id': original['save_id'], 'request_id': 'same-save-delete'}).status_code == 200
    assert client.get('/api/state').status_code == 401
    assert client.post('/api/recovery-preview', json={'recovery_key': credential['recovery_key']}).status_code == 404
