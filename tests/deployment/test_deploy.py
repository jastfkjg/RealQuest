"""Failure boundaries and production settings; never connect to a real host."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('deployment_validate', ROOT / 'deploy/validate.py')
validation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validation)
REVISION = 'a' * 40
PASSWORD = 'c' * 64


def metadata(digest='a'):
    return {'schema': 1, 'repository': 'owner/RealQuest', 'revision': REVISION,
            'build_run_id': '42', 'build_run_attempt': '1',
            'frontend_image': 'registry.example.com/app/frontend@sha256:' + digest * 64,
            'backend_image': 'registry.example.com/app/backend@sha256:' + digest * 64}


def production_config(data=None):
    data = data or metadata()
    environment = {'COOKIE_SECURE': 'true', 'ALLOWED_ORIGINS': 'https://realquest.jastcraft.com',
                   'REALQUEST_RUN_MIGRATIONS': 'false',
                   'DATABASE_URL': 'postgresql+psycopg://realquest:' + PASSWORD + '@db:5432/realquest'}
    common = {'restart': 'unless-stopped', 'networks': {'default': {}}}
    return {'name': 'realquest', 'services': {
        'db': dict(common, image='postgres:17-alpine@sha256:' + 'd' * 64, environment={'POSTGRES_PASSWORD': PASSWORD}),
        'backend': dict(common, image=data['backend_image'], environment=environment),
        'frontend': dict(common, image=data['frontend_image'], networks={'default': {}, 'proxy': {'aliases': ['realquest-upstream']}})},
        'networks': {'default': {'name': 'realquest_private'}, 'proxy': {'name': 'realquest_proxy', 'external': True}},
        'volumes': {'postgres_data': {'name': 'realquest_postgres_data'}}}


class ValidationTest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.envfile = Path(temporary.name) / 'app.env'
        self.envfile.write_text('POSTGRES_PASSWORD=' + PASSWORD + '\nREALQUEST_DOMAIN=realquest.jastcraft.com\nCOOKIE_SECURE=true\nALLOWED_ORIGINS=https://realquest.jastcraft.com\n')
        self.envfile.chmod(0o600)

    def test_valid_settings_and_distinct_digest_images(self):
        data = validation.release_metadata(metadata(), '42', REVISION, 'owner/RealQuest', '1')
        values = validation.environment_file(self.envfile)
        self.assertIsNotNone(validation.compose_config(production_config(), values, data))

    @unittest.skipUnless(shutil.which('docker'), 'Docker Compose CLI unavailable')
    def test_actual_compose_normalization_is_accepted(self):
        data = metadata()
        images = self.envfile.parent / 'images.env'
        images.write_text('REALQUEST_FRONTEND_IMAGE=' + data['frontend_image'] + '\nREALQUEST_BACKEND_IMAGE=' + data['backend_image'] + '\n')
        result = subprocess.run(['docker', 'compose', '--env-file', str(self.envfile), '--env-file', str(images),
                                 '-f', str(ROOT / 'deploy/compose.prod.yaml'), 'config', '--format', 'json'],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        validation.compose_config(json.loads(result.stdout), validation.environment_file(self.envfile), data)

    def test_unverified_images_or_mismatched_artifact_are_rejected(self):
        for key, value in [('frontend_image', 'caddy:latest'), ('revision', 'bad'),
                           ('build_run_id', 'other'), ('build_run_attempt', '2')]:
            with self.subTest(key=key):
                with self.assertRaises(ValueError):
                    validation.release_metadata(dict(metadata(), **{key: value}), '42', REVISION, 'owner/RealQuest', '1')

    def test_only_successful_main_ci_runs_from_this_repository_are_allowed(self):
        run = {'id': 42, 'run_attempt': 1, 'status': 'completed', 'conclusion': 'success', 'head_branch': 'main',
               'event': 'push', 'path': '.github/workflows/ci.yml', 'head_sha': REVISION,
               'repository': {'full_name': 'owner/RealQuest'}, 'head_repository': {'full_name': 'owner/RealQuest'}}
        validation.workflow_run(run, '42', 'owner/RealQuest')
        for key, value in [('conclusion', 'failure'), ('head_branch', 'feature'), ('event', 'pull_request'),
                           ('path', '.github/workflows/other.yml'), ('head_repository', {'full_name': 'fork/RealQuest'})]:
            with self.subTest(key=key):
                with self.assertRaises(ValueError):
                    validation.workflow_run(dict(run, **{key: value}), '42', 'owner/RealQuest')

    def test_insecure_cookie_origin_password_or_permissions_are_rejected(self):
        original = self.envfile.read_text()
        for before, after in [('COOKIE_SECURE=true', 'COOKIE_SECURE=false'),
                              ('https://realquest.jastcraft.com', 'http://realquest.jastcraft.com'),
                              (PASSWORD, 'realquest-local-only')]:
            self.envfile.write_text(original.replace(before, after))
            with self.assertRaises(ValueError):
                validation.environment_file(self.envfile)
        self.envfile.write_text(original)
        self.envfile.chmod(0o644)
        with self.assertRaises(ValueError):
            validation.environment_file(self.envfile)

    def test_published_ports_changed_volume_and_backend_on_proxy_are_rejected(self):
        values = validation.environment_file(self.envfile)
        for change in ['ports', 'volume', 'network', 'migration']:
            config = production_config()
            if change == 'ports': config['services']['db']['ports'] = ['5432:5432']
            if change == 'volume': config['volumes']['postgres_data']['name'] = 'empty-new-volume'
            if change == 'network': config['services']['backend']['networks']['proxy'] = {}
            if change == 'migration': config['services']['backend']['environment']['REALQUEST_RUN_MIGRATIONS'] = 'true'
            with self.subTest(change=change), self.assertRaises(ValueError):
                validation.compose_config(config, values, metadata())


class DeploymentTest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.base = Path(temporary.name).resolve()
        self.app = self.base / 'app'
        self.gateway = self.base / 'gateway'
        for path in [self.app / 'releases', self.app / 'backups', self.gateway, self.base / 'bin']:
            path.mkdir(parents=True)
        (self.app / 'deployment-target').write_text('tencent-prod\n')
        (self.gateway / 'deployment-target').write_text('tencent-shanghai-01\n')
        envfile = self.app / 'app.env'
        envfile.write_text('POSTGRES_PASSWORD=' + PASSWORD + '\nREALQUEST_DOMAIN=realquest.jastcraft.com\nCOOKIE_SECURE=true\nALLOWED_ORIGINS=https://realquest.jastcraft.com\n')
        envfile.chmod(0o600)
        self.new = self.make_release('new', 'a')
        self.old = self.make_release('old', 'b')
        (self.app / 'current').symlink_to(self.old)
        (self.base / 'fixture.json').write_text(json.dumps(production_config()))
        (self.base / 'schema').write_text('002')
        stub = self.base / 'bin/stub'
        stub.write_text('#!' + sys.executable + '\n' + r'''
import json, os
from pathlib import Path
import sys
name, args = Path(sys.argv[0]).name, sys.argv[1:]
with open(os.environ['CALLS'], 'a') as stream:
    stream.write(json.dumps([name] + args) + '\n')
mode = os.environ.get('FAIL_MODE', '')
schema = Path(os.environ['SCHEMA'])
if name == 'flock': sys.exit(0)
if name == 'curl':
    if mode == 'health': sys.exit(22)
    print('{"status":"ok"}')
    sys.exit(0)
if args[:2] == ['network', 'inspect']:
    sys.exit(1 if mode == 'network' else 0)
if args[:2] == ['ps', '-q']:
    if os.environ.get('DB_RUNNING') == '1': print('a' * 12)
    sys.exit(0)
if args[:2] == ['volume', 'inspect']:
    sys.exit(0 if os.environ.get('DB_VOLUME_EXISTS') == '1' else 1)
images = {}
for index, argument in enumerate(args):
    if argument == '--env-file':
        for line in Path(args[index + 1]).read_text().splitlines():
            if '=' in line:
                key, value = line.split('=', 1)
                images[key] = value
if 'config' in args:
    config = json.loads(Path(os.environ['FIXTURE']).read_text())
    config['services']['backend']['image'] = images['REALQUEST_BACKEND_IMAGE']
    config['services']['frontend']['image'] = images['REALQUEST_FRONTEND_IMAGE']
    if mode == 'config': config['services']['db']['ports'] = ['5432:5432']
    print(json.dumps(config)); sys.exit(0)
if 'pull' in args and mode == 'pull': sys.exit(42)
if 'pg_dump' in args:
    print('partial' if mode == 'dump' else 'PGDMP valid synthetic archive')
    sys.exit(42 if mode == 'dump' else 0)
if 'pg_restore' in args: sys.exit(42 if mode == 'archive' else 0)
if 'psql' in args:
    print('alembic_version' if 'to_regclass' in args[-1] else schema.read_text())
    sys.exit(0)
if 'run' in args:
    if mode == 'migration': sys.exit(42)
    if mode == 'schema': schema.write_text('003')
if 'up' in args and 'frontend' in args and mode in ['startup', 'schema']:
    if images['REALQUEST_BACKEND_IMAGE'].endswith('a' * 64): sys.exit(42)
''')
        stub.chmod(0o755)
        for name in ['docker', 'curl', 'flock']:
            (self.base / 'bin' / name).symlink_to(stub)
        self.env = dict(os.environ, PATH=str(self.base / 'bin') + os.pathsep + os.environ['PATH'],
                        REALQUEST_ROOT=str(self.app), GATEWAY_ROOT=str(self.gateway),
                        CALLS=str(self.base / 'calls'), FIXTURE=str(self.base / 'fixture.json'),
                        SCHEMA=str(self.base / 'schema'), DB_RUNNING='1', DB_VOLUME_EXISTS='1')

    def make_release(self, name, digest):
        release = self.app / 'releases' / name
        shutil.copytree(ROOT / 'deploy', release / 'deploy')
        data = metadata(digest)
        (release / 'release.json').write_text(json.dumps(data))
        (release / 'images.env').write_text('REALQUEST_FRONTEND_IMAGE=' + data['frontend_image'] + '\nREALQUEST_BACKEND_IMAGE=' + data['backend_image'] + '\n')
        return release

    def deploy(self, mode=''):
        result = subprocess.run(['bash', str(self.new / 'deploy/deploy.sh'), 'tencent-prod'],
                                env=dict(self.env, FAIL_MODE=mode), capture_output=True, text=True)
        log = self.base / 'calls'
        calls = [json.loads(line) for line in log.read_text().splitlines()] if log.exists() else []
        return result, calls

    def test_success_backs_up_and_promotes_after_host_https_health_check(self):
        result, calls = self.deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.app / 'current').resolve(), self.new)
        snapshot = Path((self.new / 'predeploy-backup').read_text().strip())
        self.assertEqual(snapshot.stat().st_mode & 0o777, 0o600)
        self.assertEqual((self.app / 'previous').resolve(), self.old)
        health = next(call for call in calls if call[0] == 'curl')
        self.assertIn('realquest.jastcraft.com:443:127.0.0.1', health)
        self.assertNotIn('-k', health)
        self.assertFalse((self.new / 'compose.json').exists())
        self.assertFalse(any('down' in call or ('volume' in call and 'rm' in call) for call in calls))

    def test_wrong_host_or_application_marker_fails_before_docker(self):
        for marker in [self.gateway / 'deployment-target', self.app / 'deployment-target']:
            original = marker.read_text()
            marker.write_text('other-host\n')
            result, calls = self.deploy()
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(calls, [])
            marker.write_text(original)

    def test_failed_config_pull_or_backup_does_not_stop_old_applications(self):
        for mode in ['config', 'pull', 'dump', 'archive', 'network']:
            with self.subTest(mode=mode):
                result, calls = self.deploy(mode)
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(any('stop' in call for call in calls))
                self.assertEqual((self.app / 'current').resolve(), self.old)
                self.assertFalse((self.new / 'compose.json').exists())
                if mode in ['dump', 'archive']:
                    self.assertEqual(list((self.app / 'backups').iterdir()), [])
                (self.base / 'calls').unlink(missing_ok=True)

    def test_failed_start_or_https_health_restores_images_when_schema_unchanged(self):
        for mode in ['startup', 'health']:
            with self.subTest(mode=mode):
                result, calls = self.deploy(mode)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual((self.app / 'current').resolve(), self.old)
                restorations = [call for call in calls if 'up' in call and 'frontend' in call and str(self.old / 'images.env') in call]
                self.assertEqual(len(restorations), 1)
                (self.base / 'calls').unlink()

    def test_changed_schema_or_failed_migration_does_not_restart_old_images(self):
        for mode in ['schema', 'migration']:
            with self.subTest(mode=mode):
                (self.base / 'schema').write_text('002')
                result, calls = self.deploy(mode)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('Applications remain stopped', result.stderr)
                self.assertFalse(any('up' in call and 'frontend' in call and str(self.old / 'images.env') in call for call in calls))
                self.assertFalse(any('pg_restore' in call and '--list' not in call for call in calls))
                (self.base / 'calls').unlink()

    def test_first_failed_start_keeps_database_and_does_not_promote(self):
        (self.app / 'current').unlink()
        self.env['DB_RUNNING'] = '0'
        self.env['DB_VOLUME_EXISTS'] = '0'
        result, calls = self.deploy('startup')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.app / 'current').exists())
        self.assertFalse(any('down' in call or 'rm' in call and 'volume' in call for call in calls))
        self.assertTrue((self.app / 'database-managed').exists())
        self.env.update(DB_RUNNING='1', DB_VOLUME_EXISTS='1')
        result, _ = self.deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue((self.new / 'predeploy-backup').exists())

    def test_stopped_database_is_started_and_backed_up_before_migration(self):
        self.env['DB_RUNNING'] = '0'
        result, calls = self.deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        started = next(index for index, call in enumerate(calls) if 'up' in call and call[-1] == 'db')
        backed_up = next(index for index, call in enumerate(calls) if 'pg_dump' in call)
        migrated = next(index for index, call in enumerate(calls) if 'run' in call)
        self.assertLess(started, backed_up)
        self.assertLess(backed_up, migrated)

    def test_missing_production_volume_is_not_silently_recreated(self):
        self.env.update(DB_RUNNING='0', DB_VOLUME_EXISTS='0')
        result, calls = self.deploy()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('volume is missing', result.stderr)
        self.assertFalse(any('up' in call or 'pull' in call for call in calls))


if __name__ == '__main__':
    unittest.main()
