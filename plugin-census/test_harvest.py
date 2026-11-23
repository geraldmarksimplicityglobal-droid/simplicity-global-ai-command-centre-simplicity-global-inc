import unittest
from unittest.mock import patch
import harvest
from registry import CATALOG,BY_ID
class CensusTests(unittest.TestCase):
 def test_registry_has_31_unique_entries(self):
  self.assertEqual(len(CATALOG),36); self.assertEqual(len(BY_ID),36)
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

if __name__=='__main__': unittest.main()
