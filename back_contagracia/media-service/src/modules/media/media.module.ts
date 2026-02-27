import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaAccessGuard } from './media-access.guard';

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [MediaController],
  providers: [MediaService, MediaAccessGuard],
})
export class MediaModule {}
