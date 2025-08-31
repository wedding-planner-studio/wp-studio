import { BaseService } from '../base-service';
import { UserStatus } from '@prisma/client';

export class UsersService extends BaseService {
  async getUser(userId: string) {
    const user = await this.db.user.findUnique({
      where: {
        id: userId,
        status: UserStatus.ACTIVE,
      },
    });
    return user;
  }

  async hasAccessToEvent(userId: string, eventId: string) {
    const { organizationId } = await this.getOrgFromUserSession();
    if (!eventId) {
      return ['ORG_ADMIN', 'ORG_MEMBER', 'SUDO'].includes(this.auth.role!);
    }

    await this.db.event.findUniqueOrThrow({
      where: {
        id: eventId,
        organizationId,
      },
    });

    if (['ORG_ADMIN', 'ORG_MEMBER', 'SUDO'].includes(this.auth.role!)) {
      return true;
    }

    const allowedToManage = await this.db.eventsAllowedToManage.findFirst({
      where: {
        eventId,
        userId,
      },
    });

    return !!allowedToManage;
  }
}
