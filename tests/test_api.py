"""Local integration tests. Create isolated users and delete only their exact IDs.
Run with the Java API active. No retained user records are modified.
"""
import http.cookiejar
import json
import pathlib
import secrets
import sqlite3
import unittest
import urllib.request
import urllib.error

ROOT=pathlib.Path(__file__).resolve().parents[1]
BASE='http://127.0.0.1:5088/api/'


class Client:
    def __init__(self):
        self.jar=http.cookiejar.CookieJar()
        self.http=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
    def post(self,path,data=None,headers=None):
        request=urllib.request.Request(BASE+path,json.dumps(data or {}).encode(),{'Content-Type':'application/json',**(headers or {})},method='POST')
        try:
            with self.http.open(request,timeout=30) as response:return response.status,json.load(response),response.headers
        except urllib.error.HTTPError as response:return response.code,json.load(response),response.headers


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.identities=[]
        cls.first=Client();cls.second=Client();cls.email='qa-'+secrets.token_hex(7)+'@example.test';cls.passwd=secrets.token_urlsafe(20)
        for client,email in [(cls.first,cls.email),(cls.second,'other-'+cls.email)]:
            status,result,headers=client.post('auth/register',{'email':email,'password':cls.passwd,'name':'Integration Reviewer'})
            if status!=200:raise RuntimeError(f'Register failed: {status}: {result}')
            cls.identities.append((result['user']['id'],email))
        status,result,_=cls.first.post('datasets/sample',{'kind':'retail'})
        if status!=200:raise RuntimeError(f'Sample failed: {result}')
        cls.dataset=result['dataset']
    @classmethod
    def tearDownClass(cls):
        with sqlite3.connect(ROOT/'api/data/detective.db') as connection:
            for user,email in cls.identities:
                for query in ['test_delete_datasets','test_delete_sessions','test_delete_user']:
                    connection.execute((ROOT/f'database/queries/{query}.sql').read_text(),{'user':user,'email':email})
        print('Cleanup: deleted only the two exact integration user IDs and their sessions/datasets.')
    def test_01_session_and_password_storage(self):
        status,result,_=self.first.post('auth/session')
        self.assertEqual(status,200);self.assertEqual(result['user']['email'],self.email)
        with sqlite3.connect(ROOT/'api/data/detective.db') as connection:
            connection.row_factory=sqlite3.Row
            row=connection.execute((ROOT/'database/queries/test_read_users.sql').read_text(),{'email':self.email}).fetchone()
            self.assertNotEqual(row['password_hash'],self.passwd)
            self.assertTrue(row['created_at'].endswith('+02:00'))
            self.assertEqual(len(row['salt']),24)
            session=connection.execute((ROOT/'database/queries/test_read_sessions.sql').read_text(),{'user':row['id']}).fetchone()
            self.assertTrue(session['expires_at'].endswith('+02:00'))
            self.assertNotIn(session['token_hash'],[c.value for c in self.first.jar])
    def test_02_duplicate_and_invalid_credentials(self):
        self.assertEqual(Client().post('auth/register',{'name':'Other','email':self.email,'password':self.passwd})[0],409)
        self.assertEqual(Client().post('auth/login',{'email':self.email,'password':'incorrect-password'})[0],401)
        self.assertEqual(Client().post('auth/register',{'name':'Other','email':'invalid','password':self.passwd})[0],400)
        self.assertEqual(Client().post('auth/register',{'name':'Other','email':'valid@example.test','password':'short'})[0],400)
    def test_03_login_cookie_logout_and_revocation(self):
        client=Client();status,result,headers=client.post('auth/login',{'email':self.email.upper(),'password':self.passwd})
        self.assertEqual(status,200)
        cookie=headers['Set-Cookie'];self.assertIn('HttpOnly',cookie);self.assertIn('SameSite=Strict',cookie)
        raw='; '.join(c.name+'='+c.value for c in client.jar)
        self.assertEqual(client.post('auth/logout')[0],200)
        self.assertEqual(client.post('auth/session')[0],401)
        self.assertEqual(Client().post('auth/session',headers={'Cookie':raw})[0],401)
    def test_04_ownership_and_missing_sessions(self):
        self.assertEqual(Client().post('datasets/list')[0],401)
        self.assertEqual(self.second.post('datasets/list')[1]['datasets'],[])
        for action in ['profile','rows','preview','export']:
            self.assertEqual(self.second.post('datasets/'+action,{'id':self.dataset['id']})[0],404)
    def test_05_samples_and_pagination(self):
        for kind,size in [('retail',1200),('subscriptions',850),('logistics',640)]:
            status,result,_=self.first.post('datasets/sample',{'kind':kind});self.assertEqual(status,200)
            status,profile,_=self.first.post('datasets/profile',{'id':result['dataset']['id']});self.assertEqual(status,200);self.assertEqual(profile['rows'],size)
        status,rows,_=self.first.post('datasets/rows',{'id':self.dataset['id'],'search':'Gauteng','page':2,'pageSize':10,'sort':'revenue','direction':'desc'})
        self.assertEqual(status,200);self.assertEqual(rows['page'],2);self.assertEqual(len(rows['rows']),10)
        self.assertTrue(all('Gauteng' in row for row in rows['rows']))
    def test_06_upload_preview_export_and_original(self):
        original='name,amount\n Alice ,2\nAlice,2\nBob,\n=SUM(A1),5\n'
        status,result,_=self.first.post('datasets/upload',{'name':'qa.csv','csv':original});self.assertEqual(status,200)
        id=result['dataset']['id'];options={'trim':True,'deduplicate':True,'fillMissing':True,'replacement':'0'}
        status,preview,_=self.first.post('datasets/preview',{'id':id,'options':options});self.assertEqual(status,200)
        self.assertEqual(preview['before']['rows'],4);self.assertEqual(preview['after']['rows'],3);self.assertEqual(preview['after']['quality'],100)
        status,export,_=self.first.post('datasets/export',{'id':id,'options':options});self.assertEqual(status,200)
        self.assertEqual(export['filename'],'qa-cleaned.csv');self.assertIn("'=SUM(A1),5",export['csv'])
        with sqlite3.connect(ROOT/'api/data/detective.db') as connection:
            row=connection.execute((ROOT/'database/queries/test_read_dataset.sql').read_text(),{'id':id,'user':self.identities[0][0]}).fetchone()
            self.assertEqual(row[0],original);self.assertTrue(row[1].endswith('+02:00'))
    def test_07_invalid_uploads_and_origin(self):
        for csv in ['a,a\n1,2','a,b\n1','a,b\n','a\n'+'x'*1_000_000]:
            self.assertEqual(self.first.post('datasets/upload',{'name':'invalid.csv','csv':csv})[0],400)
        self.assertEqual(self.first.post('datasets/sample',{'kind':'unknown'})[0],400)
        self.assertEqual(self.first.post('datasets/list',headers={'Origin':'https://untrusted.example'})[0],403)
    def test_08_post_only_and_json_only(self):
        try:urllib.request.urlopen(BASE+'auth/session')
        except urllib.error.HTTPError as response:self.assertEqual(response.code,405)
        self.assertEqual(self.first.post('datasets/list',headers={'Content-Type':'text/plain'})[0],415)

    def test_09_invalid_request_shapes(self):
        for body in [b'null',b'[]',b'{broken']:
            request=urllib.request.Request(BASE+'auth/login',body,{'Content-Type':'application/json'},method='POST')
            with self.assertRaises(urllib.error.HTTPError) as error:urllib.request.urlopen(request)
            self.assertEqual(error.exception.code,400)
        self.assertEqual(self.first.post('datasets/preview',{'id':self.dataset['id'],'options':['trim']})[0],400)


if __name__=='__main__':unittest.main(verbosity=2)
