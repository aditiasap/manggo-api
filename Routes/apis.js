// Main Route
const express = require("express");
const router = express.Router();
const prisma = require('./lib/prismaClient');

// For input validator
const { body, validationResult } = require('express-validator');

// =============================================
// Function Calls
// =============================================

// Function call validate inputs
// sequential processing, stops running validations chain if the previous one fails.
const validateInputs = validations => {
	return async (req, res, next) => {
		for (let validation of validations) {
			const result = await validation.run(req);
			if (result.errors.length) break;
		}

		const errors = validationResult(req);
		if (errors.isEmpty()) {
			return next();
		}
		//console.log('error: ', errors);
		req.log.error(
			{ err: errors.array(), username: req.username },
			"Input validation failed"
		);
		res.status(400).json({ message: "invalid inputs" });
	};
};

// =============================================
// Test APIs
// =============================================

// ping app
router.get("/pingapp", (req, res) => {
	//req.log.info('apps is live..');
	res.send("apps is live..");
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

// Get gallery data based on userSession (sessionId)
// /gallery



// Generate image
// /generate



// Check status with polling from FE
// /statuscheck



module.exports = router;
