"""Validate promotion metadata and production settings without printing secrets."""
import argparse
import json
import os
from pathlib import Path
import re
import stat
import sys
from urllib.parse import urlsplit


def image_reference(value):
    if not isinstance(value, str) or not re.fullmatch(
            r'[a-z0-9][a-z0-9.-]*(?::[0-9]+)?/[a-z0-9][a-z0-9._/-]*@sha256:[a-f0-9]{64}', value):
        raise ValueError('Use a complete registry/repository@sha256 image reference')
    return value


def release_metadata(data, run_id=None, revision=None, repository=None, attempt=None):
    if data.get('schema') != 1 or not re.fullmatch(r'[a-f0-9]{40}', str(data.get('revision', ''))):
        raise ValueError('Invalid release revision/schema')
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', str(data.get('repository', ''))):
        raise ValueError('Invalid release repository')
    for key in ['build_run_id', 'build_run_attempt']:
        if not re.fullmatch(r'[1-9][0-9]*', str(data.get(key, ''))):
            raise ValueError('Invalid release build identity')
    for key, expected in [('build_run_id', run_id), ('revision', revision),
                          ('repository', repository), ('build_run_attempt', attempt)]:
        if expected is not None and str(data.get(key)) != str(expected):
            raise ValueError('Release does not match the selected successful CI run')
    for key in ['frontend_image', 'backend_image']:
        image_reference(data.get(key))
    if data['frontend_image'] == data['backend_image']:
        raise ValueError('Frontend and backend must have distinct images')
    return data


def workflow_run(data, run_id, repository):
    if (str(data.get('id')) != str(run_id) or data.get('status') != 'completed'
            or data.get('conclusion') != 'success' or data.get('head_branch') != 'main'
            or data.get('event') not in {'push', 'workflow_dispatch'}
            or data.get('path', '').split('@')[0] != '.github/workflows/ci.yml'
            or data.get('repository', {}).get('full_name') != repository
            or data.get('head_repository', {}).get('full_name') != repository
            or not re.fullmatch(r'[a-f0-9]{40}', data.get('head_sha', ''))):
        raise ValueError('Select a successful main-branch Container CI and build run from this repository')
    return data


def environment_file(path, check_permissions=True):
    path = Path(path)
    if check_permissions:
        info = path.stat()
        if stat.S_IMODE(info.st_mode) != 0o600 or info.st_uid != os.getuid():
            raise ValueError('app.env must belong to the deployment user and have mode 600')
    values = {}
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if '=' not in line:
            raise ValueError('Use KEY=value lines in app.env')
        key, value = line.split('=', 1)
        if not re.fullmatch(r'[A-Z][A-Z0-9_]*', key) or key in values:
            raise ValueError('Invalid or duplicate app.env key')
        values[key] = value
    domain = values.get('REALQUEST_DOMAIN', '')
    if not re.fullmatch(r'[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+', domain):
        raise ValueError('Set REALQUEST_DOMAIN to a plain domain name')
    if values.get('COOKIE_SECURE') != 'true' or values.get('ALLOWED_ORIGINS') != 'https://' + domain:
        raise ValueError('Use secure cookies and exactly this service HTTPS origin')
    if not re.fullmatch(r'[A-Za-z0-9]{32,128}', values.get('POSTGRES_PASSWORD', '')):
        raise ValueError('Use a random 32-128 character alphanumeric PostgreSQL password')
    if any(key.endswith('_IMAGE') for key in values):
        raise ValueError('Keep image references in the selected release, not app.env')
    return values


def compose_config(config, env, metadata):
    services = config.get('services', {})
    if config.get('name') != 'realquest' or set(services) != {'db', 'backend', 'frontend'}:
        raise ValueError('Use the realquest production Compose project')
    for service in services.values():
        if service.get('ports') or service.get('build') or service.get('restart') != 'unless-stopped':
            raise ValueError('Production services must use images, restart automatically and publish no ports')
    if services['backend']['image'] != metadata['backend_image'] or services['frontend']['image'] != metadata['frontend_image']:
        raise ValueError('Compose images must match the selected CI release')
    database = services['db']
    if not re.fullmatch(r'postgres:17-alpine@sha256:[a-f0-9]{64}', database['image']):
        raise ValueError('Keep the reviewed PostgreSQL 17 image digest')
    if config['volumes']['postgres_data']['name'] != 'realquest_postgres_data':
        raise ValueError('Keep the persistent production database volume name')
    private = config['networks']['default']
    proxy = config['networks']['proxy']
    if (private.get('name') != 'realquest_private' or private.get('external', False)
            or private.get('driver', 'bridge') != 'bridge'
            or proxy.get('name') != 'realquest_proxy' or proxy.get('external') is not True):
        raise ValueError('Use the isolated application network and external gateway network')
    for name in ['db', 'backend']:
        if set(services[name]['networks']) != {'default'}:
            raise ValueError('Database/backend must stay on the private application network')
    frontend = services['frontend']
    if set(frontend['networks']) != {'default', 'proxy'} or 'realquest-upstream' not in frontend['networks']['proxy'].get('aliases', []):
        raise ValueError('Connect only the frontend to the gateway with its fixed alias')
    settings = services['backend']['environment']
    if (settings.get('COOKIE_SECURE') != 'true' or settings.get('ALLOWED_ORIGINS') != env['ALLOWED_ORIGINS']
            or settings.get('REALQUEST_RUN_MIGRATIONS') != 'false'):
        raise ValueError('Use secure runtime settings and explicit deployment migrations')
    url = urlsplit(settings['DATABASE_URL'])
    if (url.scheme != 'postgresql+psycopg' or url.hostname != 'db' or url.port != 5432
            or url.username != 'realquest' or url.password != env['POSTGRES_PASSWORD'] or url.path != '/realquest'):
        raise ValueError('Use the private RealQuest PostgreSQL connection')
    if database['environment'].get('POSTGRES_PASSWORD') != env['POSTGRES_PASSWORD']:
        raise ValueError('Database/runtime credentials differ')
    return config


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest='command', required=True)
    env_parser = sub.add_parser('env'); env_parser.add_argument('path')
    release_parser = sub.add_parser('release'); release_parser.add_argument('path')
    release_parser.add_argument('--run-id'); release_parser.add_argument('--revision'); release_parser.add_argument('--repository')
    images_parser = sub.add_parser('images'); images_parser.add_argument('path'); images_parser.add_argument('output')
    compose_parser = sub.add_parser('compose'); compose_parser.add_argument('path'); compose_parser.add_argument('env'); compose_parser.add_argument('release')
    artifact_parser = sub.add_parser('artifact'); artifact_parser.add_argument('path'); artifact_parser.add_argument('run')
    artifact_parser.add_argument('--run-id', required=True); artifact_parser.add_argument('--repository', required=True)
    create_parser = sub.add_parser('create'); create_parser.add_argument('output')
    args = parser.parse_args()
    try:
        if args.command == 'env':
            environment_file(args.path)
        elif args.command == 'release':
            release_metadata(json.loads(Path(args.path).read_text()), args.run_id, args.revision, args.repository)
        elif args.command == 'images':
            data = release_metadata(json.loads(Path(args.path).read_text()))
            Path(args.output).write_text('REALQUEST_FRONTEND_IMAGE=' + data['frontend_image'] + '\nREALQUEST_BACKEND_IMAGE=' + data['backend_image'] + '\n')
        elif args.command == 'compose':
            compose_config(json.loads(Path(args.path).read_text()), environment_file(args.env),
                           release_metadata(json.loads(Path(args.release).read_text())))
        elif args.command == 'artifact':
            run = workflow_run(json.loads(Path(args.run).read_text()), args.run_id, args.repository)
            data = release_metadata(json.loads(Path(args.path).read_text()), args.run_id, run['head_sha'], args.repository, run['run_attempt'])
            print(data['revision'])
        else:
            data = {'schema': 1, 'repository': os.environ['GITHUB_REPOSITORY'], 'revision': os.environ['GITHUB_SHA'],
                    'build_run_id': os.environ['GITHUB_RUN_ID'], 'build_run_attempt': os.environ['GITHUB_RUN_ATTEMPT'],
                    'frontend_image': os.environ['FRONTEND_IMAGE'], 'backend_image': os.environ['BACKEND_IMAGE']}
            release_metadata(data)
            Path(args.output).parent.mkdir(parents=True, exist_ok=True)
            Path(args.output).write_text(json.dumps(data, indent=2) + '\n')
    except ValueError as error:
        sys.exit(str(error))
    except (KeyError, TypeError, OSError):
        sys.exit('Production validation failed; check release provenance, secure settings and deployment configuration')


if __name__ == '__main__':
    main()
