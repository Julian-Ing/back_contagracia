import { Injectable, Logger } from '@nestjs/common';
import { TwilioClientService } from './twilio-client.service';
import * as fs from 'fs';
import * as path from 'path';

export interface MediaDownloadResult {
  localPath: string;
  contentType: string;
  fileName: string;
}

@Injectable()
export class TwilioMediaService {
  private readonly logger = new Logger(TwilioMediaService.name);

  constructor(private readonly twilioClient: TwilioClientService) {}

  /**
   * Descarga media de Twilio y la guarda localmente.
   * Retorna la ruta relativa y content type.
   */
  async downloadMedia(
    companyId: string,
    mediaUrl: string,
    mediaContentType: string,
    messageSid: string,
  ): Promise<MediaDownloadResult> {
    const credentials = await this.twilioClient.getCredentials(companyId);

    // Intentar descargar sin auth primero, luego con auth
    let response = await fetch(mediaUrl);

    if (response.status === 401) {
      response = await fetch(mediaUrl, {
        headers: { Authorization: this.twilioClient.getAuthHeader(credentials) },
      });
    }

    if (!response.ok) {
      throw new Error(`Failed to download media: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const fileExt = mediaContentType?.split('/')[1] || 'bin';
    const fileName = `${Date.now()}_${messageSid}.${fileExt}`;
    const dirPath = path.join(process.cwd(), 'uploads', 'whatsapp-media', companyId);

    // Crear directorio si no existe
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const filePath = path.join(dirPath, fileName);
    fs.writeFileSync(filePath, buffer);

    const relativePath = `uploads/whatsapp-media/${companyId}/${fileName}`;

    this.logger.log(`Media saved: ${relativePath}`);

    return {
      localPath: relativePath,
      contentType: mediaContentType || 'application/octet-stream',
      fileName,
    };
  }
}
