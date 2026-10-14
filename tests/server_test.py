import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('serve', Path(__file__).resolve().parents[1] / 'scripts/serve.py')
serve = importlib.util.module_from_spec(spec)
spec.loader.exec_module(serve)


class RangeTests(unittest.TestCase):
    def test_requested_ranges(self):
        for value, expected in [('bytes=0-9', (0, 9)), ('bytes=90-', (90, 99)), ('bytes=-10', (90, 99)), ('bytes=90-200', (90, 99)), ('bytes=-200', (0, 99))]:
            with self.subTest(value=value):
                self.assertEqual(serve.parse_range(value, 100), expected)

    def test_invalid_ranges(self):
        for value in ['bytes=100-', 'bytes=10-5', 'bytes=-0', 'bytes=-', 'bytes=1-2,4-5', 'bad']:
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    serve.parse_range(value, 100)
        with self.assertRaises(ValueError):
            serve.parse_range('bytes=0-', 0)


if __name__ == '__main__':
    unittest.main()
