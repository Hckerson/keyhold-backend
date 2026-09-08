import { BadRequestException, Injectable } from '@nestjs/common';
import { PlatformSettingRepo } from '@common/repos/platform-setting.repo';
import { EmailVerificationRepo } from '@common/repos/email-verification.repo';
import { PhoneVerificationRepo } from '@common/repos/phone-verification.repo';
import { SettingCategory } from '@generated/prisma/enums';
import { UpdateSettingsDto } from './dto';

export const SETTING_DEFAULTS: {
    key: string;
    value: string;
    category: SettingCategory;
}[] = [
    { key: 'platformName', value: '', category: SettingCategory.PLATFORM },
    { key: 'supportEmail', value: '', category: SettingCategory.PLATFORM },
    {
        key: 'reportingTimezone',
        value: 'America/New_York',
        category: SettingCategory.PLATFORM,
    },
    { key: 'baseCurrency', value: 'USD', category: SettingCategory.COMMERCE },
    { key: 'commissionRate', value: '2.5', category: SettingCategory.COMMERCE },
    { key: 'platformFee', value: '495', category: SettingCategory.COMMERCE },
    { key: 'escrowHoldDays', value: '3', category: SettingCategory.COMMERCE },
    {
        key: 'listingExpiryDays',
        value: '90',
        category: SettingCategory.MODERATION,
    },
    {
        key: 'maxPhotosPerListing',
        value: '24',
        category: SettingCategory.MODERATION,
    },
    {
        key: 'autoApproveThreshold',
        value: '0',
        category: SettingCategory.MODERATION,
    },
    {
        key: 'maintenanceMode',
        value: 'false',
        category: SettingCategory.AVAILABILITY,
    },
    {
        key: 'openSignups',
        value: 'true',
        category: SettingCategory.AVAILABILITY,
    },
    {
        key: 'photoScanning',
        value: 'true',
        category: SettingCategory.MODERATION,
    },
    {
        key: 'agentLicenseVerification',
        value: 'true',
        category: SettingCategory.MODERATION,
    },
    {
        key: 'manualReviewThreshold',
        value: 'true',
        category: SettingCategory.MODERATION,
    },
    {
        key: 'autoSuspendRepeatRejections',
        value: 'false',
        category: SettingCategory.MODERATION,
    },
    {
        key: 'dailyHealthDigest',
        value: 'true',
        category: SettingCategory.PLATFORM,
    },
    {
        key: 'payoutAutomation',
        value: 'false',
        category: SettingCategory.COMMERCE,
    },
];

@Injectable()
export class SettingsService {
    constructor(
        private settingRepo: PlatformSettingRepo,
        private emailVerificationRepo: EmailVerificationRepo,
        private phoneVerificationRepo: PhoneVerificationRepo,
    ) {}

    async findAll() {
        const stored = await this.settingRepo.findMany({
            include: {
                updatedBy: { select: { id: true, fullName: true, role: true } },
            },
        });
        const byKey = new Map(stored.map((setting) => [setting.key, setting]));

        return SETTING_DEFAULTS.map((fallback) => {
            const setting = byKey.get(fallback.key);
            return {
                key: fallback.key,
                value: setting?.value ?? fallback.value,
                category: setting?.category ?? fallback.category,
                updatedBy: setting?.updatedBy ?? null,
                updatedAt: setting?.updatedAt ?? null,
            };
        });
    }

    async findValue(key: string) {
        const setting = await this.settingRepo.findUnique({ where: { key } });
        if (setting) return setting.value;

        return (
            SETTING_DEFAULTS.find((fallback) => fallback.key === key)?.value ??
            null
        );
    }

    async update(updatedById: string, updateDto: UpdateSettingsDto) {
        const allowed = new Set(
            SETTING_DEFAULTS.map((fallback) => fallback.key),
        );
        const unknown = updateDto.settings.find(
            (setting) => !allowed.has(setting.key),
        );
        if (unknown) {
            throw new BadRequestException(
                `Unknown setting key: ${unknown.key}`,
            );
        }

        await Promise.all(
            updateDto.settings.map((setting) =>
                this.settingRepo.upsert({
                    where: { key: setting.key },
                    create: {
                        key: setting.key,
                        value: setting.value,
                        category: setting.category,
                        updatedById,
                    },
                    update: {
                        value: setting.value,
                        category: setting.category,
                        updatedById,
                    },
                }),
            ),
        );

        return this.findAll();
    }

    async restoreDefaults(updatedById: string) {
        await Promise.all(
            SETTING_DEFAULTS.map((fallback) =>
                this.settingRepo.upsert({
                    where: { key: fallback.key },
                    create: { ...fallback, updatedById },
                    update: {
                        value: fallback.value,
                        category: fallback.category,
                        updatedById,
                    },
                }),
            ),
        );

        return this.findAll();
    }

    async purgeExpiredVerifications() {
        const expiresAt = { lt: new Date() };

        const [email, phone] = await Promise.all([
            this.emailVerificationRepo.deleteMany({ where: { expiresAt } }),
            this.phoneVerificationRepo.deleteMany({ where: { expiresAt } }),
        ]);

        return { purged: email.count + phone.count };
    }
}
