import { Response } from 'express';
import path from 'path';
import { MobileService } from '../../domain/mobile/mobile.service';
import { DigitalService } from '../../domain/digital/digital.service';
import { CertificateService } from '../../domain/document/document.service';
import { NewsletterService } from '../../domain/communication/newsletter.service';
import { NotificationService } from '../../domain/notification/notification.service';
import { getUploadUrl } from '../middlewares/upload.middleware';

const mobileService = new MobileService();
const digitalService = new DigitalService();
const certificateService = new CertificateService();
const newsletterService = new NewsletterService();
const notificationService = new NotificationService();

export const mobileController = {
  async register(req: any, res: Response) {
    try {
      // For mobile app, tenantId is usually passed via custom header or subdomain
      // For this demo, let's assume it's sent in the body or header. 
      // In production, we'd extract it from a robust source. Let's assume header 'x-tenant-id'.
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });

      res.status(201).json(await mobileService.register(tenantId, req.body));
    } catch (e: any) { res.status(400).json({ error: e.errors || e.message }); }
  },

  async login(req: any, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });

      res.json(await mobileService.login(tenantId, req.body));
    } catch (e: any) { res.status(400).json({ error: e.errors || e.message }); }
  },

  async forgotPassword(req: any, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });
      
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email wajib diisi' });

      res.json(await mobileService.forgotPassword(tenantId, email));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async resetPassword(req: any, res: Response) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });

      res.json(await mobileService.resetPassword(tenantId, req.body));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async getProfile(req: any, res: Response) {
    try { res.json(await mobileService.getProfile(req.user.memberId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async updateProfile(req: any, res: Response) {
    try { res.json(await mobileService.updateProfile(req.user.memberId, req.body)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async getUpcomingEvents(req: any, res: Response) {
    try { res.json(await mobileService.getUpcomingEvents(req.user.memberId, req.user.tenantId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async registerEvent(req: any, res: Response) {
    try { res.status(201).json(await mobileService.registerForEvent(req.user.memberId, req.user.tenantId, req.params.id)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async checkInEvent(req: any, res: Response) {
    try { res.json(await mobileService.checkInEvent(req.user.memberId, req.user.tenantId, req.params.id)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async recordGiving(req: any, res: Response) {
    try {
      console.log('[Mobile recordGiving] req.user:', req.user);
      console.log('[Mobile recordGiving] req.body:', req.body);
      res.status(201).json(await mobileService.recordGiving(req.user?.memberId, req.user?.tenantId, req.body));
    } catch (e: any) {
      console.error('[Mobile recordGiving] Error:', e);
      res.status(400).json({ error: e.message });
    }
  },

  async uploadReceipt(req: any, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'File bukti transfer wajib diunggah' });
      }
      const imageUrl = getUploadUrl(req.file, `/uploads/receipts/${req.file.filename}`);
      res.json({ imageUrl });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async uploadPhoto(req: any, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Foto profil wajib diunggah' });
      }
      const photoUrl = getUploadUrl(req.file, `/uploads/member-photos/${req.file.filename}`);
      const updated = await mobileService.updateProfilePhoto(req.user.memberId, photoUrl);
      res.json({ photoUrl, member: updated });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async getFamilies(req: any, res: Response) {
    try { res.json(await mobileService.getFamilies(req.user.tenantId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async createFamily(req: any, res: Response) {
    try { res.status(201).json(await mobileService.createFamily(req.user.memberId, req.user.tenantId, req.body.name)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async joinFamily(req: any, res: Response) {
    try { res.json(await mobileService.joinFamily(req.user.memberId, req.body.familyId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async leaveFamily(req: any, res: Response) {
    try { res.json(await mobileService.leaveFamily(req.user.memberId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async addSacrament(req: any, res: Response) {
    try { res.status(201).json(await mobileService.addSacrament(req.user.memberId, req.body)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async deleteSacrament(req: any, res: Response) {
    try { res.json(await mobileService.deleteSacrament(req.user.memberId, req.params.id)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async getSkills(req: any, res: Response) {
    try { res.json(await mobileService.getSkills(req.user.tenantId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async addMemberSkill(req: any, res: Response) {
    try { res.status(201).json(await mobileService.addMemberSkill(req.user.memberId, req.body.skillId, req.body.proficiency)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async removeMemberSkill(req: any, res: Response) {
    try { res.json(await mobileService.removeMemberSkill(req.user.memberId, req.params.skillId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async createAndAddSkill(req: any, res: Response) {
    try { res.status(201).json(await mobileService.createAndAddSkill(req.user.memberId, req.body.skillName, req.body.proficiency)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async getMyPrayers(req: any, res: Response) {
    try { res.json(await mobileService.getMyPrayers(req.user.memberId, req.user.tenantId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async getPublicPrayers(req: any, res: Response) {
    try { res.json(await mobileService.getPublicPrayers(req.user.memberId, req.user.tenantId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async createMyPrayer(req: any, res: Response) {
    try { res.status(201).json(await mobileService.createMyPrayer(req.user.memberId, req.user.tenantId, req.body)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async prayForRequest(req: any, res: Response) {
    try { res.json(await mobileService.prayForRequest(req.user.tenantId, req.params.id)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async getVolunteerRecruitments(req: any, res: Response) {
    try { res.json(await mobileService.getVolunteerRecruitments(req.user.tenantId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async applyForVolunteer(req: any, res: Response) {
    try { res.status(201).json(await mobileService.applyForVolunteer(req.user.memberId, req.params.id, req.body.notes)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async getMyRosters(req: any, res: Response) {
    try { res.json(await mobileService.getMyRosters(req.user.memberId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async getNewsletters(req: any, res: Response) {
    try {
      const newsletters = await newsletterService.listPublic(req.user.tenantId);
      const mapped = newsletters.map(item => ({
        ...item,
        date: item.publishDate
      }));
      res.json(mapped);
    }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async getCertificates(req: any, res: Response) {
    try { res.json(await certificateService.listByMember(req.user.tenantId, req.user.memberId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async getCounselors(req: any, res: Response) {
    try { res.json(await mobileService.getCounselors(req.user.tenantId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async getMyCounselings(req: any, res: Response) {
    try { res.json(await mobileService.getMyCounselings(req.user.memberId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async createCounseling(req: any, res: Response) {
    try { res.status(201).json(await mobileService.createCounselingBooking(req.user.tenantId, req.user.memberId, req.body)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async getFacilities(req: any, res: Response) {
    try { res.json(await mobileService.getFacilities(req.user.tenantId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async getMyFacilityBookings(req: any, res: Response) {
    try { res.json(await mobileService.getMyFacilityBookings(req.user.tenantId, req.user.memberId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async createFacilityBooking(req: any, res: Response) {
    try { res.status(201).json(await mobileService.createFacilityBooking(req.user.tenantId, req.user.memberId, req.body)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async getSmallGroups(req: any, res: Response) {
    try { res.json(await mobileService.getSmallGroups(req.user.tenantId, req.user.memberId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async requestToJoinSmallGroup(req: any, res: Response) {
    try { res.status(201).json(await mobileService.requestToJoinSmallGroup(req.user.tenantId, req.user.memberId, req.body.groupId, req.body.notes)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async getSacramentRequests(req: any, res: Response) {
    try { res.json(await mobileService.getSacramentRequests(req.user.tenantId, req.user.memberId)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async createSacramentRequest(req: any, res: Response) {
    try { res.status(201).json(await mobileService.createSacramentRequest(req.user.tenantId, req.user.memberId, req.body)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  async uploadSacramentRequirement(req: any, res: Response) {
    try {
      const file = req.file as any;
      if (!file) return res.status(400).json({ error: 'File required' });

      let url = '';
      if (file.location) {
        url = getUploadUrl(file, '');
      } else {
        const relativePath = path.relative(process.cwd(), file.path).replace(/\\/g, '/');
        url = `/${relativePath}`;
      }

      res.status(201).json({
        url,
        name: file.originalname,
        type: file.mimetype,
        size: file.size
      });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async getNotifications(req: any, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      res.json(await notificationService.getByMember(req.user.memberId, page));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async markAsRead(req: any, res: Response) {
    try {
      await notificationService.markAsRead(req.params.id, req.user.memberId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async markAllAsRead(req: any, res: Response) {
    try {
      await notificationService.markAllAsRead(req.user.memberId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }
};

