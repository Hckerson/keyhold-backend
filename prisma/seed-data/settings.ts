import { SettingCategory } from '../../generated/prisma/client';

export const PLATFORM_SETTINGS: readonly {
    key: string;
    value: string;
    category: SettingCategory;
}[] = [
    {
        key: 'platformName',
        value: 'Horizon Grove',
        category: SettingCategory.PLATFORM,
    },
    {
        key: 'supportEmail',
        value: 'support@horizongrove.local',
        category: SettingCategory.PLATFORM,
    },
    {
        key: 'baseCurrency',
        value: 'USD',
        category: SettingCategory.PLATFORM,
    },
    {
        key: 'commissionRate',
        value: '2.5',
        category: SettingCategory.COMMERCE,
    },
    {
        key: 'platformFee',
        value: '495',
        category: SettingCategory.COMMERCE,
    },
    {
        key: 'listingExpiryDays',
        value: '90',
        category: SettingCategory.COMMERCE,
    },
    {
        key: 'escrowHoldDays',
        value: '10',
        category: SettingCategory.COMMERCE,
    },
    {
        key: 'maxPhotosPerListing',
        value: '24',
        category: SettingCategory.MODERATION,
    },
    {
        key: 'autoApproveThreshold',
        value: '85',
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
        key: 'reportingTimezone',
        value: 'America/Los_Angeles',
        category: SettingCategory.PLATFORM,
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

export const SETTING_KEYS: readonly string[] = PLATFORM_SETTINGS.map(
    (setting) => setting.key,
);
