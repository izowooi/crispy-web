"""Python stdlib static server: loopback only, no COOP/COEP (the shipped SW supplies them)."""
import argparse
import functools
import http.server
import os
import socket
import webbrowser


class Handler(http.server.SimpleHTTPRequestHandler):
    # Explicit MIME overrides avoid OS/registry differences, particularly .js on Windows.
    extensions_map = dict(http.server.SimpleHTTPRequestHandler.extensions_map,
                          **{'.js': 'text/javascript', '.mjs': 'text/javascript',
                             '.wasm': 'application/wasm', '.bin': 'application/octet-stream'})


class Server(http.server.ThreadingHTTPServer):
    # Keep the same IndexedDB/save origin after Ctrl+C despite POSIX TIME_WAIT.
    allow_reuse_address = (os.name != 'nt')

    def server_bind(self):
        # Windows SO_REUSEADDR can otherwise bind twice to a running server.
        if hasattr(socket, 'SO_EXCLUSIVEADDRUSE'):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', required=True)
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--open', action='store_true')
    args = parser.parse_args()
    if not 0 <= args.port <= 65535:
        parser.error('port must be between 0 and 65535')
    # Bind before opening: an occupied port must never open someone else's server.
    try:
        server = Server(
            ('127.0.0.1', args.port), functools.partial(Handler, directory=args.directory))
    except OSError as error:
        parser.exit(1, 'localhost server could not start: {}\nClose the previous server or set SAM5_MAC_PORT.\n'.format(error))
    with server:
        url = 'http://localhost:{}/'.format(server.server_port)
        print(url, flush=True)
        if args.open:
            webbrowser.open(url)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    main()
