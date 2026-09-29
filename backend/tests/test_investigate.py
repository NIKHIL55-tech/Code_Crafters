import os, requests
from dotenv import load_dotenv
load_dotenv('../.env')
api_key = os.environ.get('HINDSIGHT_API_KEY')
url = f'https://api.hindsight.vectorize.io/v1/banks/{os.environ.get("HINDSIGHT_BANK_ID")}'
headers={'Authorization': f'Bearer {api_key}'}
res=requests.get(url, headers=headers)
print('GET bank:', res.status_code, res.text)
res2=requests.post(url+'/retain', headers=headers, json={})
print('POST retain:', res2.status_code, res2.text)
