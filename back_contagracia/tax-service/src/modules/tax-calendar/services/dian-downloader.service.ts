import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class DianDownloaderService {
  private readonly logger = new Logger(DianDownloaderService.name);
  private readonly DIAN_BASE_URL = 'https://www.dian.gov.co/Calendarios';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 2000;

  constructor(private readonly httpService: HttpService) {}

  /**
   * Descarga el PDF del calendario tributario desde DIAN
   * @param year Año del calendario (ej. 2026)
   * @returns Buffer con el contenido del PDF
   */
  async downloadPdf(year: number): Promise<Buffer> {
    const url = `${this.DIAN_BASE_URL}/Calendario_Tributario_${year}.pdf`;
    this.logger.log(`Descargando PDF del calendario ${year} desde: ${url}`);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        this.logger.debug(`Intento ${attempt}/${this.MAX_RETRIES}`);

        const response = await firstValueFrom(
          this.httpService.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000, // 30 segundos
            maxRedirects: 5,
          })
        );

        if (response.data) {
          const buffer = Buffer.from(response.data);
          this.logger.log(`✅ PDF descargado exitosamente: ${buffer.length} bytes`);
          return buffer;
        }

        throw new Error('Respuesta vacía del servidor');
      } catch (error) {
        lastError = error as Error;
        const axiosError = error as AxiosError;

        if (axiosError.response) {
          const status = axiosError.response.status;

          if (status === 404) {
            this.logger.error(`❌ PDF no encontrado (404) para el año ${year}`);
            throw new Error(`Calendario tributario ${year} no disponible en DIAN (404)`);
          }

          if (status === 403 || status === 401) {
            this.logger.error(`❌ Acceso denegado (${status}) al descargar PDF`);
            throw new Error(`Acceso denegado al descargar calendario ${year} (${status})`);
          }
        }

        if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
          this.logger.warn(`⚠️  Timeout en intento ${attempt}/${this.MAX_RETRIES}`);
        } else {
          this.logger.warn(`⚠️  Error en intento ${attempt}/${this.MAX_RETRIES}: ${error}`);
        }

        // No reintentar si es el último intento
        if (attempt < this.MAX_RETRIES) {
          const delay = this.RETRY_DELAY_MS * attempt; // Backoff exponencial
          this.logger.debug(`Esperando ${delay}ms antes del siguiente intento...`);
          await this.sleep(delay);
        }
      }
    }

    // Si llegamos aquí, todos los reintentos fallaron
    const errorMsg = `No se pudo descargar el PDF después de ${this.MAX_RETRIES} intentos: ${lastError?.message}`;
    this.logger.error(`❌ ${errorMsg}`);
    throw new Error(errorMsg);
  }

  /**
   * Verifica si un PDF existe en DIAN sin descargarlo (HEAD request)
   * @param year Año del calendario
   * @returns true si el PDF existe, false si no
   */
  async pdfExists(year: number): Promise<boolean> {
    const url = `${this.DIAN_BASE_URL}/Calendario_Tributario_${year}.pdf`;

    try {
      const response = await firstValueFrom(
        this.httpService.head(url, {
          timeout: 10000,
        })
      );

      return response.status === 200;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        return false;
      }

      // Para otros errores, asumir que no existe
      this.logger.warn(`Error verificando existencia del PDF ${year}: ${error}`);
      return false;
    }
  }

  /**
   * Obtiene la URL del PDF para un año específico
   * @param year Año del calendario
   * @returns URL completa del PDF
   */
  getPdfUrl(year: number): string {
    return `${this.DIAN_BASE_URL}/Calendario_Tributario_${year}.pdf`;
  }

  /**
   * Helper para dormir un número de milisegundos
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
