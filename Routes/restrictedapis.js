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

const generateImage = async (prompt) => {
	const controller = new AbortController();
	const timeout = setTimeout(() => {
		controller.abort();
	}, 30000); // 30s

	try {
		const encodedPrompt = encodeURIComponent(prompt);

		const response = await fetch(
			`https://image.pollinations.ai/prompt/${encodedPrompt}`,
			{
				method: 'GET',
				signal: controller.signal,
			}
		);

		if (!response.ok) {
			throw new Error("Pollinations failed");
		}

		const buffer = Buffer.from(await response.arrayBuffer());
		return buffer;
	}
	catch(err) {
		if (err.name === "AbortError") {
			throw new Error("Request timeout");
		}
		throw err;
	}
	finally {
		clearTimeout(timeout);
	}
};

// =============================================
// Restricted APIs - need session
// =============================================

// Generate image
router.post("/generate-image",
	validateInputs([
		body('prompt').isString().trim().isLength({ min: 1 }),
		body('style').isString().trim().isLength({ min: 1 }),
	]),
	async (req, res) => {
	try {
		const data = {...req.body};
		const job = await prisma.contents.create({
			data: {
				data.prompt,
				data.style,
				enhancedPrompt: '',
				status: 'queueing',
			},
		});

		// trigger async process (fire & forget)
		generateImage(job.id).catch(console.error);

		// Request Accepted
		return res.status(202).json({
			jobId: job.id,
			status: job.status,
		});
	}
	catch(err) {
		req.log.error(
			{ err, sessionId: req.sessionId },
			"Generate image error: " + err.message
		);
		return res.status(500).json({ message: "Generate image error" });
	}
});


// Check status with polling from FE
// /statuscheck


// Get gallery data based on userSession (sessionId)
// /gallery


module.exports = router;
