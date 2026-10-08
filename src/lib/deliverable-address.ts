import { RESERVED_MAIL_DOMAINS } from '@common/enums/domain';

const domainOf = (address: string): string =>
    address
        .slice(address.lastIndexOf('@') + 1)
        .trim()
        .toLowerCase();

export const isDeliverableAddress = (address: string): boolean => {
    const domain = domainOf(address);

    return !RESERVED_MAIL_DOMAINS.some(
        (reserved) => domain === reserved || domain.endsWith(`.${reserved}`),
    );
};
