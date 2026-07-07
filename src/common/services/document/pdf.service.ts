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
    generatePurchaseAgreement(data: PurchaseAgreementData): Buffer {
        try {
            const doc = new PDFDocument();
            const buffers: Buffer[] = [];

            doc.on('data', (chunk: Buffer) => buffers.push(chunk));

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

            doc.end();

            return Buffer.concat(buffers);
        } catch (error: unknown) {
            throw new BadRequestException(
                `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    generatePropertyReport(propertyData: PropertyReportData): Buffer {
        try {
            const doc = new PDFDocument();
            const buffers: Buffer[] = [];

            doc.on('data', (chunk: Buffer) => buffers.push(chunk));

            doc.fontSize(18).font('Helvetica-Bold').text('PROPERTY REPORT', {
                align: 'center',
            });
            doc.moveDown();

            doc.fontSize(14).font('Helvetica-Bold').text(propertyData.title);
            doc.fontSize(10).font('Helvetica').text(propertyData.address);
            doc.moveDown();

            doc.fontSize(12)
                .font('Helvetica-Bold')
                .text(`$${propertyData.price.toLocaleString()}`);
            doc.moveDown();

            doc.fontSize(12).font('Helvetica-Bold').text('KEY DETAILS');
            doc.fontSize(10).font('Helvetica');
            doc.text(`Bedrooms: ${propertyData.bedrooms}`);
            doc.text(`Bathrooms: ${propertyData.bathrooms}`);
            if (propertyData.sqFt) {
                doc.text(`Square Feet: ${propertyData.sqFt.toLocaleString()}`);
            }
            doc.moveDown();

            doc.fontSize(12).font('Helvetica-Bold').text('DESCRIPTION');
            doc.fontSize(10).font('Helvetica');
            doc.text(propertyData.description, { width: 500 });
            doc.moveDown();

            if (propertyData.amenities.length > 0) {
                doc.fontSize(12).font('Helvetica-Bold').text('AMENITIES');
                doc.fontSize(10).font('Helvetica');
                propertyData.amenities.forEach((amenity: string) => {
                    doc.text(`• ${amenity}`);
                });
                doc.moveDown();
            }

            if (propertyData.features.length > 0) {
                doc.fontSize(12).font('Helvetica-Bold').text('FEATURES');
                doc.fontSize(10).font('Helvetica');
                propertyData.features.forEach((feature: string) => {
                    doc.text(`• ${feature}`);
                });
            }

            doc.end();

            return Buffer.concat(buffers);
        } catch (error: unknown) {
            throw new BadRequestException(
                `Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }
}
