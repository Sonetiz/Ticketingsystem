import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttachmentsService {
  private uploadDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.uploadDir = this.config.get<string>('UPLOAD_DIR') || './uploads';
  }

  async save(ticketId: string, file: Express.Multer.File, uploadedById?: string, isPublic = false) {
    await fs.mkdir(this.uploadDir, { recursive: true });
    const storageKey = `${ticketId}/${randomUUID()}-${file.originalname}`;
    const fullPath = path.join(this.uploadDir, storageKey);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, file.buffer);

    return this.prisma.ticketAttachment.create({
      data: {
        ticketId,
        uploadedById,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey,
        isPublic,
        scanStatus: 'clean',
      },
    });
  }

  signDownloadUrl(attachmentId: string, expiresInSeconds = 3600): string {
    const secret = this.config.get<string>('ATTACHMENT_SIGNING_SECRET') || 'dev-attachment-secret';
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const sig = createHmac('sha256', secret).update(`${attachmentId}:${expires}`).digest('hex');
    return `/api/attachments/${attachmentId}/download?expires=${expires}&sig=${sig}`;
  }

  verifySignature(attachmentId: string, expires: number, sig: string): boolean {
    if (expires < Math.floor(Date.now() / 1000)) return false;
    const secret = this.config.get<string>('ATTACHMENT_SIGNING_SECRET') || 'dev-attachment-secret';
    const expected = createHmac('sha256', secret).update(`${attachmentId}:${expires}`).digest('hex');
    return sig === expected;
  }

  async getFile(attachmentId: string) {
    const attachment = await this.prisma.ticketAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!attachment) return null;
    const fullPath = path.join(this.uploadDir, attachment.storageKey);
    const buffer = await fs.readFile(fullPath);
    return { attachment, buffer };
  }

  listByTicket(ticketId: string) {
    return this.prisma.ticketAttachment.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteFile(attachmentId: string) {
    const attachment = await this.prisma.ticketAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!attachment) return false;
    const fullPath = path.join(this.uploadDir, attachment.storageKey);
    try {
      await fs.unlink(fullPath);
    } catch {
      // file may already be gone
    }
    await this.prisma.ticketAttachment.delete({ where: { id: attachmentId } });
    return true;
  }

  async purgeExpiredAttachments(retentionDays: number) {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const attachments = await this.prisma.ticketAttachment.findMany({
      where: {
        ticket: {
          status: 'closed',
          closedAt: { lt: cutoff },
        },
      },
    });

    let deleted = 0;
    for (const attachment of attachments) {
      if (await this.deleteFile(attachment.id)) deleted++;
    }
    return deleted;
  }
}
