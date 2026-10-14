"""Local preview server with video byte ranges and uncached source files."""
import argparse
import os
import json
import math
import threading
import time
import uuid
from urllib.parse import unquote
from html.parser import HTMLParser
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from datetime import date
from pathlib import Path
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parents[1]
ORIENTATION_PATH = ROOT / 'pieces' / 'preview-orientations.json'
ORIENTATION_LOCK = threading.Lock()
PIECES_PATH = ROOT / 'pieces' / 'pieces.json'
PIECES_LOCK = threading.Lock()
EDITABLE_FIELDS = {'branchComplete', 'liveVersion', 'definition', 'name', 'description', 'documentation', 'sources', 'notes', 'status', 'createdAt'}


FILES_ROOT = ROOT / 'pieces'
FILES_LOCK = threading.Lock()
MAX_UPLOAD = 2 * 1024 ** 3
INLINE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.mp4', '.webm', '.mov', '.mp3', '.wav', '.ogg', '.glb', '.gltf', '.obj', '.stl', '.fbx', '.blend', '.usdz', '.pdf', '.zip'}


def store_piece_file(piece_id, filename, source, length, files_root=FILES_ROOT, pieces_path=PIECES_PATH):
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', piece_id) or piece_id not in {p['id'] for p in json.loads(pieces_path.read_text())}:
        raise ValueError('Unknown piece')
    if not filename or len(filename) > 240 or any(c in filename for c in '/\\\r\n\x00'):
        raise ValueError('Invalid filename')
    if not 0 < length <= MAX_UPLOAD:
        raise ValueError('Files must be between 1 byte and 2 GB')
    piece = next(p for p in json.loads(pieces_path.read_text()) if p['id'] == piece_id)
    repository = piece.get('repositoryId', piece_id)
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9 -]*', repository):
        raise ValueError('Invalid repository')
    directory = files_root / repository
    directory.mkdir(parents=True, exist_ok=True)
    extension = Path(filename).suffix.lower()
    stored = uuid.uuid4().hex + (extension if extension in INLINE_EXTENSIONS else '.bin')
    destination = directory / stored
    temporary = directory / (stored + '.part')
    try:
        with temporary.open('xb') as output:
            remaining = length
            while remaining:
                chunk = source.read(min(1024 * 1024, remaining))
                if not chunk:
                    raise ValueError('Upload interrupted')
                output.write(chunk)
                remaining -= len(chunk)
        item = {'name': filename, 'file': stored, 'size': length}
        with FILES_LOCK:
            manifest = directory / 'files.json'
            items = json.loads(manifest.read_text()) if manifest.exists() else []
            temporary.replace(destination)
            items.append(item)
            pending = directory / 'files.json.tmp'
            pending.write_text(json.dumps(items, indent=2) + '\n')
            pending.replace(manifest)
        return item
    except Exception:
        temporary.unlink(missing_ok=True)
        destination.unlink(missing_ok=True)
        raise


QUOTE_LOCK = threading.Lock()
QUOTE_CACHE = {'items': [], 'checked': 0, 'modified': ''}


class PostText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in ('br', 'p', 'div'):
            self.parts.append(' ')

    def handle_data(self, data):
        self.parts.append(data)


def post_excerpts(pages):
    items = []
    for page in pages:
        for post in page.get('threads', []):
            number = post.get('no')
            if type(number) is not int or not isinstance(post.get('com'), str):
                continue
            parser = PostText()
            parser.feed(post['com'])
            words = ' '.join(parser.parts).split()
            text = ' '.join(words[:24])[:180]
            if len(text) < 12:
                continue
            if len(words) > 24 or len(' '.join(words[:24])) > 180:
                text += '…'
            items.append({'no': number, 'text': text, 'url': f'https://boards.4chan.org/pol/thread/{number}#p{number}'})
    return items


def loading_posts():
    # Fixed upstream, shared ten-minute cache, conditional requests; never an open proxy.
    with QUOTE_LOCK:
        now = time.monotonic()
        if now - QUOTE_CACHE['checked'] < 600:
            return QUOTE_CACHE['items']
        QUOTE_CACHE['checked'] = now
        headers = {'User-Agent': 'RoomPreview/1.0'}
        if QUOTE_CACHE['modified']:
            headers['If-Modified-Since'] = QUOTE_CACHE['modified']
        try:
            request = Request('https://a.4cdn.org/pol/catalog.json', headers=headers)
            with urlopen(request, timeout=4) as response:
                items = post_excerpts(json.loads(response.read(4 * 1024 * 1024)))
                if items:
                    QUOTE_CACHE['items'] = items
                    QUOTE_CACHE['modified'] = response.headers.get('Last-Modified', '')
        except (OSError, ValueError, HTTPError) as error:
            print(f'Loading post feed unavailable: {error}')
        return QUOTE_CACHE['items']


class EditConflict(ValueError):
    pass


def save_piece(payload, path=PIECES_PATH):
    if not isinstance(payload, dict) or set(payload) != {'id', 'changes', 'base'}:
        raise ValueError('Expected piece ID, changes and original values')
    changes, base = payload['changes'], payload['base']
    if not isinstance(changes, dict) or not changes or not changes.keys() <= EDITABLE_FIELDS or not isinstance(base, dict):
        raise ValueError('Invalid editable fields')
    for key, value in changes.items():
        if key == 'branchComplete':
            if not isinstance(value, bool):
                raise ValueError('Branch completion must be a checkbox value')
            continue
        if not isinstance(value, str) or len(value) > 100000:
            raise ValueError('Text fields must be under 100,000 characters')
        if key == 'liveVersion' and (payload['id'] != 'can-tower' or value not in ('V1', 'V2', 'V3')):
            raise ValueError('Invalid Totem Pole version')
        if key == 'name' and (not value.strip() or len(value) > 200):
            raise ValueError('Object names must contain 1–200 characters')
        if key == 'status' and value not in ('Not started', 'Draft', 'Ready'):
            raise ValueError('Invalid status')
        if key == 'createdAt' and value:
            if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
                raise ValueError('Use YYYY-MM-DD for creation dates')
            date.fromisoformat(value)
    with PIECES_LOCK:
        records = json.loads(path.read_text())
        piece = next((p for p in records if p['id'] == payload['id']), None)
        if piece is None:
            raise ValueError('Unknown piece')
        for key in changes:
            current = piece.get(key, False if key == 'branchComplete' else 'Not started' if key == 'status' else '')
            if key not in base or current != base[key]:
                raise EditConflict('This field changed elsewhere. Copy your text, then reload before saving.')
        if 'name' in changes:
            piece.setdefault('sceneName', piece['name'])
        piece.update(changes)
        temporary = path.with_suffix('.tmp')
        temporary.write_text(json.dumps(records, indent=2) + '\n')
        temporary.replace(path)
    return piece


def save_orientation(payload, path=ORIENTATION_PATH):
    if not isinstance(payload, dict) or set(payload) != {'name', 'rotation'}:
        raise ValueError('Expected a piece name and rotation')
    name, rotation = payload['name'], payload['rotation']
    if not isinstance(name, str) or not isinstance(rotation, list) or len(rotation) != 3:
        raise ValueError('Expected three rotation angles')
    if any(type(v) not in (int, float) or not math.isfinite(v) or abs(v) > 100 * math.pi for v in rotation):
        raise ValueError('Rotation angles must be finite radians')
    with ORIENTATION_LOCK:
        values = json.loads(path.read_text())
        if name not in values:
            raise ValueError('Unknown object')
        values[name] = rotation
        temporary = path.with_suffix('.tmp')
        temporary.write_text(json.dumps(values, indent=2) + '\n')
        temporary.replace(path)
    return {'name': name, 'rotation': rotation}


def parse_range(value, size):
    match = re.fullmatch(r'bytes=(\d*)-(\d*)', value)
    if not match or not any(match.groups()) or size == 0:
        raise ValueError('Invalid byte range')
    start, end = match.groups()
    if not start:
        if int(end) <= 0:
            raise ValueError('Invalid suffix')
        return max(0, size - int(end)), size - 1
    start = int(start)
    end = min(int(end), size - 1) if end else size - 1
    if start >= size or end < start:
        raise ValueError('Unsatisfiable byte range')
    return start, end


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        if self.path.startswith('/pieces/') and Path(self.path).suffix.lower() not in {'.html', '.css', '.json', '.md', ''}:
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Content-Security-Policy', "sandbox; default-src 'none'")
            if self.path.endswith('.bin'):
                self.send_header('Content-Disposition', 'attachment')
        super().end_headers()

    def do_GET(self):
        if self.path == '/api/loading-text':
            body = json.dumps(loading_posts()).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            try:
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass
            return
        super().do_GET()

    def do_POST(self):
        match = re.fullmatch(r'/api/pieces/([a-z0-9-]+)/files', self.path)
        if not match:
            return self.send_error(404)
        host = self.headers.get('Host', '')
        if host not in {f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'} or self.headers.get('Origin') != f'http://{host}':
            return self.send_error(403, 'Upload using the local piece page')
        try:
            self.connection.settimeout(120)
            result = store_piece_file(match[1], unquote(self.headers.get('X-File-Name', '')), self.rfile, int(self.headers.get('Content-Length', '0')))
        except (ValueError, OSError) as error:
            self.close_connection = True
            return self.send_error(400, str(error))
        body = json.dumps(result).encode()
        self.send_response(201)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_PUT(self):
        # This local editor can write only the orientation catalog, from this origin.
        host = self.headers.get('Host', '')
        allowed = {f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'}
        if self.path not in ('/api/preview-orientations', '/api/pieces'):
            return self.send_error(404)
        if host not in allowed or self.headers.get('Origin') != f'http://{host}':
            return self.send_error(403, 'Use the editor on this local server')
        if self.headers.get('Content-Type') != 'application/json':
            return self.send_error(415)
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= (1500000 if self.path == '/api/pieces' else 4096):
                raise ValueError('Invalid request size')
            payload = json.loads(self.rfile.read(length))
            result = save_piece(payload) if self.path == '/api/pieces' else save_orientation(payload)
        except EditConflict as error:
            return self.send_error(409, str(error))
        except (ValueError, TypeError) as error:
            return self.send_error(400, str(error))
        except OSError:
            return self.send_error(500, 'Could not save orientation file')
        body = json.dumps(result).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_head(self):
        self.byte_range = None
        path = self.translate_path(self.path)
        if not self.headers.get('Range') or not os.path.isfile(path):
            return super().send_head()
        source = open(path, 'rb')
        size = os.fstat(source.fileno()).st_size
        try:
            start, end = parse_range(self.headers['Range'], size)
        except ValueError:
            source.close()
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{size}')
            self.send_header('Content-Length', '0')
            self.end_headers()
            return None
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.end_headers()
        source.seek(start)
        self.byte_range = (start, end)
        return source

    def copyfile(self, source, output):
        try:
            if self.byte_range is None:
                return super().copyfile(source, output)
            start, end = self.byte_range
            remaining = end - start + 1
            while remaining:
                chunk = source.read(min(256 * 1024, remaining))
                if not chunk:
                    break
                output.write(chunk)
                remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass  # Browsers routinely cancel a range when seeking or closing a tab.


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()
    with ThreadingHTTPServer(('127.0.0.1', args.port), Handler) as server:
        print(f'Room preview: http://127.0.0.1:{args.port}', flush=True)
        server.serve_forever()
