import {
  Controller,
  Post,
  Get,
  Req,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CompanyId, Audit } from '@contagracia/shared-modules';
import { CertificateService } from './certificate.service';

@Controller('certificate')
export class CertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @Audit('certificate.uploaded', 'certificate')
  async uploadCertificate(
    @CompanyId() companyId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('password') password: string,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('El archivo del certificado es requerido');
    }
    const authHeader = req.headers.authorization;
    return this.certificateService.uploadCertificate(companyId, file, password, authHeader);
  }

  @Get('info')
  async getCertificateInfo(@CompanyId() companyId: string) {
    return this.certificateService.getCertificateInfo(companyId);
  }
}
