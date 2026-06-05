import { prisma } from '../../prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import nodemailer from 'nodemailer';

const jwtSecret = process.env.JWT_SECRET || 'secret';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  pushToken: z.string().optional(),
});

export class MobileService {
  async register(tenantId: string, data: any) {
    const parsed = registerSchema.parse(data);
    
    // Check if member exists
    const existing = await prisma.member.findFirst({
      where: { tenantId, email: parsed.email }
    });

    const passwordHash = await bcrypt.hash(parsed.password, 10);

    let member;
    if (existing) {
      // Claim account
      if (existing.passwordHash) throw new Error('Akun ini sudah terdaftar');
      member = await prisma.member.update({
        where: { id: existing.id },
        data: { passwordHash }
      });
    } else {
      // Create new member
      member = await prisma.member.create({
        data: {
          tenantId,
          email: parsed.email,
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          phone: parsed.phone,
          passwordHash
        }
      });
    }

    const token = jwt.sign({ memberId: member.id, tenantId }, jwtSecret, { expiresIn: '30d' });
    return { token, member: this.excludeHash(member) };
  }

  async login(tenantId: string, data: any) {
    const parsed = loginSchema.parse(data);

    const member = await prisma.member.findFirst({
      where: { tenantId, email: parsed.email }
    });

    if (!member || !member.passwordHash) throw new Error('Email atau kata sandi salah');

    const valid = await bcrypt.compare(parsed.password, member.passwordHash);
    if (!valid) throw new Error('Email atau kata sandi salah');

    if (parsed.pushToken) {
      await prisma.member.update({ where: { id: member.id }, data: { pushToken: parsed.pushToken } });
    }

    const token = jwt.sign({ memberId: member.id, tenantId }, jwtSecret, { expiresIn: '30d' });
    return { token, member: this.excludeHash(member) };
  }

  async getProfile(memberId: string) {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        family: {
          include: {
            members: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        },
        sacraments: true,
        skills: {
          include: {
            skill: true
          }
        },
        donations: { orderBy: { date: 'desc' }, take: 5 },
        attendance: { orderBy: { createdAt: 'desc' }, take: 5, include: { worshipService: true } },
      }
    });
    if (!member) throw new Error('Member tidak ditemukan');
    return this.excludeHash(member);
  }

  async getUpcomingEvents(memberId: string, tenantId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const events = await prisma.event.findMany({
      where: {
        tenantId,
        startDate: { gte: todayStart }
      },
      include: {
        registrations: {
          where: { memberId }
        },
        _count: {
          select: { registrations: true }
        }
      },
      orderBy: { startDate: 'asc' },
      take: 10
    });

    return events.map(e => ({
      id: e.id,
      name: e.title,
      location: e.location || 'Lokasi belum ditentukan',
      startTime: e.startDate.toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }),
      description: e.description || null,
      registrantCount: e._count.registrations,
      isRegistered: e.registrations.length > 0,
      registrationId: e.registrations[0]?.id || null,
      registrationStatus: e.registrations[0]?.status || null
    }));
  }

  async registerForEvent(memberId: string, tenantId: string, eventId: string) {
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) throw new Error('Member tidak ditemukan');

    const existing = await prisma.eventRegistration.findFirst({
      where: { eventId, memberId }
    });
    if (existing) throw new Error('Anda sudah terdaftar di acara ini');

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: {
          select: { registrations: { where: { status: 'REGISTERED' } } }
        }
      }
    });
    if (!event) throw new Error('Acara tidak ditemukan');
    if (!event.isRegistrationOpen) throw new Error('Pendaftaran untuk acara ini sudah ditutup');

    let assignedStatus: 'REGISTERED' | 'WAITLISTED' = 'REGISTERED';
    if (event.capacity !== null && event._count.registrations >= event.capacity) {
      assignedStatus = 'WAITLISTED';
    }

    return prisma.eventRegistration.create({
      data: {
        eventId,
        memberId,
        name: `${member.firstName} ${member.lastName || ''}`.trim(),
        email: member.email,
        phone: member.phone,
        status: assignedStatus
      }
    });
  }

  async checkInEvent(memberId: string, tenantId: string, eventId: string) {
    const registration = await prisma.eventRegistration.findFirst({
      where: { eventId, memberId }
    });
    if (!registration) throw new Error('Anda belum terdaftar untuk acara ini. Silakan daftar terlebih dahulu.');
    if (registration.status === 'ATTENDED') throw new Error('Anda sudah melakukan check-in.');

    return prisma.eventRegistration.update({
      where: { id: registration.id },
      data: {
        status: 'ATTENDED',
        checkInTime: new Date()
      }
    });
  }

  async recordGiving(memberId: string, tenantId: string, data: any) {
    const amount = Number(data.amount);
    if (!amount || amount <= 0) throw new Error('Jumlah tidak valid');

    return prisma.financialRecord.create({
      data: {
        tenantId,
        memberId,
        type: 'OFFERING',
        amount,
        category: 'Mobile App Giving',
        description: data.description || 'Pemberian via Mobile App',
        receiptCode: `MOB-${Date.now()}`,
        paymentStatus: 'PENDING', // Assuming gateway integration later
        proofUrl: data.proofUrl || null
      }
    });
  }

  async updateProfile(memberId: string, data: any) {
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) throw new Error('Member tidak ditemukan');

    const updated = await prisma.member.update({
      where: { id: memberId },
      data: {
        firstName: data.firstName || member.firstName,
        lastName: data.lastName !== undefined ? data.lastName : member.lastName,
        phone: data.phone !== undefined ? data.phone : member.phone,
        address: data.address !== undefined ? data.address : member.address
      }
    });

    return this.excludeHash(updated);
  }

  async updateProfilePhoto(memberId: string, photoUrl: string) {
    const updated = await prisma.member.update({
      where: { id: memberId },
      data: { photoUrl }
    });
    return this.excludeHash(updated);
  }

  async getFamilies(tenantId: string) {
    return prisma.family.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' }
    });
  }

  async createFamily(memberId: string, tenantId: string, name: string) {
    const family = await prisma.family.create({
      data: {
        name,
        tenantId,
        headOfFamilyId: memberId
      }
    });

    await prisma.member.update({
      where: { id: memberId },
      data: { familyId: family.id }
    });

    return family;
  }

  async joinFamily(memberId: string, familyId: string) {
    return prisma.member.update({
      where: { id: memberId },
      data: { familyId }
    });
  }

  async leaveFamily(memberId: string) {
    return prisma.member.update({
      where: { id: memberId },
      data: { familyId: null }
    });
  }

  async addSacrament(memberId: string, data: any) {
    return prisma.sacramentRecord.create({
      data: {
        memberId,
        type: data.type,
        date: new Date(data.date),
        location: data.location || null,
        pastorName: data.pastorName || null
      }
    });
  }

  async deleteSacrament(memberId: string, sacramentId: string) {
    return prisma.sacramentRecord.deleteMany({
      where: { id: sacramentId, memberId }
    });
  }

  async getSkills(tenantId: string) {
    return prisma.skill.findMany({
      where: {
        OR: [
          { tenantId },
          { tenantId: null }
        ]
      },
      orderBy: { name: 'asc' }
    });
  }

  async addMemberSkill(memberId: string, skillId: string, proficiency: number = 3) {
    return prisma.memberSkill.upsert({
      where: { memberId_skillId: { memberId, skillId } },
      update: { proficiency },
      create: { memberId, skillId, proficiency }
    });
  }

  async removeMemberSkill(memberId: string, skillId: string) {
    return prisma.memberSkill.deleteMany({
      where: { memberId, skillId }
    });
  }

  async createAndAddSkill(memberId: string, skillName: string, proficiency: number = 3) {
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) throw new Error('Member tidak ditemukan');

    let skill = await prisma.skill.findFirst({
      where: { 
        name: skillName,
        OR: [
          { tenantId: member.tenantId },
          { tenantId: null }
        ]
      }
    });
    if (!skill) {
      skill = await prisma.skill.create({
        data: { name: skillName, tenantId: member.tenantId }
      });
    }
    return this.addMemberSkill(memberId, skill.id, proficiency);
  }

  // --- Mobile Prayer Requests ---
  async getMyPrayers(memberId: string, tenantId: string) {
    return prisma.prayerRequest.findMany({
      where: { tenantId, memberId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getPublicPrayers(memberId: string, tenantId: string) {
    return prisma.prayerRequest.findMany({
      where: {
        tenantId,
        isPrivate: false,
        NOT: { memberId }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createMyPrayer(memberId: string, tenantId: string, data: any) {
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) throw new Error('Member tidak ditemukan');

    const content = data.content;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('Isi pokok doa wajib diisi');
    }

    return prisma.prayerRequest.create({
      data: {
        tenantId,
        memberId,
        requesterName: data.isAnonymous ? 'Anonim' : `${member.firstName} ${member.lastName || ''}`.trim(),
        requesterEmail: member.email,
        requesterPhone: member.phone,
        content: content.trim(),
        isAnonymous: !!data.isAnonymous,
        isPrivate: !!data.isPrivate,
        status: 'PENDING'
      }
    });
  }

  async prayForRequest(tenantId: string, id: string) {
    const record = await prisma.prayerRequest.findUnique({ where: { id } });
    if (!record || record.tenantId !== tenantId) {
      throw new Error('Prayer request tidak ditemukan');
    }

    return prisma.prayerRequest.update({
      where: { id },
      data: {
        prayerCount: { increment: 1 }
      }
    });
  }

  async getVolunteerRecruitments(tenantId: string) {
    return prisma.volunteerRecruitment.findMany({
      where: { 
        ministry: { tenantId },
        status: 'OPEN'
      },
      include: {
        ministry: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async applyForVolunteer(memberId: string, recruitmentId: string, notes?: string) {
    const existing = await prisma.volunteerApplication.findFirst({
      where: { memberId, recruitmentId }
    });
    if (existing) throw new Error('Anda sudah mendaftar untuk lowongan pelayanan ini');

    return prisma.volunteerApplication.create({
      data: { memberId, recruitmentId, notes }
    });
  }

  async getMyRosters(memberId: string) {
    return prisma.servicePosition.findMany({
      where: { memberId },
      include: {
        roster: {
          include: {
            ministry: { select: { name: true } },
            worshipService: { select: { name: true } },
            event: { select: { title: true } }
          }
        }
      },
      orderBy: {
        roster: {
          date: 'asc'
        }
      }
    });
  }

  async forgotPassword(tenantId: string, email: string) {
    const member = await prisma.member.findFirst({
      where: { email: email.trim().toLowerCase(), tenantId }
    });
    if (!member) {
      throw new Error('Email tidak terdaftar pada gereja ini');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15);

    await prisma.member.update({
      where: { id: member.id },
      data: {
        resetOtp: otp,
        resetOtpExpires: expires
      }
    });

    console.log(`[forgotPassword] OTP reset code for member ${member.firstName}: ${otp}`);

    await prisma.communicationLog.create({
      data: {
        tenantId,
        recipient: member.email!,
        subject: 'Reset Password OTP',
        body: `Kode OTP untuk mereset password Anda adalah: ${otp}. Kode ini berlaku selama 15 menit.`,
        channel: 'EMAIL',
        status: 'SENT'
      }
    });

    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_PORT === '465',
          auth: { user: smtpUser, pass: smtpPass }
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM || smtpUser,
          to: member.email!,
          subject: 'Reset Password OTP',
          text: `Kode OTP untuk mereset password Anda adalah: ${otp}. Kode ini berlaku selama 15 menit.`
        });
      } catch (err) {
        console.error('Failed to send SMTP email:', err);
      }
    }

    return { message: 'Kode OTP telah dikirim ke email Anda.' };
  }

  async resetPassword(tenantId: string, data: any) {
    const { email, otp, newPassword } = data;
    if (!email || !otp || !newPassword) {
      throw new Error('Email, OTP, dan Password baru wajib diisi');
    }
    if (newPassword.length < 6) {
      throw new Error('Password minimal 6 karakter');
    }

    const member = await prisma.member.findFirst({
      where: { 
        email: email.trim().toLowerCase(), 
        tenantId 
      }
    });

    if (!member) {
      throw new Error('Email tidak terdaftar');
    }

    if (!member.resetOtp || member.resetOtp !== otp) {
      throw new Error('Kode OTP tidak valid');
    }

    if (!member.resetOtpExpires || new Date() > member.resetOtpExpires) {
      throw new Error('Kode OTP sudah kedaluwarsa');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.member.update({
      where: { id: member.id },
      data: {
        passwordHash,
        resetOtp: null,
        resetOtpExpires: null
      }
    });

    return { message: 'Password berhasil direset. Silakan login kembali.' };
  }

  private excludeHash(member: any) {
    const { passwordHash, ...rest } = member;
    return rest;
  }
}

