const express = require("express");
const app = express();
const cors = require('cors');
const path = require('path');
const pinoHttp = require('pino-http');
const { logger } = require('./Routes/lib/logger');
const cloudinary = require('cloudinary').v2;

const port = process.env.PORT || 1;
// Setting specific local host to allow only access from localhost
const node = {
	host: '127.0.0.1',
	port
};
const apis = require("./Routes/apis");

// to support parsing "JSON-encoded bodies" data with POST and PUT method
app.use(express.json());

// To handle cors
app.use(cors());

// Get xforwarded-for from proxy
app.set('trust proxy', true);

// inject Pino logger
app.use(pinoHttp({
	logger,
	serializers: {
		req(req) {
			return {
				method: req.method,
				url: req.url,
				ip: req.ip,
				forwardedFor: req.headers['x-forwarded-for'],
				protocol: req.protocol,
				host: req.headers['host'],
				userAgent: req.headers['user-agent'],
			};
		},
	},
}));

// cloudinary
cloudinary.config({
	secure: true,
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

// change temporary to /api
app.use("/api", apis);

app.listen(node.port, node.host, () => {
	console.log(`Server running at http://${node.host}:${node.port}/`);
});
