import { generateKeyPairSync } from 'node:crypto';

const MODULUS_LENGTH = 2048;

const run = () => {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
        modulusLength: MODULUS_LENGTH,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const encode = (pem: string) => Buffer.from(pem, 'utf8').toString('base64');

    process.stdout.write(
        [
            '# --- backend/.env -------------------------------------------------',
            '# The private key signs. Keep it here and nowhere else.',
            `JWT_PRIVATE_KEY=${encode(privateKey)}`,
            `JWT_PUBLIC_KEY=${encode(publicKey)}`,
            '',
            '# --- frontend/.env ------------------------------------------------',
            '# The frontend proxy verifies and never signs, so it gets the public key only.',
            `JWT_PUBLIC_KEY=${encode(publicKey)}`,
            '',
            '# Rotating these signs every existing session out. That is the intent.',
            '',
        ].join('\n'),
    );
};

run();
