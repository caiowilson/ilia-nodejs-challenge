window.onload = function () {
	// Changeable Configuration Block
	window.ui = SwaggerUIBundle({
		dom_id: "#swagger-ui",
		deepLinking: true,
		presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
		plugins: [SwaggerUIBundle.plugins.DownloadUrl],
		layout: "StandaloneLayout",
		queryConfigEnabled: false,
		urls: [
			{ name: "users", url: "http://localhost:3002/openapi.json" },
			{ name: "wallet", url: "http://localhost:3001/openapi.json" },
		],
		showMutatedRequest: true,
		requestInterceptor: (request) => {
			try {
				const method =
					typeof request?.method === "string"
						? request.method.toUpperCase()
						: "";
				const url = typeof request?.url === "string" ? request.url : "";
				if (method !== "POST" || !url.includes("/v1/transactions")) {
					return request;
				}

				request.headers =
					request.headers && typeof request.headers === "object"
						? request.headers
						: {};
				const existingHeader =
					typeof request.headers["Idempotency-Key"] === "string"
						? request.headers["Idempotency-Key"]
						: typeof request.headers["idempotency-key"] === "string"
							? request.headers["idempotency-key"]
							: undefined;
				if (typeof existingHeader === "string" && existingHeader.trim() !== "") {
					return request;
				}

				const idempotencyKey =
					typeof globalThis.crypto?.randomUUID === "function"
						? globalThis.crypto.randomUUID()
						: `${Date.now()}-${Math.random().toString(16).slice(2)}`;
				request.headers["Idempotency-Key"] = idempotencyKey;
				return request;
			} catch {
				return request;
			}
		},
	});
};

