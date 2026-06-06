// Main Route
const express = require("express");
const router = express.Router();
const prisma = require('./lib/prismaClient');

const restrictedapis = require("./restrictedapis");

// =============================================
// Test APIs
// =============================================

// ping app
router.get("/pingapp", (req, res) => {
	//req.log.info('apps is live..');
	return res.send("apps is live..");
});

// Check app + db healthiness
router.get("/health", async (req, res) => {
	const health = {
		app: "ok",
		db: "unknown",
		timestamp: new Date().toISOString()
	};

	try {
		// test prisma only as abstraction layer
		await prisma.$queryRaw`SELECT 1`;
		health.db = "ok";

		return res.status(200).json(health);
	}
	catch (err) {
		health.db = "error";

		req.log.error(err, "Failed connecting to DB: " + err.message);
		return res.status(500).json({
			...health,
			error: "Database check failed"
		});
	}
});

// =============================================
// Business APIs
// =============================================

// Get sessionId (for new access)
router.get("/get-session", async (req, res) => {
	try {
		const newSession = await prisma.sessions.create({ data: {} });
		return res.status(200).json({
			sessId: newSession.id
		});
	}
	catch(err) {
		req.log.error(
			{ err },
			"Create session error: " + err.message
		);
		return res.status(500).json({ message: "Create session error" });
	}
});

// Session Checking.
router.use(async (req, res, next) => {
	try {
		// get header Auth with format Authorization: Bearer 64ea-2472-0390-b72a-799d-8275
		const authHeader = req.get("Authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return res.status(401).json({ message: "no session" });
		}
		const sessionId = authHeader.substring(7);
		const sessionData = await prisma.sessions.findUnique({
			where: { id: sessionId }
		});

		if (!sessionData) {
			return res.status(401).json({ message: "invalid session" });
		}

		req.sessionId = sessionId;
		next();
	}
	catch(err) {
		//console.log(err);
		req.log.error({ err }, err.message);
		return res.status(500).json({ message: "Check session error" });
	}
});

// Pass to restricted apis
router.use(restrictedapis);

module.exports = router;
