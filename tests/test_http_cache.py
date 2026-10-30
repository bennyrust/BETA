import importlib.util
import http.client
import tempfile
import threading
import unittest
from pathlib import Path

spec=importlib.util.spec_from_file_location('preview',Path(__file__).resolve().parents[1]/'scripts/serve.py')
preview=importlib.util.module_from_spec(spec)
spec.loader.exec_module(preview)

class CacheTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        (self.root/'index.html').write_text('hello')
        (self.root/'asset.glb').write_bytes(b'0123456789')
        previous=preview.ROOT
        preview.ROOT=self.root
        self.addCleanup(setattr,preview,'ROOT',previous)
        class Quiet(preview.Handler):
            def log_message(self,*args):pass
        self.server=preview.ThreadingHTTPServer(('127.0.0.1',0),Quiet)
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True)
        self.thread.start()
        self.addCleanup(self.stop)
    def stop(self):
        self.server.shutdown();self.server.server_close();self.thread.join()
    def request(self,path='/asset.glb',headers=None,method='GET'):
        conn=http.client.HTTPConnection('127.0.0.1',self.server.server_port)
        conn.request(method,path,headers=headers or {})
        response=conn.getresponse()
        result=response.status,dict(response.getheaders()),response.read()
        conn.close();return result
    def test_reuse_and_same_size_edit(self):
        status,headers,body=self.request()
        self.assertEqual((status,body),(200,b'0123456789'))
        self.assertEqual(headers['Cache-Control'],'public, no-cache')
        status,_,body=self.request(headers={'If-None-Match':headers['ETag']})
        self.assertEqual((status,body),(304,b''))
        (self.root/'asset.glb').write_bytes(b'abcdefghij')
        status,updated,body=self.request(headers={'If-None-Match':headers['ETag'],'If-Modified-Since':headers['Last-Modified']})
        self.assertEqual((status,body),(200,b'abcdefghij'))
        self.assertNotEqual(headers['ETag'],updated['ETag'])
    def test_video_range_and_if_range(self):
        _,headers,_=self.request()
        status,partial,body=self.request(headers={'Range':'bytes=2-5','If-Range':headers['ETag']})
        self.assertEqual((status,body),(206,b'2345'))
        self.assertEqual(partial['Content-Range'],'bytes 2-5/10')
        self.assertEqual(partial['ETag'],headers['ETag'])
        status,_,body=self.request(headers={'Range':'bytes=2-5','If-Range':'"old"'})
        self.assertEqual((status,body),(200,b'0123456789'))
        status,headers,_=self.request(headers={'Range':'bytes=20-'})
        self.assertEqual(status,416);self.assertEqual(headers['Cache-Control'],'no-store')
    def test_index_head_and_errors(self):
        status,headers,body=self.request('/')
        self.assertEqual((status,body),(200,b'hello'))
        status,_,body=self.request('/',{'If-None-Match':headers['ETag']})
        self.assertEqual((status,body),(304,b''))
        status,headers,body=self.request(method='HEAD')
        self.assertEqual((status,body),(200,b''));self.assertEqual(headers['Content-Length'],'10')
        status,headers,_=self.request('/missing.glb')
        self.assertEqual(status,404);self.assertEqual(headers['Cache-Control'],'no-store')
    def test_date_and_weak_etag(self):
        _,headers,_=self.request()
        self.assertEqual(self.request(headers={'If-Modified-Since':headers['Last-Modified']})[0],304)
        self.assertEqual(self.request(headers={'If-None-Match':'W/'+headers['ETag']})[0],304)
        self.assertEqual(self.request(headers={'If-None-Match':'"stale"','If-Modified-Since':headers['Last-Modified']})[0],200)

if __name__=='__main__':unittest.main()
