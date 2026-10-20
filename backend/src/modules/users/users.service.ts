import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UserRole } from '@prisma/client';

const USER_SELECT_FIELDS = {
  id: true,
  name: true,
  username: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOperator(dto: CreateOperatorDto) {
    const trimmedUsername = dto.username.trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { username: trimmedUsername },
    });

    if (existingUser) {
      throw new ConflictException({
        message: `O login '${trimmedUsername}' já está cadastrado para outro operador.`,
        code: 'USERNAME_ALREADY_EXISTS',
      });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        username: trimmedUsername,
        passwordHash,
        role: UserRole.OPERADOR,
        isActive: true,
      },
      select: USER_SELECT_FIELDS,
    });

    return user;
  }

  async findAll(query?: ListUsersQueryDto) {
    const whereClause: { role: UserRole; isActive?: boolean } = {
      role: UserRole.OPERADOR,
    };

    if (query?.isActive !== undefined) {
      whereClause.isActive = query.isActive;
    }

    return this.prisma.user.findMany({
      where: whereClause,
      select: USER_SELECT_FIELDS,
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT_FIELDS,
    });

    if (!user) {
      throw new NotFoundException(`Operador com identificador '${id}' não encontrado.`);
    }

    return user;
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Operador com identificador '${id}' não encontrado.`);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        isActive: dto.isActive,
      },
      select: USER_SELECT_FIELDS,
    });
  }
}
