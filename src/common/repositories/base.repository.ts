import { HttpStatus } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { RepoError } from '@common/errors/repo.error';

/**
 * Abstract base repository with centralized error handling
 * Maps Prisma error codes to appropriate HTTP status codes
 * Provides a reusable async wrapper for database operations
 */
export abstract class BaseRepository {
	/**
	 * Handles Prisma errors and converts them to RepoError with proper HTTP status codes
	 * Error code mappings:
	 * - P2002: Unique constraint violation → CONFLICT (409)
	 * - P2025: Record not found → NOT_FOUND (404)
	 * - P2003: Foreign key constraint → BAD_REQUEST (400)
	 * - P2014: Required relation violation → BAD_REQUEST (400)
	 * - Default: INTERNAL_SERVER_ERROR (500)
	 *
	 * @param message - Custom error message
	 * @param error - The error thrown by Prisma
	 * @throws RepoError with appropriate HTTP status code
	 */
	protected handleError(message: string, error: unknown): never {
		const prismaError = error;

		if (
			typeof prismaError === 'object' &&
			prismaError !== null &&
			'code' in prismaError
		) {
			const code = (prismaError as { code: string }).code;

			switch (code) {
				case 'P2002': {
					// Unique constraint violation
					throw new RepoError(
						`${message}: Duplicate entry detected`,
						error,
						HttpStatus.CONFLICT,
					);
				}
				case 'P2025': {
					// Record not found
					throw new RepoError(
						`${message}: Record not found`,
						error,
						HttpStatus.NOT_FOUND,
					);
				}
				case 'P2003': {
					// Foreign key constraint violation
					throw new RepoError(
						`${message}: Foreign key constraint violation`,
						error,
						HttpStatus.BAD_REQUEST,
					);
				}
				case 'P2014': {
					// Required relation violation
					throw new RepoError(
						`${message}: Required relation violation`,
						error,
						HttpStatus.BAD_REQUEST,
					);
				}
				default: {
					throw new RepoError(
						`${message}: Database operation failed`,
						error,
						HttpStatus.INTERNAL_SERVER_ERROR,
					);
				}
			}
		}

		throw new RepoError(
			`${message}: Unknown database error`,
			error,
			HttpStatus.INTERNAL_SERVER_ERROR,
		);
	}

	/**
	 * Generic async wrapper for Prisma operations with error handling
	 * Wraps database operations and automatically maps Prisma errors to HTTP exceptions
	 *
	 * @param operation - Async function performing the database operation
	 * @param errorMessage - Message to include if the operation fails
	 * @returns Promise resolving to the operation result
	 * @throws RepoError with appropriate HTTP status code
	 *
	 * @example
	 * ```
	 * const user = await this.executeAsync(
	 *   () => this.prisma.user.findUnique({ where: { id } }),
	 *   'Failed to find user'
	 * );
	 * ```
	 */
	protected async executeAsync<T>(
		operation: () => Promise<T>,
		errorMessage: string,
	): Promise<T> {
		try {
			return await operation();
		} catch (error) {
			this.handleError(errorMessage, error);
		}
	}
}
