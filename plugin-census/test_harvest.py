import unittest
from unittest.mock import patch
import harvest
from registry import CATALOG,BY_ID
class CensusTests(unittest.TestCase):
 def test_registry_has_56_unique_entries(self):
  self.assertEqual(len(CATALOG),56); self.assertEqual(len(BY_ID),56)
  self.assertEqual(BY_ID['telkom']['api_status'],'manual')
 def test_credentialed_templates_fail_closed(self):
  with patch.dict('os.environ',{'VODACOM_API_TOKEN':'test'},clear=True):
   with self.assertRaisesRegex(harvest.HarvestError,'unverified'): list(harvest.vodacom({}))
  with patch.dict('os.environ',{'TAKEALOT_API_KEY':'test'},clear=True):
   with self.assertRaisesRegex(harvest.HarvestError,'illustrative'): list(harvest.takealot({}))
  with patch.dict('os.environ',{'PAYJUSTNOW_MERCHANT_ID':'test','PAYJUSTNOW_SECRET_KEY':'test'},clear=True):
   with self.assertRaisesRegex(harvest.HarvestError,'not established'): list(harvest.payjustnow({}))
 def test_shopglu_and_n8n_normalize_records(self):
  payload={'slug':'shopglu-for-woocommerce','name':'ShopGlu','version':'1.0','author':'Demo'}
  with patch.object(harvest,'fetch_json',return_value=payload):
   row=next(harvest.shopglu({}))
  self.assertEqual(row['ecosystem'],'shopglu'); self.assertIn('raw_json',row)
  dirs=[{'type':'dir','name':'Slack','html_url':'https://github.com/n8n-io/n8n'}]
  with patch.object(harvest,'fetch_json',return_value=dirs):
   row=next(harvest.n8n({}))
  self.assertEqual(row['plugin_id'],'Slack')
 def test_nodered_pagination(self):
  payload={'objects':[{'package':{'name':'node-red-demo','version':'1.0','links':{'npm':'https://npmjs.com/package/node-red-demo'}}}],'total':1}
  with patch.object(harvest,'fetch_json',return_value=payload):
   rows=list(harvest.nodered({}))
  self.assertEqual(rows[0]['plugin_id'],'node-red-demo')
 def test_https_allowlist(self):
  with self.assertRaisesRegex(harvest.HarvestError,'allowlisted'): harvest.fetch_json('https://example.org/api')

 def test_factorio_and_steam_workshop_registry_classifications(self):
  self.assertEqual(BY_ID['factorio']['api_status'],'live')
  self.assertEqual(BY_ID['steam-workshop']['api_status'],'token')
  self.assertIn('publisher_key_required',BY_ID['steam-workshop']['verification'])
  self.assertIn('factorio',harvest.ADAPTERS)
  self.assertNotIn('steam-workshop',harvest.ADAPTERS)

 def test_factorio_paginates_and_normalizes(self):
  pages=[
   {'results':[{'name':'example-mod','title':'Example Mod','owner':'modder','downloads_count':42,'score':0.9,'category':'content','latest_release':{'version':'1.2.3','released_at':'2026-11-01'}}],
    'pagination':{'page_count':2}},
   {'results':[{'name':'second-mod','title':'Second Mod','owner':'builder'}],
    'pagination':{'page_count':2}},
  ]
  with patch.object(harvest,'fetch_json',side_effect=pages) as mocked:
   state={}
   rows=list(harvest.factorio(state))
  self.assertEqual([x['plugin_id'] for x in rows],['example-mod','second-mod'])
  self.assertEqual(rows[0]['version'],'1.2.3')
  self.assertEqual(rows[0]['downloads'],42)
  self.assertEqual(mocked.call_count,2)

 def test_factorio_rejects_invalid_pagination(self):
  with self.assertRaisesRegex(harvest.HarvestError,'page_size'):
   list(harvest.factorio({'page_size':1000}))

 def test_gaming_registry_classifications(self):
  self.assertEqual(BY_ID['xbox-gamepass']['api_status'],'live')
  self.assertEqual(BY_ID['xbox-partner']['api_status'],'token')
  self.assertEqual(BY_ID['xbox-xsapi']['api_status'],'manual')
  self.assertEqual(BY_ID['psn-store']['verification'],'unofficial_public_endpoint_seeded_products')
  self.assertEqual(BY_ID['psn-partners']['api_status'],'token')
  self.assertNotIn('xbox-partner',harvest.ADAPTERS)
  self.assertNotIn('psn-partners',harvest.ADAPTERS)
 def test_xbox_gamepass_normalizes_store_products(self):
  payload={'Products':[{'ProductId':'9ABC123','LocalizedProperties':[{'ProductTitle':'Example Game'}],'PublisherName':'Example Studio'}]}
  with patch.object(harvest,'fetch_json',return_value=payload):
   rows=list(harvest.xbox_gamepass({'markets':['US'],'platforms':['console']}))
  self.assertEqual(len(rows),1)
  self.assertEqual(rows[0]['ecosystem'],'xbox-gamepass')
  self.assertEqual(rows[0]['name'],'Example Game')
  self.assertEqual(rows[0]['category'],'game_catalog:console:US')
 def test_psn_store_uses_seeded_container_and_normalizes(self):
  payload={'id':'ABC123','name':'Example Add-on','provider_name':'Studio','game_contentType':'Add-Ons'}
  with patch.object(harvest,'fetch_json',return_value=payload):
   rows=list(harvest.psn_store({'seed_containers':['ABC123']}))
  self.assertEqual(rows[0]['ecosystem'],'psn-store')
  self.assertEqual(rows[0]['category'],'Add-Ons')
 def test_gaming_adapters_reject_invalid_scope_inputs(self):
  with self.assertRaisesRegex(harvest.HarvestError,'market code'):
   list(harvest.xbox_gamepass({'markets':['../'],'platforms':['console']}))
  with self.assertRaisesRegex(harvest.HarvestError,'container ID'):
   list(harvest.psn_store({'seed_containers':['../etc']}))


 def test_new_registry_classifications_and_adapter_boundaries(self):
  for key in ('openvsx','sublime-package-control','melpa','pypi-simple','dsh-plugins',
              'claude-plugins-dev','claude-plugin-hub','mcp-official','mcp-casdoor'):
   self.assertEqual(BY_ID[key]['api_status'],'live')
   self.assertIn(key,harvest.ADAPTERS)
  for key in ('acp-registry','botpress-plugins','tagada-plugins'):
   self.assertEqual(BY_ID[key]['api_status'],'live')
   self.assertNotIn(key,harvest.ADAPTERS)
 def test_openvsx_pagination_and_namespace_identifier(self):
  pages=[
   {'extensions':[{'namespace':'acme','name':'tool','displayName':'Acme Tool','downloadCount':25,'averageRating':4.5}],'totalSize':101},
   {'extensions':[{'namespace':'org','name':'extra'}],'totalSize':101},
  ]
  with patch.object(harvest,'fetch_json',side_effect=pages):
   rows=list(harvest.openvsx({}))
  self.assertEqual([r['plugin_id'] for r in rows],['acme.tool','org.extra'])
  self.assertEqual(rows[0]['downloads'],25)
 def test_sublime_and_melpa_normalization(self):
  sublime={'packages_cache':{'packages':[{'name':'Demo','authors':['Author'],'labels':['linting'],'releases':[{'version':'1.2','date':'2026-01-01'}]}]}}
  with patch.object(harvest,'fetch_json',return_value=sublime):
   row=next(harvest.sublime_package_control({}))
  self.assertEqual(row['version'],'1.2')
  with patch.object(harvest,'fetch_json',side_effect=[{'demo':[{'version':'2.0'}]},{'demo':123}]):
   row=next(harvest.melpa({}))
  self.assertEqual(row['downloads'],123)
 def test_pypi_semantic_filter(self):
  payload={'projects':[{'name':'demo-plugin'},{'name':'ordinary-package'},{'name':'pytest-demo'}]}
  with patch.object(harvest,'fetch_json',return_value=payload) as mocked:
   rows=list(harvest.pypi_simple({}))
  self.assertEqual([r['plugin_id'] for r in rows],['demo-plugin','pytest-demo'])
  self.assertEqual(mocked.call_args.kwargs['max_bytes'],100_000_000)
 def test_ai_and_mcp_normalization(self):
  dsh={'data':{'items':[{'id':'p1','name':'Plugin','full_name':'owner/plugin','stars':7}],'total':1}}
  with patch.object(harvest,'fetch_json',return_value=dsh):
   self.assertEqual(next(harvest.dsh_plugins({}))['rating'],7)
  claude={'results':[{'id':'c1','name':'Claude Plugin','stars':9}],'total':1}
  with patch.object(harvest,'fetch_json',return_value=claude):
   self.assertEqual(next(harvest.claude_plugins_dev({}))['plugin_id'],'c1')
  hub={'plugins':[{'slug':'hub-one','name':'Hub One','currentVersion':{'version':'1.0'}}],'totalPages':1}
  with patch.object(harvest,'fetch_json',return_value=hub):
   self.assertEqual(next(harvest.claude_plugin_hub({}))['version'],'1.0')
  mcp={'servers':[{'name':'io.example/server','title':'Example','version':'1.0'}]}
  with patch.object(harvest,'fetch_json',return_value=mcp):
   self.assertEqual(next(harvest.mcp_official({}))['category'],'mcp-server')
  with patch.object(harvest,'fetch_json',return_value=[{'id':'cas-one','name':'Casdoor Server','category':'database','endpoint':'https://mcp.example'}]):
   row=next(harvest.mcp_casdoor({}))
  self.assertEqual(row['url'],'https://mcp.casdoor.org')
 def test_steam_workshop_requires_key_and_normalizes(self):
  with patch.dict('os.environ',{},clear=True):
   with self.assertRaisesRegex(harvest.HarvestError,'STEAM_PUBLISHER_KEY'):
    list(harvest.steam_workshop({}))
  payload={'response':{'publishedfiledetails':[{'publishedfileid':'123','title':'Workshop Mod','creator':'42','subscriptions':88,'vote_data':{'score':0.95}}]}}
  with patch.dict('os.environ',{'STEAM_PUBLISHER_KEY':'test-key'},clear=True):
   with patch.object(harvest,'fetch_json',return_value=payload):
    row=next(harvest.steam_workshop({'appid':427520}))
  self.assertEqual(row['plugin_id'],'123')
  self.assertEqual(row['downloads'],88)


 def test_six_new_registry_entries_and_adapter_registration(self):
  expected=('joomla-vel','drupal-api','jenkins-update-center','grafana-catalog','agent-plugins-directory','reportportal-public')
  for key in expected:
   self.assertEqual(BY_ID[key]['api_status'],'live')
   self.assertIn(key,harvest.ADAPTERS)
  self.assertIn('security_advisory',BY_ID['joomla-vel']['verification'])
  self.assertIn('seed_driven',BY_ID['grafana-catalog']['verification'])

 def test_joomla_vel_maps_security_fields(self):
  payload={'success':True,'data':{'items':[{'id':7,'title':'Vulnerable Extension','patch_version':'2.0','cvss30_base_score':8.1,'risk level':'high','install_data':{'author':'Vendor'}}]}}
  with patch.object(harvest,'fetch_json',return_value=payload):
   row=next(harvest.ADAPTERS['joomla-vel']({}))
  self.assertEqual(row['plugin_id'],'7')
  self.assertEqual(row['version'],'2.0')
  self.assertEqual(row['rating'],8.1)
  self.assertEqual(row['author'],'Vendor')

 def test_drupal_api_paginates(self):
  pages=[{'list':[{'nid':1,'title':'Module','taxonomy_vocabulary_3':{'name':'Commerce'},'changed':'2026-01-01','uri':'https://drupal.org/project/module'}],'next':'?page=1'},
         {'list':[]}]
  with patch.object(harvest,'fetch_json',side_effect=pages):
   state={}
   row=next(harvest.ADAPTERS['drupal-api'](state))
  self.assertEqual(row['plugin_id'],'1')
  self.assertEqual(row['category'],'Commerce')
  self.assertEqual(state['page'],1)

 def test_jenkins_update_center_uses_first_version(self):
  payload={'plugins':{'demo':{'2.0':{'releaseTimestamp':'2026-01-01'},'1.0':{}}}}
  with patch.object(harvest,'fetch_json',return_value=payload) as mocked:
   row=next(harvest.ADAPTERS['jenkins-update-center']({}))
  self.assertEqual(row['version'],'2.0')
  self.assertEqual(row['category'],'jenkins-plugin')
  self.assertEqual(mocked.call_args.kwargs['max_bytes'],40_000_000)

 def test_grafana_requires_seed_and_normalizes(self):
  with patch.dict('os.environ',{},clear=True):
   with self.assertRaisesRegex(harvest.HarvestError,'provide state.slugs'):
    list(harvest.ADAPTERS['grafana-catalog']({}))
  payload={'name':'Demo Panel','orgName':'Grafana Labs','version':{'version':'1.2'},'downloads':99}
  with patch.object(harvest,'fetch_json',return_value=payload):
   row=next(harvest.ADAPTERS['grafana-catalog']({'slugs':['demo-panel']}))
  self.assertEqual(row['plugin_id'],'demo-panel')
  self.assertEqual(row['version'],'1.2')
  self.assertEqual(row['downloads'],99)

 def test_agent_plugins_directory_paged_api_and_reportportal(self):
  with patch.object(harvest,'_fetch_json_with_headers',return_value=({'plugins':[{'owner':'acme','name':'tool','version':'1.0'}]}, {'Link':''})):
   row=next(harvest.ADAPTERS['agent-plugins-directory']({}))
  self.assertEqual(row['plugin_id'],'acme/tool')
  payload=[{'id':'rp1','name':'ReportPortal Plugin','vendor':'Vendor','version':'3.0'}]
  with patch.object(harvest,'fetch_json',return_value=payload):
   row=next(harvest.ADAPTERS['reportportal-public']({}))
  self.assertEqual(row['plugin_id'],'rp1')
  self.assertEqual(row['author'],'Vendor')

if __name__=='__main__': unittest.main()
