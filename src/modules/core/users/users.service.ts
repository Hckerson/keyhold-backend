import { UserDto } from './dto';
import { Injectable } from '@nestjs/common';
import { User } from 'generated/prisma/client';
import { Prisma } from 'generated/prisma/client';
import { UserRepo } from '@common/repos/user.repo';

interface UserCreateData {
    email: string;
    fullName: string;
    phoneNumber?: string;
    role?: string;
    passwordHash?: string;
}

@Injectable()
export class UsersService {
    constructor(private userRepo: UserRepo) {}

    async create(data: UserCreateData): Promise<UserDto> {
        const user = await this.userRepo.create({
            data: data as Prisma.UserCreateInput,
        });
        return this.toDto(user);
    }

    async findAll(): Promise<UserDto[]> {
        const users = await this.userRepo.findMany({});
        return users.map((user) => this.toDto(user));
    }

    async findOne(id: string): Promise<UserDto | null> {
        const user = await this.userRepo.findUnique({ where: { id } });
        return user ? this.toDto(user) : null;
    }

    async findByEmail(email: string): Promise<UserDto | null> {
        const user = await this.userRepo.findUnique({ where: { email } });
        return user ? this.toDto(user) : null;
    }

    async update(id: string, data: Prisma.UserUpdateInput): Promise<UserDto> {
        const user = await this.userRepo.update({
            where: { id: String(id) },
            data,
        });
        return this.toDto(user);
    }

    async remove(id: string): Promise<UserDto> {
        const user = await this.userRepo.delete({ where: { id: String(id) } });
        return this.toDto(user);
    }

    private toDto(user: User): UserDto {
        return {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            phoneNumber: user.phoneNumber || undefined,
            bio: user.bio || undefined,
            avatar: user.avatar || undefined,
            role: user.role,
            status: user.status,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
}
