import { AuthUser } from '@core/auth/types/auth.types';

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }

        namespace Multer {
            interface File {
                fieldname: string;
                originalname: string;
                encoding: string;
                mimetype: string;
                size: number;
                destination: string;
                filename: string;
                path: string;
                buffer: Buffer;
            }
        }
    }
}
