import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getSystemStatus() {
    return {
      system: 'SGMS — Sistema de Gestão de Máquinas de Sopro',
      version: '1.0.0',
      status: 'operational',
      environment: process.env.NODE_ENV ?? null,
      timestamp: new Date().toISOString(),
    };
  }
}
