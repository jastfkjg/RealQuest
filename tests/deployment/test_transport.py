"""Exercise artifact fetch and SSH transport with command stubs only."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from test_deploy import ROOT, REVISION, metadata


class TransportTest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.base = Path(temporary.name).resolve()
        (self.base / 'bin').mkdir()
        self.run = {'id': 42, 'run_attempt': 1, 'status': 'completed', 'conclusion': 'success', 'head_branch': 'main',
                    'event': 'push', 'path': '.github/workflows/ci.yml@refs/heads/main', 'head_sha': REVISION,
                    'repository': {'full_name': 'owner/RealQuest'}, 'head_repository': {'full_name': 'owner/RealQuest'}}
        (self.base / 'run.json').write_text(json.dumps(self.run))
        (self.base / 'release.json').write_text(json.dumps(metadata()))
        stub = self.base / 'bin/stub'
        stub.write_text('#!' + sys.executable + '\n' + r'''
import json, os, shutil, sys
from pathlib import Path
name, args = Path(sys.argv[0]).name, sys.argv[1:]
with open(os.environ['CALLS'], 'a') as stream:
    stream.write(json.dumps([name] + args) + '\n')
if name == 'git': print(os.environ['STUB_REVISION'])
if name == 'gh':
    if args[0] == 'api': print(Path(os.environ['RUN_FILE']).read_text())
    else:
        shutil.copyfile(os.environ['METADATA_FILE'], Path(args[args.index('--dir') + 1]) / 'release.json')
if name == 'ssh':
    for index, argument in enumerate(args):
        if argument == '-i':
            key = Path(args[index + 1])
            assert key.exists() and key.stat().st_mode & 0o777 == 0o600
            Path(os.environ['KEY_LOCATION']).write_text(str(key))
    if args[-1].startswith('tar '): sys.stdin.buffer.read()
''')
        stub.chmod(0o755)
        for name in ['git', 'gh', 'ssh']:
            (self.base / 'bin' / name).symlink_to(stub)
        self.env = dict(os.environ, PATH=str(self.base / 'bin') + os.pathsep + os.environ['PATH'],
                        CALLS=str(self.base / 'calls'), STUB_REVISION=REVISION,
                        RUN_FILE=str(self.base / 'run.json'), METADATA_FILE=str(self.base / 'release.json'),
                        GITHUB_OUTPUT=str(self.base / 'output'), GITHUB_REPOSITORY='owner/RealQuest',
                        KEY_LOCATION=str(self.base / 'key-location'), BUILD_RUN_ID='42', REVISION=REVISION,
                        GITHUB_RUN_ID='100', GITHUB_RUN_ATTEMPT='1', TARGET_ENVIRONMENT='tencent-prod',
                        DEPLOY_TARGET='tencent-prod', RELEASE_FILE=str(self.base / 'release.json'),
                        SSH_HOST='124.220.81.113', SSH_USER='deploy', SSH_PORT='22',
                        SSH_KEY='synthetic test key', SSH_KNOWN_HOSTS='synthetic trusted host key')

    def calls(self):
        path = self.base / 'calls'
        return [json.loads(line) for line in path.read_text().splitlines()] if path.exists() else []

    def test_verified_artifact_outputs_the_exact_source_revision(self):
        result = subprocess.run(['bash', str(ROOT / 'deploy/fetch-release.sh'), str(self.base / 'download')],
                                cwd=ROOT, env=self.env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.base / 'output').read_text(), 'revision=' + REVISION + '\n')
        self.assertEqual(len(self.calls()), 2)

    def test_invalid_ci_run_is_rejected_before_artifact_download(self):
        (self.base / 'run.json').write_text(json.dumps(dict(self.run, event='pull_request')))
        result = subprocess.run(['bash', str(ROOT / 'deploy/fetch-release.sh'), str(self.base / 'download')],
                                cwd=ROOT, env=self.env, capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(len(self.calls()), 1)
        self.assertFalse((self.base / 'output').exists())

    def test_mismatched_artifact_never_outputs_a_revision(self):
        (self.base / 'release.json').write_text(json.dumps(dict(metadata(), revision='b' * 40)))
        result = subprocess.run(['bash', str(ROOT / 'deploy/fetch-release.sh'), str(self.base / 'download')],
                                cwd=ROOT, env=self.env, capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.base / 'output').exists())

    def test_transport_uses_strict_host_keys_and_cleans_temporary_credentials(self):
        result = subprocess.run(['bash', str(ROOT / 'deploy/publish.sh')], cwd=ROOT,
                                env=self.env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        ssh = [call for call in self.calls() if call[0] == 'ssh']
        self.assertEqual(len(ssh), 3)
        self.assertTrue(all('StrictHostKeyChecking=yes' in call for call in ssh))
        self.assertIn('tencent-prod', ssh[-1][-1])
        self.assertFalse(Path((self.base / 'key-location').read_text()).exists())

    def test_wrong_target_checkout_or_artifact_never_connects_ssh(self):
        for replacement in [{'DEPLOY_TARGET': 'aws-prod'}, {'STUB_REVISION': 'b' * 40}, {'BUILD_RUN_ID': '43'}]:
            with self.subTest(replacement=replacement):
                result = subprocess.run(['bash', str(ROOT / 'deploy/publish.sh')], cwd=ROOT,
                                        env=dict(self.env, **replacement), capture_output=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(any(call[0] == 'ssh' for call in self.calls()))
                (self.base / 'calls').unlink(missing_ok=True)


if __name__ == '__main__':
    unittest.main()
