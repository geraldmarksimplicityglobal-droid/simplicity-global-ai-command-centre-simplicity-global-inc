"""Additional source-specific adapters for CMS, CI/CD, observability and AI plugins.

Imported by harvest.py after its core helpers and ADAPTERS mapping are defined.
All network access remains opt-in through the parent CLI's --execute flag.
"""
from __future__ import annotations
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request

from harvest import BY_ID, HarvestError, MAX_PAGES, fetch_json, record

def joomla_vel(state):
    data = fetch_json(BY_ID['joomla-vel']['endpoint'])
    if not isinstance(data, dict) or data.get('success') is False:
        raise HarvestError('Unexpected Joomla VEL response')
    body = data.get('data') or {}
    items = body.get('items') or []
    if not isinstance(items, list):
        raise HarvestError('Unexpected Joomla VEL items field')
    for item in items:
        if not isinstance(item, dict):
            continue
        install = item.get('install_data') or {}
        if not isinstance(install, dict):
            install = {}
        pid = item.get('id')
        name = item.get('title')
        if pid is None or not name:
            continue
        yield record('joomla-vel', pid, name, item,
            author=install.get('author'),
            version=item.get('patch_version') or item.get('vulnerable_version'),
            rating=item.get('cvss30_base_score'),
            category=item.get('risk level') or item.get('risk_level'),
            updated_at=item.get('modified'),
            url=item.get('jed'))

def drupal_api(state):
    try:
        page = int(state.get('page', 0))
        limit = int(state.get('limit', 100))
    except (TypeError, ValueError):
        raise HarvestError('Drupal page and limit must be integers')
    if page < 0 or not 1 <= limit <= 100:
        raise HarvestError('Drupal page must be nonnegative and limit must be 1..100')
    for _ in range(MAX_PAGES):
        query = urllib.parse.urlencode({'type':'project_module','limit':limit,'page':page})
        data = fetch_json('https://www.drupal.org/api-d7/node.json?' + query)
        if not isinstance(data, dict):
            raise HarvestError('Unexpected Drupal API-D7 response')
        batch = data.get('list') or []
        if not isinstance(batch, list):
            raise HarvestError('Unexpected Drupal list field')
        if not batch:
            return
        for node in batch:
            if not isinstance(node, dict):
                continue
            title = node.get('title')
            nid = node.get('nid')
            if nid is None or not title:
                continue
            taxonomy = node.get('taxonomy_vocabulary_3') or {}
            if not isinstance(taxonomy, dict):
                taxonomy = {}
            yield record('drupal-api', nid, title, node,
                category=taxonomy.get('name'),
                updated_at=node.get('changed'),
                url=node.get('uri'))
        if not data.get('next'):
            return
        page += 1
        state['page'] = page
        time.sleep(0.25)
    raise HarvestError('Drupal pagination safety stop; resume with saved page state')

def jenkins_update_center(state):
    data = fetch_json(BY_ID['jenkins-update-center']['endpoint'], max_bytes=40_000_000)
    plugins = data.get('plugins') if isinstance(data, dict) else None
    if not isinstance(plugins, dict):
        raise HarvestError('Unexpected Jenkins plugin-versions.json shape')
    for short_name, versions in plugins.items():
        if not isinstance(versions, dict) or not versions:
            continue
        # Jenkins publishes version entries in feed order; retain the first entry
        # rather than applying lexical sorting to semantic version strings.
        latest_key = next(iter(versions))
        latest = versions.get(latest_key) or {}
        if not isinstance(latest, dict):
            latest = {}
        yield record('jenkins-update-center', short_name, short_name, versions,
            version=latest_key,
            category='jenkins-plugin',
            updated_at=latest.get('releaseTimestamp'),
            url='https://plugins.jenkins.io/' + urllib.parse.quote(str(short_name), safe='') + '/')

def grafana_catalog(state):
    slugs = state.get('slugs')
    if slugs is None:
        configured = os.environ.get('GRAFANA_PLUGIN_SLUGS', '')
        slugs = [s.strip() for s in configured.split(',') if s.strip()]
    if not isinstance(slugs, list) or not slugs:
        raise HarvestError('Grafana has no public global slug listing; provide state.slugs or GRAFANA_PLUGIN_SLUGS')
    if len(slugs) > 5000:
        raise HarvestError('Grafana slug seed exceeds 5000 entries')
    seen = set()
    for slug in slugs:
        if not isinstance(slug, str) or not re.fullmatch(r'[A-Za-z0-9_-]+', slug):
            raise HarvestError('Invalid Grafana plugin slug')
        if slug in seen:
            continue
        seen.add(slug)
        try:
            data = fetch_json('https://grafana.com/api/plugins/' + urllib.parse.quote(slug, safe=''))
        except HarvestError:
            continue
        if not isinstance(data, dict):
            continue
        version_data = data.get('version')
        version = version_data.get('version') if isinstance(version_data, dict) else version_data
        yield record('grafana-catalog', slug, data.get('name') or slug, data,
            author=data.get('orgName'),
            version=version,
            downloads=data.get('downloads'),
            category=data.get('type'),
            updated_at=data.get('updatedAt'),
            url='https://grafana.com/grafana/plugins/' + urllib.parse.quote(slug, safe='') + '/')
        time.sleep(0.15)
    state['slugs'] = slugs

def _fetch_json_with_headers(url, max_bytes=5_000_000):
    parsed = urllib.parse.urlparse(url)
    allowed = {'agent-plugins.directory'}
    if parsed.scheme != 'https' or parsed.hostname not in allowed:
        raise HarvestError('HTTPS host is not allowlisted')
    req = urllib.request.Request(url, headers={'User-Agent':'SimplicityGlobal-PluginCensus/0.1','Accept':'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            raw = response.read(max_bytes + 1)
            if len(raw) > max_bytes:
                raise HarvestError(f'Response exceeds {max_bytes} byte limit')
            return json.loads(raw.decode('utf-8')), response.headers
    except urllib.error.HTTPError as exc:
        raise HarvestError(f'Agent Plugins Directory HTTP {exc.code}') from exc
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise HarvestError(f'Agent Plugins Directory request failed: {exc}') from exc

def agent_plugins_directory(state):
    page = int(state.get('page', 1))
    if page < 1:
        raise HarvestError('Agent Plugins Directory page must be positive')
    for _ in range(MAX_PAGES):
        url = 'https://agent-plugins.directory/api/v1/plugins?' + urllib.parse.urlencode({'page':page})
        data, headers = _fetch_json_with_headers(url, max_bytes=20_000_000)
        if isinstance(data, list):
            batch = data
        elif isinstance(data, dict):
            batch = data.get('plugins') or data.get('data') or []
        else:
            batch = []
        if not isinstance(batch, list):
            batch = []
        if not batch:
            # Static index is a documented fallback if the paged envelope changes.
            index = fetch_json('https://agent-plugins.directory/indexes/plugins.json', max_bytes=40_000_000)
            if not isinstance(index, list):
                raise HarvestError('Unexpected Agent Plugins Directory index shape')
            for row in index:
                if not isinstance(row, dict):
                    continue
                owner = row.get('owner') or row.get('p') or row.get('publisher') or ''
                name = row.get('name') or row.get('n') or ''
                pid = (str(owner) + '/' + str(name)).strip('/')
                if not owner or not name:
                    continue
                yield record('agent-plugins-directory', pid, name, row,
                    author=owner, category='agent-plugin',
                    url='https://agent-plugins.directory/' + urllib.parse.quote(str(owner), safe='') + '/' + urllib.parse.quote(str(name), safe=''))
            return
        for plugin in batch:
            if not isinstance(plugin, dict):
                continue
            owner = plugin.get('owner') or plugin.get('publisher')
            name = plugin.get('name')
            if not owner or not name:
                continue
            yield record('agent-plugins-directory', str(owner) + '/' + str(name), name, plugin,
                author=owner, version=plugin.get('version'), category='agent-plugin',
                updated_at=plugin.get('updatedAt') or plugin.get('commit'),
                url='https://agent-plugins.directory/' + urllib.parse.quote(str(owner), safe='') + '/' + urllib.parse.quote(str(name), safe=''))
        link = headers.get('Link', '')
        has_next = bool(re.search(r'<[^>]+>;\\s*rel="?next"?', link, re.I))
        if not has_next and len(batch) < 1000:
            return
        page += 1
        state['page'] = page
        time.sleep(0.2)
    raise HarvestError('Agent Plugins Directory pagination safety stop; resume with saved page state')

def reportportal_public(state):
    data = fetch_json(BY_ID['reportportal-public']['endpoint'])
    if isinstance(data, list):
        plugins = data
    elif isinstance(data, dict):
        plugins = data.get('plugins') or data.get('data') or []
    else:
        raise HarvestError('Unexpected ReportPortal public plugin response')
    if not isinstance(plugins, list):
        raise HarvestError('Unexpected ReportPortal plugin list')
    for plugin in plugins:
        if not isinstance(plugin, dict):
            continue
        pid = plugin.get('id') or plugin.get('name')
        name = plugin.get('name')
        if pid is None or not name:
            continue
        yield record('reportportal-public', pid, name, plugin,
            author=plugin.get('author') or plugin.get('vendor'),
            version=plugin.get('version'),
            category=plugin.get('type') or 'reportportal-plugin')

EXTRA_ADAPTERS = {
    'joomla-vel': joomla_vel,
    'drupal-api': drupal_api,
    'jenkins-update-center': jenkins_update_center,
    'grafana-catalog': grafana_catalog,
    'agent-plugins-directory': agent_plugins_directory,
    'reportportal-public': reportportal_public,
}
