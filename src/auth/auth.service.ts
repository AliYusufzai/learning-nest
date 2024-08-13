import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService{
    constructor(private prisma:PrismaService, private jwt:JwtService, private config:ConfigService){}

    async signup(dto:AuthDto){
        const hash = await argon.hash(dto.password)
        try{
            const user = await this.prisma.user.create({data:{
                email: dto.email,
                hash,
            }})

            return this.signToken(user.id, user.email)
        }catch(error){
            throw error
        }
        
    }

    async signin(dto:AuthDto){
        const user = await this.prisma.user.findUnique({
            where:{
                email: dto.email
            },
        })

        if(!user){
            throw new ForbiddenException('Credentials Incorrect')
        }

        const passMatches = await argon.verify(user.hash, dto.password)

        if(!passMatches){
            throw new ForbiddenException('Credential Incorrect')
        }

        return this.signToken(user.id, user.email)
    }

    async signToken(userId: number, email: string): Promise<{access_token: string}>{
        const payload = {
            sub: userId,
            email
        }
        const secret = this.config.get('JWT_SEC')

        const token = await this.jwt.signAsync(payload, {
            expiresIn:'15m',
            secret:secret
        })

        return { access_token: token}
    }
}