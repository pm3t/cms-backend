import { prisma } from '../../prisma';
import { Notification, NotificationType } from '@prisma/client';

export class NotificationService {
  /**
   * Create a single notification
   */
  async create(data: {
    tenantId: string;
    memberId: string | null;
    type: NotificationType;
    title: string;
    body: string;
    data?: any;
  }): Promise<Notification> {
    return prisma.notification.create({
      data: {
        tenantId: data.tenantId,
        memberId: data.memberId,
        type: data.type,
        title: data.title,
        body: data.body,
        data: data.data || null,
      },
    });
  }

  /**
   * Create bulk notifications for multiple members
   */
  async createBulk(
    tenantId: string,
    memberIds: string[],
    payload: {
      type: NotificationType;
      title: string;
      body: string;
      data?: any;
    }
  ): Promise<void> {
    const dataToInsert = memberIds.map((memberId) => ({
      tenantId,
      memberId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data || null,
    }));

    if (dataToInsert.length > 0) {
      await prisma.notification.createMany({
        data: dataToInsert,
      });
    }
  }

  /**
   * Fetch notifications for a specific member (with pagination)
   */
  async getByMember(memberId: string, page: number = 1, limit: number = 20): Promise<{
    notifications: Notification[];
    unreadCount: number;
  }> {
    const skip = (page - 1) * limit;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { memberId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({
        where: { memberId, isRead: false },
      }),
    ]);

    return {
      notifications,
      unreadCount,
    };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(id: string, memberId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id, memberId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications for a member as read
   */
  async markAllAsRead(memberId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { memberId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }
}
