type AjvValidationError = {
	keyword?: string;
	params?: Record<string, unknown>;
};

export type MappedValidationError = {
	code: string;
	message: string;
};

function asObject(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

export function mapAjvValidationError(
	validation: unknown,
): MappedValidationError | undefined {
	if (!Array.isArray(validation)) return undefined;

	for (const item of validation) {
		const err = asObject(item) as AjvValidationError | undefined;
		if (!err) continue;

		if (err.keyword !== "required") continue;
		const params = asObject(err.params);
		const missingProperty = params?.missingProperty;
		if (missingProperty === "idempotency-key") {
			return {
				code: "MISSING_IDEMPOTENCY_KEY",
				message: "Idempotency-Key header is required",
			};
		}
	}

	return undefined;
}

