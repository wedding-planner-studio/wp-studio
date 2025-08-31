import { BaseService } from '../base-service';
import { TwilioService } from '../twilio';
import { CreateWhatsAppTemplateType } from './schema/whatsapp-write.schema';

export class WhatsappService extends BaseService {
  async fetchTemplates() {
    const { organizationId } = await this.getOrgFromUserSession();
    const twilioService = new TwilioService({ organizationId, db: this.db });
    const templates = await twilioService.fetchWhatsAppTemplates();

    // Since we use "soft" delete, we need to filter out the hidden templates
    const hiddenTemplates = await this.db.hiddenWhatsappTemplates.findMany({
      where: {
        organizationId,
      },
    });
    const hiddenTemplateSids = hiddenTemplates.map(template => template.templateSid);
    return templates.filter(template => !hiddenTemplateSids.includes(template.sid));
  }

  async fetchTemplateById(id: string, ignoreCache = false) {
    const { organizationId } = await this.getOrgFromUserSession();
    const twilioService = new TwilioService({ organizationId, db: this.db });
    return twilioService.fetchWhatsAppTemplateById(id, ignoreCache);
  }

  async createTemplate(params: CreateWhatsAppTemplateType) {
    const { organizationId } = await this.getOrgFromUserSession();
    const twilioService = new TwilioService({ organizationId, db: this.db });
    return twilioService.createWhatsAppTemplate(params);
  }

  async deleteTemplate(contentSid: string) {
    const { organizationId } = await this.getOrgFromUserSession();
    // Do not directly delete the template, we need to hide it instead
    await this.db.hiddenWhatsappTemplates.create({
      data: {
        organizationId,
        templateSid: contentSid,
      },
    });
  }
}
