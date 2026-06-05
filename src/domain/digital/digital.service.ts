import { prisma } from '../../prisma';
import crypto from 'crypto';

export class DigitalService {
  // --- SERMONS ---
  async getSermons(tenantId: string) {
    return prisma.sermon.findMany({ where: { tenantId }, orderBy: { date: 'desc' } });
  }

  async getPublicSermons(tenantId: string) {
    return prisma.sermon.findMany({ where: { tenantId, isPublished: true }, orderBy: { date: 'desc' } });
  }

  async createSermon(tenantId: string, data: any) {
    const sermon = await prisma.sermon.create({
      data: {
        tenantId,
        title: data.title,
        preacher: data.preacher,
        date: new Date(data.date),
        videoUrl: data.videoUrl,
        audioUrl: data.audioUrl,
        description: data.description,
        isPublished: data.isPublished !== false
      }
    });

    await this.triggerWebhook(tenantId, 'sermon', sermon);
    return sermon;
  }

  async deleteSermon(tenantId: string, id: string) {
    await prisma.sermon.deleteMany({ where: { id, tenantId } });
  }

  // --- BULLETINS ---
  async getBulletins(tenantId: string) {
    return prisma.bulletin.findMany({ where: { tenantId }, orderBy: { date: 'desc' } });
  }

  async getPublicBulletins(tenantId: string) {
    return prisma.bulletin.findMany({ where: { tenantId, isPublished: true }, orderBy: { date: 'desc' } });
  }

  async createBulletin(tenantId: string, data: any) {
    const bulletin = await prisma.bulletin.create({
      data: {
        tenantId,
        title: data.title,
        date: new Date(data.date),
        content: data.content,
        pdfUrl: data.pdfUrl,
        isPublished: data.isPublished !== false
      }
    });

    await this.triggerWebhook(tenantId, 'bulletin', bulletin);
    return bulletin;
  }

  async deleteBulletin(tenantId: string, id: string) {
    await prisma.bulletin.deleteMany({ where: { id, tenantId } });
  }

  // --- DIGITAL CONFIG ---
  async getConfig(tenantId: string) {
    let config = await prisma.digitalConfig.findUnique({ where: { tenantId } });
    if (!config) {
      config = await prisma.digitalConfig.create({ data: { tenantId } });
    }
    return config;
  }

  async updateConfig(tenantId: string, data: any) {
    return prisma.digitalConfig.upsert({
      where: { tenantId },
      update: {
        liveStreamUrl: data.liveStreamUrl,
        socialWebhookUrl: data.socialWebhookUrl,
        autoPostSermons: data.autoPostSermons,
        autoPostBulletins: data.autoPostBulletins
      },
      create: {
        tenantId,
        liveStreamUrl: data.liveStreamUrl,
        socialWebhookUrl: data.socialWebhookUrl,
        autoPostSermons: data.autoPostSermons,
        autoPostBulletins: data.autoPostBulletins
      }
    });
  }

  async generateApiKey(tenantId: string) {
    const newKey = crypto.randomBytes(32).toString('hex');
    return prisma.digitalConfig.upsert({
      where: { tenantId },
      update: { websiteApiKey: newKey },
      create: { tenantId, websiteApiKey: newKey }
    });
  }

  async validateApiKey(apiKey: string) {
    return prisma.digitalConfig.findUnique({ where: { websiteApiKey: apiKey } });
  }

  // --- WEBHOOK TRIGGER ---
  private async triggerWebhook(tenantId: string, type: 'sermon' | 'bulletin', payload: any) {
    try {
      const config = await prisma.digitalConfig.findUnique({ where: { tenantId } });
      if (!config || !config.socialWebhookUrl) return;
      if (type === 'sermon' && !config.autoPostSermons) return;
      if (type === 'bulletin' && !config.autoPostBulletins) return;

      // In real-world, we would use axios.post(config.socialWebhookUrl, payload)
      // Here we just log it as a simulation
      console.log(`[WEBHOOK TRIGGERED] Sending ${type} data to ${config.socialWebhookUrl}`);
      // axios.post(config.socialWebhookUrl, { type, data: payload }).catch(console.error);
    } catch (err) {
      console.error('Failed to trigger webhook', err);
    }
  }
}
