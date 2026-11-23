import unittest
from unittest.mock import patch
import harvest
import extended_adapters as ext
from registry import BY_ID

class ExtendedAdapterTests(unittest.TestCase):
    def test_six_registry_entries_are_unique_and_registered(self):
        ids = ('joomla-vel', 'drupal-api', 'jenkins-update-center',
               'grafana-catalog', 'agent-plugins-directory', 'reportportal-public')
        for key in ids:
            self.assertEqual(BY_ID[key]['api_status'], 'live')
            self.assertIn(key, harvest.ADAPTERS)
        self.assertEqual(BY_ID['joomla-vel']['category'], 'cms')
        self.assertEqual(BY_ID['drupal-api']['category'], 'cms')
        self.assertEqual(BY_ID['jenkins-update-center']['category'], 'cicd')
        self.assertEqual(BY_ID['grafana-catalog']['category'], 'observability')
        self.assertEqual(BY_ID['reportportal-public']['category'], 'test-automation')

    def test_joomla_vel_maps_security_fields(self):
        payload = {'success': True, 'data': {'items': [{
            'id': 7, 'title': 'Affected Extension', 'status': 'resolved',
            'cve_id': 'CVE-2026-0001', 'cvss30_base_score': 8.1,
            'vulnerable_version': '1.0', 'patch_version': '1.1',
            'risk level': 'high', 'jed': 'https://extensions.joomla.org/extension/demo/',
            'install_data': {'author': 'Publisher'}, 'modified': '2026-11-01'
        }]}}
        with patch.object(ext, 'fetch_json', return_value=payload):
            row = next(ext.joomla_vel({}))
        self.assertEqual(row['plugin_id'], '7')
        self.assertEqual(row['author'], 'Publisher')
        self.assertEqual(row['version'], '1.1')
        self.assertEqual(row['rating'], 8.1)
        self.assertEqual(row['category'], 'high')

    def test_drupal_api_paginates_until_next_missing(self):
        pages = [
            {'list': [{'nid': 1, 'title': 'Module One', 'taxonomy_vocabulary_3': {'name': 'Tools'}, 'changed': 10, 'uri': 'https://www.drupal.org/project/one'}], 'next': 'present'},
            {'list': [{'nid': 2, 'title': 'Module Two'}]}
        ]
        with patch.object(ext, 'fetch_json', side_effect=pages) as mocked:
            state = {}
            rows = list(ext.drupal_api(state))
        self.assertEqual([r['plugin_id'] for r in rows], ['1', '2'])
        self.assertEqual(rows[0]['category'], 'Tools')
        self.assertEqual(mocked.call_count, 2)
        self.assertEqual(state['page'], 1)

    def test_jenkins_reads_large_index_and_uses_feed_first_version(self):
        payload = {'plugins': {'demo': {
            '2.0': {'requiredCore': '2.400', 'releaseTimestamp': '2026-11-01'},
            '1.9': {'requiredCore': '2.300'}
        }}}
        with patch.object(ext, 'fetch_json', return_value=payload) as mocked:
            row = next(ext.jenkins_update_center({}))
        self.assertEqual(row['version'], '2.0')
        self.assertEqual(row['category'], 'jenkins-plugin')
        self.assertEqual(mocked.call_args.kwargs['max_bytes'], 40_000_000)

    def test_grafana_requires_explicit_seed_and_normalizes_details(self):
        with self.assertRaisesRegex(harvest.HarvestError, 'no public global slug listing'):
            list(ext.grafana_catalog({}))
        payload = {'name': 'Example Panel', 'orgName': 'Grafana Labs',
                   'version': {'version': '3.2.1'}, 'downloads': 123,
                   'type': 'panel', 'updatedAt': '2026-11-01'}
        with patch.object(ext, 'fetch_json', return_value=payload):
            row = next(ext.grafana_catalog({'slugs': ['example-panel']}))
        self.assertEqual(row['plugin_id'], 'example-panel')
        self.assertEqual(row['version'], '3.2.1')
        self.assertEqual(row['downloads'], 123)

    def test_agent_plugins_directory_paged_response(self):
        payload = {'plugins': [{'owner': 'acme', 'name': 'search',
                                'version': '1.0', 'updatedAt': '2026-11-01'}]}
        with patch.object(ext, '_fetch_json_with_headers', return_value=(payload, {})):
            row = next(ext.agent_plugins_directory({}))
        self.assertEqual(row['plugin_id'], 'acme/search')
        self.assertEqual(row['author'], 'acme')
        self.assertEqual(row['category'], 'agent-plugin')

    def test_reportportal_public_list(self):
        payload = [{'id': 12, 'name': 'Jira Integration', 'vendor': 'Example',
                    'version': '2.0', 'type': 'integration'}]
        with patch.object(ext, 'fetch_json', return_value=payload):
            row = next(ext.reportportal_public({}))
        self.assertEqual(row['plugin_id'], '12')
        self.assertEqual(row['author'], 'Example')
        self.assertEqual(row['category'], 'integration')

if __name__ == '__main__':
    unittest.main()
