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


    def test_six_new_registries_are_registered_without_duplicate_surfaces(self):
        expected = ('node-red-flow-library', 'joplin-plugins', 'zotero-plugins',
                    'raycast-store', 'rensei-plugins', 'homeassistant-catalog')
        for key in expected:
            self.assertEqual(BY_ID[key]['api_status'], 'live')
            self.assertIn(key, harvest.ADAPTERS)
        self.assertNotEqual(BY_ID['node-red-flow-library']['id'], BY_ID['nodered']['id'])
        self.assertNotEqual(BY_ID['homeassistant-catalog']['id'], 'homeassistant')

    def test_node_red_flow_library_maps_and_pages(self):
        pages = [
            {'results': [{'id': 'node-red-contrib-demo', 'name': 'Demo Nodes',
                          'npm_username': 'acme', 'version': '1.0',
                          'downloads': 42, 'categories': ['network']}],
             'num_pages': 2},
            {'results': [{'npm_package': 'node-red-extra', 'name': 'Extra'}],
             'num_pages': 2}
        ]
        with patch.object(ext, 'fetch_json', side_effect=pages):
            state = {}
            rows = list(ext.node_red_flow_library(state))
        self.assertEqual([r['plugin_id'] for r in rows], ['node-red-contrib-demo', 'node-red-extra'])
        self.assertEqual(rows[0]['downloads'], 42)
        self.assertEqual(rows[0]['category'], 'network')
        self.assertEqual(state['page'], 2)

    def test_joplin_merges_optional_download_stats(self):
        manifests = [{'id': 'plugin.demo', 'name': 'Demo', 'author': 'Author',
                      'version': '2.0', 'categories': ['productivity'],
                      'repository_url': 'https://github.com/example/demo'}]
        stats = {'plugin.demo': {'2.0': {'downloadCount': 123}}}
        with patch.object(ext, 'fetch_json', side_effect=[manifests, stats]):
            row = next(ext.joplin_plugins({}))
        self.assertEqual(row['plugin_id'], 'plugin.demo')
        self.assertEqual(row['downloads'], 123)
        self.assertEqual(row['category'], 'productivity')

    def test_zotero_accepts_only_list_envelope_and_fails_closed(self):
        with patch.object(ext, 'fetch_json', return_value={'plugins': [
            {'id': 'z1', 'name': 'Zotero Add-on', 'author': 'Author'}]}):
            row = next(ext.zotero_plugins({}))
        self.assertEqual(row['plugin_id'], 'z1')
        self.assertEqual(row['author'], 'Author')
        with patch.object(ext, 'fetch_json', return_value={'html': 'not-json-catalog'}):
            with self.assertRaisesRegex(harvest.HarvestError, 'verify the current REST route/schema'):
                list(ext.zotero_plugins({}))

    def test_raycast_store_paginates_and_maps_downloads(self):
        pages = [
            {'data': [{'slug': 'demo', 'title': 'Demo Extension',
                       'owner': {'handle': 'acme'}, 'downloadCount': 100,
                       'categories': ['Developer Tools']}], 'total': 101},
            {'data': [{'slug': 'demo-two', 'title': 'Second',
                       'owner': {'handle': 'acme'}}], 'total': 101}
        ]
        with patch.object(ext, 'fetch_json', side_effect=pages):
            state = {}
            rows = list(ext.raycast_store(state))
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]['downloads'], 100)
        self.assertEqual(rows[0]['url'], 'https://www.raycast.com/acme/demo')
        self.assertEqual(state['page'], 2)

    def test_rensei_uses_offset_and_total(self):
        pages = [
            {'plugins': [{'id': 'p1', 'name': 'Plugin One', 'provider': 'Vendor',
                          'status': 'active'}], 'total': 2},
            {'plugins': [{'id': 'p2', 'name': 'Plugin Two'}], 'total': 2}
        ]
        with patch.object(ext, 'fetch_json', side_effect=pages):
            state = {}
            rows = list(ext.rensei_plugins(state))
        self.assertEqual([r['plugin_id'] for r in rows], ['p1', 'p2'])
        self.assertEqual(rows[0]['author'], 'Vendor')
        self.assertEqual(state['offset'], 2)

    def test_homeassistant_generated_catalog_maps_core_integrations(self):
        payload = {'integration': {
            'demo': {'name': 'Demo Integration', 'integration_type': 'hub',
                     'iot_class': 'cloud_polling', 'config_flow': True}}}
        with patch.object(ext, 'fetch_json', return_value=payload):
            row = next(ext.homeassistant_catalog({}))
        self.assertEqual(row['plugin_id'], 'demo')
        self.assertEqual(row['name'], 'Demo Integration')
        self.assertEqual(row['category'], 'hub')

if __name__ == '__main__':
    unittest.main()
