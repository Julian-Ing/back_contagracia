import { Module } from '@nestjs/common';
import { TypeDocumentsController } from './type-documents.controller';
import { TypeDocumentsService } from './type-documents.service';

@Module({
  controllers: [TypeDocumentsController],
  providers: [TypeDocumentsService],
  exports: [TypeDocumentsService],
})
export class TypeDocumentsModule {}
