import { prisma } from '../src/prisma';
import { CommunicationService } from '../src/domain/communication/communication.service';

async function main() {
  const service = new CommunicationService();
  try {
    const res = await service.createTemplate('gbi-hos', {
      name: 'Test Template',
      subject: 'Test Subject',
      body: 'Test Body',
      channel: 'WHATSAPP'
    });
    console.log('Success:', res);
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main();
