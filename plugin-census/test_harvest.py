import unittest
from unittest.mock import patch
import harvest
from registry import CATALOG,BY_ID
class CensusTests(unittest.TestCase):
 def test_registry_has_31_unique_entries(self):
  self.assertEqual(len(CATALOG),31); self.assertEqual(len(BY_ID),31)
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
if __name__=='__main__': unittest.main()
