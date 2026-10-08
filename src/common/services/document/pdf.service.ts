import { Injectable, BadRequestException } from '@nestjs/common';
import PDFDocument from 'pdfkit';

interface PurchaseAgreementData {
    buyerName: string;
    buyerEmail: string;
    sellerName: string;
    sellerEmail: string;
    propertyTitle: string;
    propertyAddress: string;
    purchasePrice: number;
    terms: string;
    date: Date;
}

interface PropertyReportData {
    title: string;
    address: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    sqFt?: number;
    amenities: string[];
    features: string[];
    description: string;
}

@Injectable()
export class PDFService {
    generatePurchaseAgreement(data: PurchaseAgreementData): Promise<Buffer> {
        return this.render((doc) => {
            doc.fontSize(20).font('Helvetica-Bold').text('PURCHASE AGREEMENT', {
                align: 'center',
            });
            doc.moveDown();

            doc.fontSize(10)
                .font('Helvetica')
                .text(`Date: ${data.date.toLocaleDateString()}`);
            doc.moveDown();

            doc.fontSize(12)
                .font('Helvetica-Bold')
                .text('PARTIES TO AGREEMENT');
            doc.fontSize(10).font('Helvetica');
            doc.text(`Buyer: ${data.buyerName} (${data.buyerEmail})`);
            doc.text(`Seller: ${data.sellerName} (${data.sellerEmail})`);
            doc.moveDown();

            doc.fontSize(12).font('Helvetica-Bold').text('PROPERTY DETAILS');
            doc.fontSize(10).font('Helvetica');
            doc.text(`Title: ${data.propertyTitle}`);
            doc.text(`Address: ${data.propertyAddress}`);
            doc.moveDown();

            doc.fontSize(12).font('Helvetica-Bold').text('PURCHASE PRICE');
            doc.fontSize(10).font('Helvetica');
            doc.text(`Total Amount: $${data.purchasePrice.toLocaleString()}`);
            doc.moveDown();

            doc.fontSize(12)
                .font('Helvetica-Bold')
                .text('TERMS AND CONDITIONS');
            doc.fontSize(10).font('Helvetica');
            doc.text(data.terms, { width: 500 });
            doc.moveDown(2);

            doc.fontSize(10).font('Helvetica');
            doc.text('BUYER SIGNATURE: _____________________');
            doc.text('Date: _____________________');
            doc.moveDown();
            doc.text('SELLER SIGNATURE: _____________________');
            doc.text('Date: _____________________');
            doc.moveDown(2);

            doc.fontSize(8)
                .font('Helvetica')
                .text(
                    'This is a legally binding agreement. Both parties agree to the terms outlined above.',
                    { align: 'center' },
                );
        });
    }

    generatePropertyReport(data: PropertyReportData): Promise<Buffer> {
        return this.render((doc) => {
            doc.fontSize(18).font('Helvetica-Bold').text('PROPERTY REPORT', {
                align: 'center',
            });
            doc.moveDown();

            doc.fontSize(14).font('Helvetica-Bold').text(data.title);
            doc.fontSize(10).font('Helvetica').text(data.address);
            doc.moveDown();

            doc.fontSize(12)
                .font('Helvetica-Bold')
                .text(`$${data.price.toLocaleString()}`);
            doc.moveDown();

            doc.fontSize(12).font('Helvetica-Bold').text('KEY DETAILS');
            doc.fontSize(10).font('Helvetica');
            doc.text(`Bedrooms: ${data.bedrooms}`);
            doc.text(`Bathrooms: ${data.bathrooms}`);
            if (data.sqFt) {
                doc.text(`Square Feet: ${data.sqFt.toLocaleString()}`);
            }
            doc.moveDown();

            doc.fontSize(12).font('Helvetica-Bold').text('DESCRIPTION');
            doc.fontSize(10).font('Helvetica');
            doc.text(data.description, { width: 500 });
            doc.moveDown();

            if (data.amenities.length > 0) {
                doc.fontSize(12).font('Helvetica-Bold').text('AMENITIES');
                doc.fontSize(10).font('Helvetica');
                data.amenities.forEach((amenity: string) => {
                    doc.text(`• ${amenity}`);
                });
                doc.moveDown();
            }

            if (data.features.length > 0) {
                doc.fontSize(12).font('Helvetica-Bold').text('FEATURES');
                doc.fontSize(10).font('Helvetica');
                data.features.forEach((feature: string) => {
                    doc.text(`• ${feature}`);
                });
            }
        });
    }

    private render(draw: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const fail = (error: unknown) =>
                reject(
                    new BadRequestException(
                        `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    ),
                );
            const doc = new PDFDocument();
            const buffers: Buffer[] = [];

            doc.on('data', (chunk: Buffer) => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', fail);

            try {
                draw(doc);
                doc.end();
            } catch (error: unknown) {
                fail(error);
            }
        });
    }
}
