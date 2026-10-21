"""SQLite fixture ownership shared by the Cocos browser suites. No DB mutation."""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


def assert_launch_fixture(database, build, port, api_port, ready_file):
    """Validate the controller's new DB before migrations or ready-file creation."""
    config_file = Path(os.environ['REALQUEST_COCOS_TEST_CONFIG'])
    config = json.loads(config_file.read_text())
    directory = Path(config['directory'])
    run = Path(config['runDirectory'])
    owner = json.loads((run / 'run.json').read_text())
    assert run.resolve() == run and run.is_relative_to(ROOT / 'output/cocos-regression')
    assert directory == run / 'suites' / config['suite'] and directory.resolve() == directory
    assert config_file == directory / 'config.json' and config_file.resolve() == config_file
    assert owner['runId'] == config['runId'] == os.environ.get('REALQUEST_TEST_RUN_ID')
    assert owner['nonce'] == config['nonce']
    assert owner['controllerPID'] == config['controllerPID'] == os.getppid()
    assert database == directory / 'test.db' and str(database) == config['database']
    assert ready_file == directory / 'ready.json'
    assert str(build) == config['build']['directory']
    assert config['baseURL'] == f'http://127.0.0.1:{port}'
    assert config['apiURL'] == f'http://127.0.0.1:{api_port}'


def assert_fixture(database, legacy_paths=()):
    target = Path(database).resolve(strict=True)
    assert target.name == 'test.db' and target.is_relative_to(ROOT / 'output'), 'Fixture DB must be an isolated output test.db'
    configured = os.environ.get('REALQUEST_COCOS_TEST_CONFIG')
    if not configured:
        allowed = [(ROOT / name.lstrip('/')).resolve() for name in legacy_paths]
        assert target in allowed and Path(database).absolute() == target, 'Use the documented legacy test DB or unified test runner'
        return
    config_file = Path(configured)
    config = json.loads(config_file.read_text())
    directory = Path(config['directory'])
    run = Path(config['runDirectory'])
    owner = json.loads((run / 'run.json').read_text())
    ready = json.loads((directory / 'ready.json').read_text())
    assert run.resolve() == run and run.is_relative_to(ROOT / 'output/cocos-regression')
    assert directory == run / 'suites' / config['suite'] and config_file == directory / 'config.json'
    assert owner['runId'] == config['runId'] == ready['run_id'] and owner['nonce'] == config['nonce']
    assert owner['controllerPID'] == config['controllerPID'] == ready['parent_pid']
    assert config['database'] == str(target) == ready['database'] and target == directory / 'test.db'
    assert directory.resolve() == directory and config_file.resolve() == config_file
