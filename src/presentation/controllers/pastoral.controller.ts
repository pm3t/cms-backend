import { Request, Response, NextFunction } from 'express';
import {
  PastoralVisitationService,
  CounselingRecordService,
  PrayerRequestService,
  CareGroupService,
  CrisisRecordService,
  EmergencyContactService
} from '../../domain/pastoral/pastoral.service';

const visitationService = new PastoralVisitationService();
const counselingService = new CounselingRecordService();
const prayerService = new PrayerRequestService();
const careGroupService = new CareGroupService();
const crisisService = new CrisisRecordService();
const emergencyService = new EmergencyContactService();

export const pastoralController = {
  // --- VISITATION ENDPOINTS ---
  async getVisitations(req: any, res: Response, next: NextFunction) {
    try {
      const records = await visitationService.list(req.user.tenantId);
      res.json(records);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async getVisitationById(req: any, res: Response, next: NextFunction) {
    try {
      const record = await visitationService.get(req.user.tenantId, req.params.id);
      res.json(record);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  },

  async createVisitation(req: any, res: Response, next: NextFunction) {
    try {
      const record = await visitationService.create(req.user.tenantId, req.body);
      res.status(201).json(record);
    } catch (error: any) {
      if (error.errors) return res.status(400).json({ error: error.errors });
      res.status(400).json({ error: error.message });
    }
  },

  async updateVisitation(req: any, res: Response, next: NextFunction) {
    try {
      const record = await visitationService.update(req.user.tenantId, req.params.id, req.body);
      res.json(record);
    } catch (error: any) {
      if (error.errors) return res.status(400).json({ error: error.errors });
      res.status(400).json({ error: error.message });
    }
  },

  async deleteVisitation(req: any, res: Response, next: NextFunction) {
    try {
      await visitationService.delete(req.user.tenantId, req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  // --- COUNSELING ENDPOINTS (Strict Privacy) ---
  async getCounselings(req: any, res: Response, next: NextFunction) {
    try {
      const records = await counselingService.list(
        req.user.tenantId,
        req.user.userId,
        req.user.roleId,
        req.user.isSuperAdmin
      );
      res.json(records);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async getCounselingById(req: any, res: Response, next: NextFunction) {
    try {
      const record = await counselingService.get(
        req.user.tenantId,
        req.params.id,
        req.user.userId,
        req.user.roleId,
        req.user.isSuperAdmin
      );
      res.json(record);
    } catch (err: any) {
      if (err.message.includes('Access denied')) {
        return res.status(403).json({ error: err.message });
      }
      res.status(404).json({ error: err.message });
    }
  },

  async createCounseling(req: any, res: Response, next: NextFunction) {
    try {
      const record = await counselingService.create(req.user.tenantId, req.user.userId, req.body);
      res.status(201).json(record);
    } catch (error: any) {
      if (error.errors) return res.status(400).json({ error: error.errors });
      res.status(400).json({ error: error.message });
    }
  },

  async updateCounseling(req: any, res: Response, next: NextFunction) {
    try {
      const record = await counselingService.update(
        req.user.tenantId,
        req.params.id,
        req.user.userId,
        req.user.roleId,
        req.user.isSuperAdmin,
        req.body
      );
      res.json(record);
    } catch (error: any) {
      if (error.message.includes('Access denied')) {
        return res.status(403).json({ error: error.message });
      }
      if (error.errors) return res.status(400).json({ error: error.errors });
      res.status(400).json({ error: error.message });
    }
  },

  async deleteCounseling(req: any, res: Response, next: NextFunction) {
    try {
      await counselingService.delete(
        req.user.tenantId,
        req.params.id,
        req.user.userId,
        req.user.roleId,
        req.user.isSuperAdmin
      );
      res.status(204).send();
    } catch (error: any) {
      if (error.message.includes('Access denied')) {
        return res.status(403).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  },

  // --- PRAYER ENDPOINTS ---
  async getPrayers(req: any, res: Response, next: NextFunction) {
    try {
      const records = await prayerService.list(
        req.user.tenantId,
        req.user.userId,
        req.user.roleId,
        req.user.isSuperAdmin
      );
      res.json(records);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async getPrayerById(req: any, res: Response, next: NextFunction) {
    try {
      const record = await prayerService.get(
        req.user.tenantId,
        req.params.id,
        req.user.userId,
        req.user.roleId,
        req.user.isSuperAdmin
      );
      res.json(record);
    } catch (err: any) {
      if (err.message.includes('Access denied')) {
        return res.status(403).json({ error: err.message });
      }
      res.status(404).json({ error: err.message });
    }
  },

  async createPrayer(req: any, res: Response, next: NextFunction) {
    try {
      const record = await prayerService.create(req.user.tenantId, req.body);
      res.status(201).json(record);
    } catch (error: any) {
      if (error.errors) return res.status(400).json({ error: error.errors });
      res.status(400).json({ error: error.message });
    }
  },

  async updatePrayer(req: any, res: Response, next: NextFunction) {
    try {
      const record = await prayerService.update(
        req.user.tenantId,
        req.params.id,
        req.user.userId,
        req.user.roleId,
        req.user.isSuperAdmin,
        req.body
      );
      res.json(record);
    } catch (error: any) {
      if (error.message.includes('Access denied')) {
        return res.status(403).json({ error: error.message });
      }
      if (error.errors) return res.status(400).json({ error: error.errors });
      res.status(400).json({ error: error.message });
    }
  },

  async incrementPrayerCount(req: any, res: Response, next: NextFunction) {
    try {
      const record = await prayerService.incrementPray(req.user.tenantId, req.params.id);
      res.json(record);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async deletePrayer(req: any, res: Response, next: NextFunction) {
    try {
      await prayerService.delete(
        req.user.tenantId,
        req.params.id,
        req.user.userId,
        req.user.roleId,
        req.user.isSuperAdmin
      );
      res.status(204).send();
    } catch (error: any) {
      if (error.message.includes('Access denied')) {
        return res.status(403).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  },

  // --- CARE GROUP ENDPOINTS ---
  async getCareGroups(req: any, res: Response, next: NextFunction) {
    try {
      const records = await careGroupService.list(req.user.tenantId);
      res.json(records);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async getCareGroupById(req: any, res: Response, next: NextFunction) {
    try {
      const record = await careGroupService.get(req.user.tenantId, req.params.id);
      res.json(record);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  },

  async createCareGroup(req: any, res: Response, next: NextFunction) {
    try {
      const record = await careGroupService.create(req.user.tenantId, req.body);
      res.status(201).json(record);
    } catch (error: any) {
      if (error.errors) return res.status(400).json({ error: error.errors });
      res.status(400).json({ error: error.message });
    }
  },

  async updateCareGroup(req: any, res: Response, next: NextFunction) {
    try {
      const record = await careGroupService.update(req.user.tenantId, req.params.id, req.body);
      res.json(record);
    } catch (error: any) {
      if (error.errors) return res.status(400).json({ error: error.errors });
      res.status(400).json({ error: error.message });
    }
  },

  async deleteCareGroup(req: any, res: Response, next: NextFunction) {
    try {
      await careGroupService.delete(req.user.tenantId, req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async addCareGroupMember(req: any, res: Response, next: NextFunction) {
    try {
      const { memberId } = req.body;
      if (!memberId) return res.status(400).json({ error: 'memberId is required' });
      const record = await careGroupService.addMember(req.user.tenantId, req.params.id, memberId);
      res.status(201).json(record);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async removeCareGroupMember(req: any, res: Response, next: NextFunction) {
    try {
      await careGroupService.removeMember(req.user.tenantId, req.params.id, req.params.memberId);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  // --- CRISIS ENDPOINTS ---
  async getCrises(req: any, res: Response, next: NextFunction) {
    try {
      const records = await crisisService.list(req.user.tenantId);
      res.json(records);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async getCrisisById(req: any, res: Response, next: NextFunction) {
    try {
      const record = await crisisService.get(req.user.tenantId, req.params.id);
      res.json(record);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  },

  async createCrisis(req: any, res: Response, next: NextFunction) {
    try {
      const record = await crisisService.create(req.user.tenantId, req.body);
      res.status(201).json(record);
    } catch (error: any) {
      if (error.errors) return res.status(400).json({ error: error.errors });
      res.status(400).json({ error: error.message });
    }
  },

  async updateCrisis(req: any, res: Response, next: NextFunction) {
    try {
      const record = await crisisService.update(req.user.tenantId, req.params.id, req.body);
      res.json(record);
    } catch (error: any) {
      if (error.errors) return res.status(400).json({ error: error.errors });
      res.status(400).json({ error: error.message });
    }
  },

  async deleteCrisis(req: any, res: Response, next: NextFunction) {
    try {
      await crisisService.delete(req.user.tenantId, req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  // --- EMERGENCY CONTACT ENDPOINTS ---
  async getEmergencyContacts(req: any, res: Response, next: NextFunction) {
    try {
      const records = await emergencyService.listByMember(req.user.tenantId, req.params.memberId);
      res.json(records);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async createEmergencyContact(req: any, res: Response, next: NextFunction) {
    try {
      const record = await emergencyService.create(req.user.tenantId, req.body);
      res.status(201).json(record);
    } catch (error: any) {
      if (error.errors) return res.status(400).json({ error: error.errors });
      res.status(400).json({ error: error.message });
    }
  },

  async updateEmergencyContact(req: any, res: Response, next: NextFunction) {
    try {
      const record = await emergencyService.update(req.user.tenantId, req.params.id, req.body);
      res.json(record);
    } catch (error: any) {
      if (error.errors) return res.status(400).json({ error: error.errors });
      res.status(400).json({ error: error.message });
    }
  },

  async deleteEmergencyContact(req: any, res: Response, next: NextFunction) {
    try {
      await emergencyService.delete(req.user.tenantId, req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
};
