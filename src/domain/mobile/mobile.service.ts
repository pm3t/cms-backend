import { prisma } from '../../prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { FacilityService } from '../facility/facility.service';
import { CommunicationService } from '../communication/communication.service';

const commService = new CommunicationService();

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

    prisma.memberActivityLog.create({
      data: { tenantId, memberId: member.id, action: 'REGISTER_ACCOUNT', device: 'MOBILE' }
    }).catch(err => console.error('Failed to log mobile activity:', err));

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

    prisma.memberActivityLog.create({
      data: { tenantId, memberId: member.id, action: 'LOGIN', device: 'MOBILE' }
    }).catch(err => console.error('Failed to log mobile activity:', err));

    return { token, member: this.excludeHash(member) };
  }

  async getProfile(memberId: string) {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        tenant: { select: { name: true } },
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

    prisma.memberActivityLog.create({
      data: { tenantId: member.tenantId, memberId: member.id, action: 'OPEN_APP', device: 'MOBILE' }
    }).catch(err => console.error('Failed to log mobile activity:', err));

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

    const registration = await prisma.eventRegistration.create({
      data: {
        eventId,
        memberId,
        name: `${member.firstName} ${member.lastName || ''}`.trim(),
        email: member.email,
        phone: member.phone,
        status: assignedStatus
      }
    });

    const subject = `Pendaftaran ${assignedStatus === 'WAITLISTED' ? 'Daftar Tunggu' : 'Dikonfirmasi'}: ${event.title}`;
    const body = `Halo ${member.firstName},\n\nPendaftaran Anda untuk acara "${event.title}" telah ${assignedStatus === 'WAITLISTED' ? 'masuk daftar tunggu' : 'berhasil dikonfirmasi'}.\n\nDetail Acara:\nWaktu: ${event.startDate.toLocaleString('id-ID')}\nLokasi: ${event.location || 'N/A'}\n\nTerima kasih!`;

    await commService.sendMessage(tenantId, {
      recipient: member.id,
      subject,
      body,
      channel: 'INBOX',
      qrContent: registration.id
    });

    prisma.memberActivityLog.create({
      data: { tenantId, memberId, action: 'REGISTER_EVENT', device: 'MOBILE' }
    }).catch(err => console.error('Failed to log mobile activity:', err));

    return registration;
  }

  async checkInEvent(memberId: string, tenantId: string, eventId: string) {
    const registration = await prisma.eventRegistration.findFirst({
      where: { eventId, memberId }
    });
    if (!registration) throw new Error('Anda belum terdaftar untuk acara ini. Silakan daftar terlebih dahulu.');
    if (registration.status === 'ATTENDED') throw new Error('Anda sudah melakukan check-in.');

    const updated = await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: {
        status: 'ATTENDED',
        checkInTime: new Date()
      }
    });

    prisma.memberActivityLog.create({
      data: { tenantId, memberId, action: 'CHECK_IN_EVENT', device: 'MOBILE' }
    }).catch(err => console.error('Failed to log mobile activity:', err));

    return updated;
  }

  async recordGiving(memberId: string, tenantId: string, data: any) {
    const amount = Number(data.amount);
    if (!amount || amount <= 0) throw new Error('Jumlah tidak valid');

    const record = await prisma.financialRecord.create({
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

    prisma.memberActivityLog.create({
      data: { tenantId, memberId, action: 'RECORD_GIVING', device: 'MOBILE' }
    }).catch(err => console.error('Failed to log mobile activity:', err));

    return record;
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
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) throw new Error('Member tidak ditemukan');

    const skill = await prisma.skill.findFirst({
      where: {
        id: skillId,
        OR: [
          { tenantId: member.tenantId },
          { tenantId: null }
        ]
      }
    });
    if (!skill) throw new Error('Keahlian tidak ditemukan atau akses ditolak');

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

    const prayer = await prisma.prayerRequest.create({
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

    prisma.memberActivityLog.create({
      data: { tenantId, memberId, action: 'SUBMIT_PRAYER', device: 'MOBILE' }
    }).catch(err => console.error('Failed to log mobile activity:', err));

    return prayer;
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

    const app = await prisma.volunteerApplication.create({
      data: { memberId, recruitmentId, notes }
    });

    prisma.member.findUnique({ where: { id: memberId }, select: { tenantId: true } }).then(member => {
      if (member) {
        prisma.memberActivityLog.create({
          data: { tenantId: member.tenantId, memberId, action: 'APPLY_VOLUNTEER', device: 'MOBILE' }
        }).catch(err => console.error('Failed to log mobile activity:', err));
      }
    });

    return app;
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

    await prisma.notification.create({
      data: {
        tenantId,
        memberId: member.id,
        type: 'SYSTEM',
        title: 'Reset Password OTP',
        body: `Kode OTP untuk mereset password Anda adalah: ${otp}. Kode ini berlaku selama 15 menit.`
      }
    });

    await prisma.communicationLog.create({
      data: {
        tenantId,
        recipient: member.email || member.phone || member.id,
        subject: 'Reset Password OTP',
        body: `Kode OTP untuk mereset password Anda adalah: ${otp}. Kode ini berlaku selama 15 menit.`,
        channel: 'INBOX',
        status: 'SENT'
      }
    });

    return { message: 'Kode OTP telah dikirim ke Inbox aplikasi Anda.' };
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

  async getCounselors(tenantId: string) {
    return prisma.user.findMany({
      where: { tenantId, isSuperAdmin: false },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' }
    });
  }

  async getMyCounselings(memberId: string) {
    return prisma.counselingRecord.findMany({
      where: { memberId },
      orderBy: { counselingDate: 'desc' }
    });
  }

  async createCounselingBooking(tenantId: string, memberId: string, data: any) {
    const { title, issueDescription, counselorId, counselingDate } = data;
    if (!title || !issueDescription || !counselingDate) {
      throw new Error('Semua kolom wajib diisi');
    }

    let counselorName = 'Pelayanan Pastoral Umum';
    if (counselorId) {
      const counselor = await prisma.user.findUnique({
        where: { id: counselorId }
      });
      if (counselor && counselor.tenantId === tenantId) {
        counselorName = counselor.name;
      }
    }

    const record = await prisma.counselingRecord.create({
      data: {
        tenantId,
        memberId,
        counselorId: counselorId || null,
        counselorName,
        counselingDate: new Date(counselingDate),
        title,
        issueDescription,
        notes: 'Sesi dijadwalkan via mobile jemaat',
        isPrivate: true
      }
    });

    prisma.memberActivityLog.create({
      data: { tenantId, memberId, action: 'BOOK_COUNSELING', device: 'MOBILE' }
    }).catch(err => console.error('Failed to log mobile activity:', err));

    return record;
  }

  async getFacilities(tenantId: string) {
    return prisma.facility.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        type: true,
        capacity: true,
        location: true,
        description: true,
        amenities: true
      },
      orderBy: { name: 'asc' }
    });
  }

  async getMyFacilityBookings(tenantId: string, memberId: string) {
    return prisma.facilityBooking.findMany({
      where: {
        tenantId,
        notes: {
          contains: `[MemberId: ${memberId}]`
        }
      },
      include: {
        facility: {
          select: {
            name: true,
            location: true
          }
        }
      },
      orderBy: { startTime: 'desc' }
    });
  }

  async createFacilityBooking(tenantId: string, memberId: string, data: any) {
    const { facilityId, purpose, description, startTime, endTime, userNotes } = data;
    if (!facilityId || !purpose || !startTime || !endTime) {
      throw new Error('Semua kolom wajib diisi');
    }

    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) throw new Error('Member tidak ditemukan');
    const fullName = [member.firstName, member.lastName].filter(Boolean).join(' ');

    const facilityService = new FacilityService();
    // Validate facility belongs to tenant
    await facilityService.get(tenantId, facilityId);

    // Check conflicts
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      throw new Error('Waktu selesai harus setelah waktu mulai');
    }

    const { available, conflict } = await facilityService.checkAvailability(
      tenantId, facilityId, start, end
    );

    if (!available) {
      throw new Error(`Fasilitas sudah dipesan oleh "${conflict?.requestedBy}" pada waktu tersebut.`);
    }

    const notesTag = `[MemberId: ${memberId}]`;
    const finalNotes = userNotes ? `${userNotes.trim()}\n${notesTag}` : notesTag;

    const booking = await prisma.facilityBooking.create({
      data: {
        tenantId,
        facilityId,
        requestedBy: fullName,
        purpose,
        description,
        startTime: start,
        endTime: end,
        status: 'PENDING',
        notes: finalNotes
      },
      include: {
        facility: {
          select: {
            name: true
          }
        }
      }
    });

    prisma.memberActivityLog.create({
      data: { tenantId, memberId, action: 'BOOK_FACILITY', device: 'MOBILE' }
    }).catch(err => console.error('Failed to log mobile activity:', err));

    return booking;
  }

  async getSmallGroups(tenantId: string, memberId: string) {
    const groups = await prisma.smallGroup.findMany({
      where: { tenantId },
      include: {
        members: {
          include: {
            member: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true
              }
            }
          }
        },
        joinRequests: {
          where: { memberId }
        }
      },
      orderBy: { name: 'asc' }
    });

    return groups.map(g => {
      const isJoined = g.members.some(m => m.memberId === memberId);
      const joinRequest = g.joinRequests[0];
      const leaderMember = g.members.find(m => m.role === 'LEADER');
      const leaderName = leaderMember ? `${leaderMember.member.firstName} ${leaderMember.member.lastName || ''}`.trim() : 'Belum ada ketua';
      const leaderPhone = leaderMember ? leaderMember.member.phone : null;
      const leaderEmail = leaderMember ? leaderMember.member.email : null;

      return {
        id: g.id,
        name: g.name,
        description: g.description,
        type: g.type,
        meetingSchedule: g.meetingSchedule,
        location: g.location,
        memberCount: g.members.length,
        isJoined,
        joinStatus: joinRequest ? joinRequest.status : null,
        leader: {
          name: leaderName,
          phone: leaderPhone,
          email: leaderEmail
        }
      };
    });
  }

  async requestToJoinSmallGroup(tenantId: string, memberId: string, groupId: string, userNotes?: string) {
    const group = await prisma.smallGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            member: true
          }
        }
      }
    });

    if (!group || group.tenantId !== tenantId) {
      throw new Error('Kelompok sel tidak ditemukan.');
    }

    const isMember = group.members.some(m => m.memberId === memberId);
    if (isMember) {
      throw new Error('Anda sudah bergabung dalam kelompok sel ini.');
    }

    const requester = await prisma.member.findUnique({
      where: { id: memberId }
    });
    if (!requester) {
      throw new Error('Anggota tidak ditemukan.');
    }

    const request = await prisma.smallGroupJoinRequest.upsert({
      where: {
        groupId_memberId: {
          groupId,
          memberId
        }
      },
      update: {
        status: 'PENDING',
        notes: userNotes || null
      },
      create: {
        tenantId,
        groupId,
        memberId,
        status: 'PENDING',
        notes: userNotes || null
      }
    });

    const leader = group.members.find(m => m.role === 'LEADER');
    if (leader) {
      const requesterName = `${requester.firstName} ${requester.lastName || ''}`.trim();
      await prisma.notification.create({
        data: {
          tenantId,
          memberId: leader.memberId,
          type: 'SYSTEM',
          title: `Permohonan Gabung Kelompok Sel - ${group.name}`,
          body: `Halo ${leader.member.firstName},\n\n` +
                `Jemaat atas nama ${requesterName} mengajukan permohonan untuk bergabung dalam kelompok sel Anda (${group.name}).\n\n` +
                `Detail Pemohon:\n` +
                `- Nama: ${requesterName}\n` +
                `- Telepon: ${requester.phone || '-'}\n` +
                `- Email: ${requester.email || '-'}\n` +
                `- Catatan: ${userNotes || '-'}\n\n` +
                `Mohon segera hubungi ybs untuk proses penyambutan/pemuridan lebih lanjut.`
        }
      });
    }

    prisma.memberActivityLog.create({
      data: { tenantId, memberId, action: 'JOIN_SMALL_GROUP', device: 'MOBILE' }
    }).catch(err => console.error('Failed to log mobile activity:', err));

    return request;
  }

  async getSacramentRequests(tenantId: string, memberId: string) {
    return prisma.sacramentRequest.findMany({
      where: { tenantId, memberId },
      include: {
        certificate: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createSacramentRequest(tenantId: string, memberId: string, data: any) {
    const { type, pastorName, date, location, requirements } = data;
    
    // verify member
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member || member.tenantId !== tenantId) {
      throw new Error('Anggota tidak ditemukan');
    }

    return prisma.sacramentRequest.create({
      data: {
        tenantId,
        memberId,
        type,
        status: 'PENDING',
        pastorName: pastorName || null,
        date: date ? new Date(date) : null,
        location: location || null,
        requirements: requirements || null
      }
    });
  }
}

