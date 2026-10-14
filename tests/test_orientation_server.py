import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor

spec = importlib.util.spec_from_file_location('server', Path(__file__).parents[1] / 'scripts/serve.py')
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)


class OrientationTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / 'poses.json'
        self.path.write_text(json.dumps({'A': [0, 0, 0], 'B': [0, 0, 0]}))

    def test_update_preserves_other_objects_and_persists(self):
        server.save_orientation({'name': 'A', 'rotation': [1, 2, 3]}, self.path)
        self.assertEqual(json.loads(self.path.read_text()), {'A': [1, 2, 3], 'B': [0, 0, 0]})

    def test_invalid_input_does_not_modify_file(self):
        before = self.path.read_text()
        for payload in [None, {}, {'name': '../bad', 'rotation': [0, 0, 0]},
                        {'name': 'A', 'rotation': [0, 0]}, {'name': 'A', 'rotation': [True, 0, 0]},
                        {'name': 'A', 'rotation': [float('nan'), 0, 0]},
                        {'name': 'A', 'rotation': [float('inf'), 0, 0]}]:
            with self.assertRaises(ValueError):
                server.save_orientation(payload, self.path)
            self.assertEqual(self.path.read_text(), before)

    def test_simultaneous_edits_keep_both_updates(self):
        with ThreadPoolExecutor() as pool:
            list(pool.map(lambda name: server.save_orientation({'name': name, 'rotation': [1, 0, 0]}, self.path), ['A', 'B']))
        self.assertEqual(json.loads(self.path.read_text()), {'A': [1, 0, 0], 'B': [1, 0, 0]})


class PieceTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / 'pieces.json'
        self.original = [{'id': 'sample', 'name': 'Sample', 'description': '', 'createdAt': '', 'assets': ['model.glb']}]
        self.path.write_text(json.dumps(self.original))

    def test_save_and_conflict(self):
        payload = {'id': 'sample', 'changes': {'description': 'Line one\nLine two', 'createdAt': '2024-02-29'}, 'base': {'description': '', 'createdAt': ''}}
        result = server.save_piece(payload, self.path)
        self.assertEqual(result['assets'], ['model.glb'])
        self.assertEqual(result['createdAt'], '2024-02-29')
        with self.assertRaises(server.EditConflict):
            server.save_piece(payload, self.path)
        server.save_piece({'id': 'sample', 'changes': {'status': 'Draft'}, 'base': {'status': 'Not started'}}, self.path)
        self.assertEqual(json.loads(self.path.read_text())[0]['description'], 'Line one\nLine two')

    def test_rename_preserves_scene_identity(self):
        result = server.save_piece({'id': 'sample', 'changes': {'name': 'New name'}, 'base': {'name': 'Sample'}}, self.path)
        self.assertEqual(result['sceneName'], 'Sample')
        result = server.save_piece({'id': 'sample', 'changes': {'name': 'Another'}, 'base': {'name': 'New name'}}, self.path)
        self.assertEqual(result['sceneName'], 'Sample')
        self.assertEqual(result['id'], 'sample')
        self.assertEqual(result['assets'], ['model.glb'])

    def test_invalid_edits_preserve_catalog(self):
        before = self.path.read_text()
        for changes in [{'name': '   '}, {'name': 'a' * 201}, {'sceneName': 'bad'}, {'assets': []}, {'createdAt': '2025-02-29'}, {'status': 'Oops'}, {'description': 4}]:
            with self.assertRaises(ValueError):
                server.save_piece({'id': 'sample', 'changes': changes, 'base': {}}, self.path)
            self.assertEqual(self.path.read_text(), before)


if __name__ == '__main__':
    unittest.main()


class LoadingTextTests(unittest.TestCase):
    def test_excerpts_are_short_plain_text_with_source(self):
        items = server.post_excerpts([{'threads': [{'no': 42, 'com': '<b>Hello &amp; welcome</b><br>to the board ' + 'word ' * 50}]}])
        self.assertEqual(len(items), 1)
        self.assertNotIn('<b>', items[0]['text'])
        self.assertIn('Hello & welcome', items[0]['text'])
        self.assertLessEqual(len(items[0]['text'].split()), 24)
        self.assertEqual(items[0]['url'], 'https://boards.4chan.org/pol/thread/42#p42')

    def test_empty_and_invalid_posts_are_ignored(self):
        self.assertEqual(server.post_excerpts([{'threads': [{'no': '42', 'com': 'invalid number'}, {'no': 1}, {'no': 2, 'com': ''}]}]), [])
