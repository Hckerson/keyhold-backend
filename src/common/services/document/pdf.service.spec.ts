import { PDFService } from './pdf.service';

const AGREEMENT = {
    buyerName: 'Ada Vance',
    buyerEmail: 'ada@example.com',
    sellerName: 'Marta Vance',
    sellerEmail: 'marta@example.com',
    propertyTitle: 'Cypress Point',
    propertyAddress: '18 Cypress Point',
    purchasePrice: 1_150_000,
    terms: 'Cash, thirty-day close',
    date: new Date('2026-10-08T00:00:00.000Z'),
};

const REPORT = {
    title: 'Cypress Point',
    address: '18 Cypress Point',
    price: 1_250_000,
    bedrooms: 4,
    bathrooms: 3,
    amenities: ['Pool'],
    features: ['Ocean view'],
    description: 'Clifftop residence',
};

const isWholePdf = (buffer: Buffer) =>
    buffer.subarray(0, 5).toString() === '%PDF-' &&
    buffer.toString('latin1').trimEnd().endsWith('%%EOF');

describe('PDFService', () => {
    const service = new PDFService();

    it('hands back the whole purchase agreement, not an empty buffer', async () => {
        const pdf = await service.generatePurchaseAgreement(AGREEMENT);

        expect(pdf.length).toBeGreaterThan(0);
        expect(isWholePdf(pdf)).toBe(true);
    });

    it('hands back the whole property report, not an empty buffer', async () => {
        const pdf = await service.generatePropertyReport(REPORT);

        expect(isWholePdf(pdf)).toBe(true);
    });
});
