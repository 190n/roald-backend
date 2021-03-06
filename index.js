const http = require('http'),
	redis = require('redis'),
	WebSocket = require('ws');

const allowedOrigins = ['https://190n.github.io', 'http://localhost:5000'];

const client = redis.createClient(),
	wss = new WebSocket.Server({ noServer: true }),
	server = http.createServer((req, res) => {
		if (req.url == '/backflip') {
			switch (req.method) {
			case 'POST':
				if (allowedOrigins.includes(req.headers.origin)) {
					res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
					client.incr('roalds', (err, result) => {
						if (err) {
							res.statusCode = 500;
							res.end(`error: ${err}`);
						} else {
							res.statusCode = 204;
							for (const ws of wss.clients) {
								ws.send(result);
							}
							res.end();
						}
					});
				} else {
					res.statusCode = 403;
					res.end('Disallowed origin');
				}
				break;
			case 'OPTIONS':
				res.statusCode = 204;
				if (allowedOrigins.includes(req.headers.origin)) {
					res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
					res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
					res.setHeader('Access-Control-Max-Age', 86400);
				}
				res.end();
				break;
			default:
				res.statusCode = 405;
				res.end('Send a POST or OPTIONS request');
			}
		} else {
			res.statusCode = 404;
			res.end(`Cannot ${req.method} ${req.url}`);
		}
	});

server.on('upgrade', (req, sock, head) => {
	if (req.url.startsWith('/connect')) {
		wss.handleUpgrade(req, sock, head, ws => {
			client.get('roalds', (err, result) => {
				if (!err) {
					ws.send(result === null ? '0' : result);
				}
			});
		});
	} else {
		sock.destroy();
	}
});

server.listen(7000, () => console.log('Listening on port 7000'));
