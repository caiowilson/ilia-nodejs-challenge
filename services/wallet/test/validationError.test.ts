import { describe, expect, it } from "bun:test";
import { mapAjvValidationError } from "../src/http/validationError";

describe("mapAjvValidationError", () => {
	it("maps missing idempotency key header to a stable error", () => {
		const mapped = mapAjvValidationError([
			{
				keyword: "required",
				params: { missingProperty: "idempotency-key" },
			},
		]);

		expect(mapped).toEqual({
			code: "MISSING_IDEMPOTENCY_KEY",
			message: "Idempotency-Key header is required",
		});
	});

	it("returns undefined for unrelated validation errors", () => {
		expect(
			mapAjvValidationError([
				{ keyword: "type", params: { type: "integer" } },
			]),
		).toBeUndefined();
	});
});

