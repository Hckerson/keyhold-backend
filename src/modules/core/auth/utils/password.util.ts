import * as bcrypt from 'bcrypt';

export class PasswordUtil {
    static async hash(password: string): Promise<string> {
        const salt = await bcrypt.genSalt();
        return bcrypt.hash(password, salt);
    }

    static async compare(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }
}
