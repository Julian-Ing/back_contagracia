/**
 * Mapea estados de Twilio a estados internos del sistema
 */
export function mapTwilioStatus(twilioStatus: string): string {
  const statusMap: Record<string, string> = {
    queued: 'PENDING',
    sending: 'PENDING',
    sent: 'SENT',
    delivered: 'DELIVERED',
    undelivered: 'FAILED',
    failed: 'FAILED',
    read: 'READ',
    accepted: 'PENDING',
    scheduled: 'PENDING',
    canceled: 'FAILED',
  };
  return statusMap[twilioStatus?.toLowerCase()] || 'PENDING';
}

/**
 * Detecta el tipo de contenido multimedia
 */
export function getMessageType(contentType?: string): string {
  if (!contentType) return 'text';
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('audio/')) return 'audio';
  if (contentType.startsWith('video/')) return 'video';
  return 'document';
}
