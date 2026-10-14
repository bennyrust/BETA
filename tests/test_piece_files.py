import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('files_server', Path(__file__).parents[1] / 'scripts/serve.py')
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)

class FileTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.catalog = self.root / 'pieces.json'
        self.catalog.write_text('[{"id":"one"},{"id":"two"}]')
        self.files = self.root / 'files'

    def save(self, name='image.png', piece='one', data=b'example', length=7):
        return server.store_piece_file(piece, name, io.BytesIO(data), length, self.files, self.catalog)

    def test_duplicate_names_and_piece_isolation(self):
        a, b = self.save(), self.save()
        c = self.save(piece='two')
        self.assertNotEqual(a['file'], b['file'])
        self.assertEqual((self.files / 'one' / a['file']).read_bytes(), b'example')
        self.assertEqual(len(json.loads((self.files / 'one/files.json').read_text())), 2)
        self.assertEqual(json.loads((self.files / 'two/files.json').read_text()), [c])

    def test_invalid_paths_and_sizes(self):
        for kwargs in [{'name':'../bad'}, {'name':'a\\b'}, {'piece':'../one'}, {'piece':'missing'}, {'length':0}, {'length':server.MAX_UPLOAD+1}]:
            with self.assertRaises(ValueError): self.save(**kwargs)

    def test_interrupted_upload_leaves_no_partial_file(self):
        with self.assertRaises(ValueError): self.save(length=10)
        self.assertEqual(list((self.files / 'one').iterdir()), [])

    def test_active_file_types_become_downloads(self):
        item = self.save(name='page.html')
        self.assertTrue(item['file'].endswith('.bin'))
        self.assertEqual(item['name'], 'page.html')

    def test_repository_folder_is_independent_of_piece_id(self):
        self.catalog.write_text('[{"id":"one","repositoryId":"Self Portraits"}]')
        item = self.save()
        self.assertEqual((self.files / 'Self Portraits' / item['file']).read_bytes(), b'example')
        self.assertFalse((self.files / 'one').exists())
        self.catalog.write_text('[{"id":"one","repositoryId":"../escape"}]')
        with self.assertRaises(ValueError): self.save()
