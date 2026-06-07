// Main Route
const express = require("express");
const router = express.Router();
const prisma = require('./lib/prismaClient');
//const fs = require('fs/promises');
const cloudinary = require('cloudinary').v2;

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

const processGenerateImage = async (jobId, sess) => {
	try {
		// take the job
		const job = await prisma.contents.findUnique({
			where: {
				id_sessionId: {
					id: jobId,
					sessionId: sess,
				},
			},
		});

		if (!job) {
			throw new Error("Job not found");
		}

		// update status -> generating
		await prisma.contents.update({
			where: {
				id_sessionId: {
					id: jobId,
					sessionId: sess,
				},
			},
			data: {
				status: 'generating',
			},
		});

		// generate image
		const imageBuffer = await generateImage(job.prompt);
		//await fs.writeFile('./testFileImg.png', imageBuffer);

		// update status -> uploading
		await prisma.contents.update({
			where: {
				id_sessionId: {
					id: jobId,
					sessionId: sess,
				},
			},
			data: {
				status: 'uploading',
			},
		});

		// upload cloudinary
		const uploaded = await uploadToCloudinary(imageBuffer);

		// success
		await prisma.contents.update({
			where: {
				id_sessionId: {
					id: jobId,
					sessionId: sess,
				},
			},
			data: {
				status: 'success',
				imageUrl: uploaded.secure_url,
			},
		});
	}
	catch (err) {
		//console.error(err);
		req.log.error(
			{ err, sessionId: sess },
			"Process generating image failed: " + err.message
		);

		await prisma.contents.update({
			where: {
				id_sessionId: {
					id: jobId,
					sessionId: sess,
				},
			},
			data: {
				status: 'failed',
				error: err.message,
			},
		});
	}
};
const generateImage = async (prompt) => {
	/*
		timeout protection
		response status validation
		valid image validation
		empty image validation
	*/
	const controller = new AbortController();
	const timeout = setTimeout(() => {
		controller.abort();
	}, 30000); // 30s

	try {
		const encodedPrompt = encodeURIComponent(prompt);
		// seed -1 for random rather than deterministic result
		const response = await fetch(
			`https://gen.pollinations.ai/image/${encodedPrompt}?model=flux&seed=-1`,
			{
				method: 'GET',
				headers: {
					Authorization: `Bearer ${process.env.POLLINATIONS_API_KEY}`
				},
				signal: controller.signal,
			}
		);

		if (!response.ok) {
			throw new Error("AI resp - failed");
		}

		// handle invalid image response
		const contentType = response.headers.get('content-type');
		if (!contentType?.startsWith('image/')) {
			throw new Error("AI resp - Invalid image response");
		}

		// handle empty image (size 0)
		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		if (!buffer.length) {
			throw new Error("AI resp - Empty image");
		}

		return buffer;
	}
	catch(err) {
		if (err.name === "AbortError") {
			throw new Error("AI proc - Request timeout");
		}
		throw err;
	}
	finally {
		clearTimeout(timeout);
	}
};
const uploadToCloudinary = async (imageBuffer) => {
	return new Promise((resolve, reject) => {
		const stream = cloudinary.uploader.upload_stream(
			{
				folder: 'ai-images',
				resource_type: 'image',
			},
			(error, result) => {
				if (error) {
					error.message = `Cloudinary upload - ${error.message}`;
					return reject(error);
				}

				resolve(result);
			}
		);

		stream.end(imageBuffer);
	});
};


// =============================================
// Restricted APIs - need session
// =============================================

// Generate image
router.post("/generate-image",
	validateInputs([
		body('prompt').isString().trim().isLength({ min: 1, max: 1000 }),
		body('style').isString().trim().isLength({ min: 1, max: 100 }),
	]),
	async (req, res) => {
	try {
		const data = {...req.body};
		/*const qualityTags = "highly detailed, cinematic composition, " +
			"anime key visual, soft lighting, vibrant colors, depth of field, " +
			"masterpiece, best quality";*/
		const qualityTags = "masterpiece, best quality, highly detailed, " +
			"cinematic lighting, depth of field, vibrant colors";
		const prompt = `
			${data.prompt}, anime style inspired by ${
				data.style}, ${qualityTags}
		`.trim();

		const job = await prisma.contents.create({
			data: {
				prompt,
				originalPrompt: data.prompt,
				style: data.style,
				status: 'queueing',
				sessionId: req.sessionId,
			},
		});

		// async background
		processGenerateImage(job.id, req.sessionId);

		// Request Accepted
		return res.status(202).json({
			jobId: job.id,
			status: job.status,
		});
	}
	catch(err) {
		req.log.error(
			{ err, sessionId: req.sessionId },
			"Spawn generating image failed: " + err.message
		);
		return res.status(500).json({ message: "Spawn generating image failed" });
	}
});


// Check status with polling from FE
// /statuscheck/jobId
router.get('/statuscheck/:jobId', async (req, res) => {
	try {
		const job = await prisma.contents.findUnique({
			where: {
				id_sessionId: {
					id: req.params.jobId,
					sessionId: req.sessionId,
				},
			},
			select: {
				id: true,
				status: true,
				imageUrl: true,
				error: true,
			},
		});

		if (!job) {
			throw new Error("Job not found");
		}

		return res.status(200).json(job);
	}
	catch (err) {
		req.log.error(
			{ err, sessionId: req.sessionId },
			"Status check failed: " + err.message
		);
		return res.status(500).json({ message: 'Status check failed' });
	}
});

// Get gallery data based on userSession (sessionId)
router.get('/gallery', async (req, res) => {
	try {
		const listImagesRaw = await prisma.contents.findMany({
			where: {
				sessionId: req.sessionId,
				status: 'success',
				imageUrl: {
					not: '',
				},
				NOT: {
					imageUrl: null,
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
			select: {
				id: true,
				originalPrompt: true,
				style: true,
				imageUrl: true,
				createdAt: true,
			},
		});
		const listImages = listImagesRaw.map((item) => ({
			id: item.id,
			prompt: item.originalPrompt,
			style: item.style,
			image: item.imageUrl,
			createdAt: item.createdAt,
		}));

		return res.status(200).json(listImages);
	}
	catch (err) {
		req.log.error(
			{ err, sessionId: req.sessionId },
			"Get gallery failed: " + err.message
		);
		return res.status(500).json({ message: 'Get gallery failed' });
	}
});

module.exports = router;