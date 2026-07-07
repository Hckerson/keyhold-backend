import { Injectable } from '@nestjs/common';
import { Prisma, DisputeEvidenceType } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { BaseRepository } from './base.repository';

/**
 * Repository for DisputeEvidence model operations
 * Handles all database operations related to dispute evidence with centralized error handling
 */
@Injectable()
export class DisputeEvidenceRepository extends BaseRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	/**
	 * Create a new dispute evidence record
	 * @param params - Prisma create parameters with type safety
	 * @returns Created DisputeEvidence with specified payload
	 */
	async create<T extends Prisma.DisputeEvidenceCreateArgs>(
		params: T,
	): Promise<Prisma.DisputeEvidenceGetPayload<T>> {
		return this.executeAsync(
			() =>
				this.prisma.disputeEvidence.create(params) as Promise<
					Prisma.DisputeEvidenceGetPayload<T>
				>,
			'Failed to create dispute evidence',
		);
	}

	/**
	 * Find a single dispute evidence by ID
	 * @param id - The evidence ID
	 * @param include - Optional Prisma include relations
	 * @returns DisputeEvidence or null if not found
	 */
	async findById<T extends Prisma.DisputeEvidenceFindUniqueArgs>(
		params: T,
	): Promise<Prisma.DisputeEvidenceGetPayload<T> | null> {
		return this.executeAsync(
			() =>
				this.prisma.disputeEvidence.findUnique(params) as Promise<
					Prisma.DisputeEvidenceGetPayload<T> | null
				>,
			'Failed to find dispute evidence by ID',
		);
	}

	/**
	 * Find all evidence records for a specific dispute
	 * @param params - Prisma find many parameters with dispute filter
	 * @returns Array of DisputeEvidence records
	 */
	async findByDisputeId<T extends Prisma.DisputeEvidenceFindManyArgs>(
		params: T,
	): Promise<Prisma.DisputeEvidenceGetPayload<T>[]> {
		return this.executeAsync(
			() =>
				this.prisma.disputeEvidence.findMany(params) as Promise<
					Prisma.DisputeEvidenceGetPayload<T>[]
				>,
			'Failed to find evidence records for dispute',
		);
	}

	/**
	 * Find all evidence records with pagination and filtering
	 * @param params - Prisma find many parameters
	 * @returns Array of DisputeEvidence records
	 */
	async findMany<T extends Prisma.DisputeEvidenceFindManyArgs>(
		params: T,
	): Promise<Prisma.DisputeEvidenceGetPayload<T>[]> {
		return this.executeAsync(
			() =>
				this.prisma.disputeEvidence.findMany(params) as Promise<
					Prisma.DisputeEvidenceGetPayload<T>[]
				>,
			'Failed to find dispute evidence records',
		);
	}

	/**
	 * Update dispute evidence by ID
	 * @param params - Prisma update parameters
	 * @returns Updated DisputeEvidence
	 */
	async update<T extends Prisma.DisputeEvidenceUpdateArgs>(
		params: T,
	): Promise<Prisma.DisputeEvidenceGetPayload<T>> {
		return this.executeAsync(
			() =>
				this.prisma.disputeEvidence.update(params) as Promise<
					Prisma.DisputeEvidenceGetPayload<T>
				>,
			'Failed to update dispute evidence',
		);
	}

	/**
	 * Delete a dispute evidence record by ID
	 * @param params - Prisma delete parameters
	 * @returns Deleted DisputeEvidence
	 */
	async delete<T extends Prisma.DisputeEvidenceDeleteArgs>(
		params: T,
	): Promise<Prisma.DisputeEvidenceGetPayload<T>> {
		return this.executeAsync(
			() =>
				this.prisma.disputeEvidence.delete(params) as Promise<
					Prisma.DisputeEvidenceGetPayload<T>
				>,
			'Failed to delete dispute evidence',
		);
	}

	/**
	 * Delete multiple evidence records by dispute ID
	 * @param disputeId - The dispute ID
	 * @returns BatchPayload with count of deleted records
	 */
	async deleteByDisputeId(disputeId: string): Promise<Prisma.BatchPayload> {
		return this.executeAsync(
			() =>
				this.prisma.disputeEvidence.deleteMany({
					where: { disputeId },
				}),
			'Failed to delete evidence records for dispute',
		);
	}

	/**
	 * Count evidence records for a specific dispute
	 * @param disputeId - The dispute ID
	 * @returns Number of evidence records
	 */
	async countByDisputeId(disputeId: string): Promise<number> {
		return this.executeAsync(
			() =>
				this.prisma.disputeEvidence.count({
					where: { disputeId },
				}),
			'Failed to count evidence records for dispute',
		);
	}

	/**
	 * Count all evidence records matching criteria
	 * @param params - Prisma count parameters
	 * @returns Count of matching records
	 */
	async count<T extends Prisma.DisputeEvidenceCountArgs>(
		params: T,
	): Promise<number> {
		return this.executeAsync(
			() => this.prisma.disputeEvidence.count(params) as Promise<number>,
			'Failed to count dispute evidence records',
		);
	}

	/**
	 * Find evidence records by type within a dispute
	 * @param disputeId - The dispute ID
	 * @param type - The evidence type to filter by
	 * @returns Array of evidence records of specified type
	 */
	async findByType(
		disputeId: string,
		type: DisputeEvidenceType,
	): Promise<Prisma.DisputeEvidenceGetPayload<{ include: {} }>[]> {
		return this.executeAsync(
			() =>
				this.prisma.disputeEvidence.findMany({
					where: {
						disputeId,
						type,
					},
				}) as Promise<
					Prisma.DisputeEvidenceGetPayload<{ include: {} }>[]
				>,
			'Failed to find evidence records by type',
		);
	}

	/**
	 * Get statistics about evidence in a dispute
	 * @param disputeId - The dispute ID
	 * @returns Object containing evidence statistics
	 */
	async getEvidenceStats(disputeId: string): Promise<{
		total: number;
		messageCount: number;
		photoCount: number;
		documentCount: number;
	}> {
		return this.executeAsync(
			async () => {
				const [total, messageCount, photoCount, documentCount] =
					await Promise.all([
						this.prisma.disputeEvidence.count({
							where: { disputeId },
						}),
						this.prisma.disputeEvidence.count({
							where: {
								disputeId,
								type: DisputeEvidenceType.MESSAGE,
							},
						}),
						this.prisma.disputeEvidence.count({
							where: {
								disputeId,
								type: DisputeEvidenceType.PHOTO,
							},
						}),
						this.prisma.disputeEvidence.count({
							where: {
								disputeId,
								type: DisputeEvidenceType.DOCUMENT,
							},
						}),
					]);

				return {
					total,
					messageCount,
					photoCount,
					documentCount,
				};
			},
			'Failed to get evidence statistics',
		);
	}

	/**
	 * Find the most recent evidence records for a dispute
	 * @param disputeId - The dispute ID
	 * @param limit - Maximum number of records to return (default: 10)
	 * @returns Array of recent evidence records ordered by creation date
	 */
	async findRecent(
		disputeId: string,
		limit: number = 10,
	): Promise<Prisma.DisputeEvidenceGetPayload<{ include: {} }>[]> {
		return this.executeAsync(
			() =>
				this.prisma.disputeEvidence.findMany({
					where: { disputeId },
					orderBy: { createdAt: 'desc' },
					take: limit,
				}) as Promise<
					Prisma.DisputeEvidenceGetPayload<{ include: {} }>[]
				>,
			'Failed to find recent evidence records',
		);
	}

	/**
	 * Find the oldest evidence records for a dispute (for chronological review)
	 * @param disputeId - The dispute ID
	 * @param limit - Maximum number of records to return (default: 10)
	 * @returns Array of oldest evidence records ordered by creation date
	 */
	async findOldest(
		disputeId: string,
		limit: number = 10,
	): Promise<Prisma.DisputeEvidenceGetPayload<{ include: {} }>[]> {
		return this.executeAsync(
			() =>
				this.prisma.disputeEvidence.findMany({
					where: { disputeId },
					orderBy: { createdAt: 'asc' },
					take: limit,
				}) as Promise<
					Prisma.DisputeEvidenceGetPayload<{ include: {} }>[]
				>,
			'Failed to find oldest evidence records',
		);
	}

	/**
	 * Check if evidence exists for a dispute
	 * @param id - The evidence ID
	 * @returns True if evidence exists, false otherwise
	 */
	async exists(id: string): Promise<boolean> {
		const count = await this.executeAsync(
			() =>
				this.prisma.disputeEvidence.count({
					where: { id },
				}),
			'Failed to check evidence existence',
		);
		return count > 0;
	}

	/**
	 * Batch update multiple evidence records
	 * @param params - Prisma update many parameters
	 * @returns BatchPayload with count of updated records
	 */
	async updateMany<T extends Prisma.DisputeEvidenceUpdateManyArgs>(
		params: T,
	): Promise<Prisma.BatchPayload> {
		return this.executeAsync(
			() => this.prisma.disputeEvidence.updateMany(params),
			'Failed to update multiple evidence records',
		);
	}

	/**
	 * Batch delete evidence records
	 * @param params - Prisma delete many parameters
	 * @returns BatchPayload with count of deleted records
	 */
	async deleteMany<T extends Prisma.DisputeEvidenceDeleteManyArgs>(
		params: T,
	): Promise<Prisma.BatchPayload> {
		return this.executeAsync(
			() => this.prisma.disputeEvidence.deleteMany(params),
			'Failed to delete multiple evidence records',
		);
	}

	/**
	 * Find and count evidence records (pagination helper)
	 * @param params - Prisma find many parameters with where, skip, take
	 * @returns Object containing data array and total count
	 */
	async findAndCount<T extends Prisma.DisputeEvidenceFindManyArgs>(
		params: T,
	): Promise<{
		data: Prisma.DisputeEvidenceGetPayload<T>[];
		total: number;
	}> {
		return this.executeAsync(
			async () => {
				const [data, total] = await Promise.all([
					this.prisma.disputeEvidence.findMany(params) as Promise<
						Prisma.DisputeEvidenceGetPayload<T>[]
					>,
					this.prisma.disputeEvidence.count({
						where: params.where,
					}),
				]);
				return { data, total };
			},
			'Failed to find and count evidence records',
		);
	}

	/**
	 * Create multiple evidence records in a transaction
	 * @param data - Array of evidence records to create
	 * @returns Array of created DisputeEvidence records
	 */
	async createMany(
		data: Prisma.DisputeEvidenceCreateInput[],
	): Promise<Prisma.DisputeEvidenceGetPayload<{ include: {} }>[]> {
		return this.executeAsync(
			async () => {
				const results: Prisma.DisputeEvidenceGetPayload<{
					include: {};
				}>[] = [];
				for (const item of data) {
					const result = await this.prisma.disputeEvidence.create({
						data: item,
					});
					results.push(result);
				}
				return results;
			},
			'Failed to create multiple evidence records',
		);
	}

	/**
	 * Find evidence by content search (partial match)
	 * @param disputeId - The dispute ID
	 * @param searchTerm - Term to search in content
	 * @returns Array of matching evidence records
	 */
	async searchByContent(
		disputeId: string,
		searchTerm: string,
	): Promise<Prisma.DisputeEvidenceGetPayload<{ include: {} }>[]> {
		return this.executeAsync(
			() =>
				this.prisma.disputeEvidence.findMany({
					where: {
						disputeId,
						content: {
							contains: searchTerm,
							mode: 'insensitive' as Prisma.QueryMode,
						},
					},
					orderBy: { createdAt: 'desc' },
				}) as Promise<
					Prisma.DisputeEvidenceGetPayload<{ include: {} }>[]
				>,
			'Failed to search evidence by content',
		);
	}

	/**
	 * Find evidence by label search (partial match)
	 * @param disputeId - The dispute ID
	 * @param searchTerm - Term to search in label
	 * @returns Array of matching evidence records
	 */
	async searchByLabel(
		disputeId: string,
		searchTerm: string,
	): Promise<Prisma.DisputeEvidenceGetPayload<{ include: {} }>[]> {
		return this.executeAsync(
			() =>
				this.prisma.disputeEvidence.findMany({
					where: {
						disputeId,
						label: {
							contains: searchTerm,
							mode: 'insensitive' as Prisma.QueryMode,
						},
					},
					orderBy: { createdAt: 'desc' },
				}) as Promise<
					Prisma.DisputeEvidenceGetPayload<{ include: {} }>[]
				>,
			'Failed to search evidence by label',
		);
	}
}
