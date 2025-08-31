import twilio, { Twilio } from 'twilio';
import { validateRequest } from 'twilio/lib/webhooks/webhooks';
import { getRawBody } from '@/lib/utils';
import { env } from '@/env';
import { Redis } from '@upstash/redis';
import { UnauthedService, UnauthedServiceOptions } from './unauthed-service';
import crypto from 'crypto';
import { CreateWhatsAppTemplateType } from './whatsapp/schema/whatsapp-write.schema';
import { TRPCError } from '@trpc/server';

const algorithm = 'aes-256-gcm';

export class TwilioService extends UnauthedService {
  private _client?: Twilio;

  private organizationId: string;

  public organizationPhoneNumber?: string;

  private redis: Redis;

  constructor({ organizationId, db }: UnauthedServiceOptions & { organizationId: string }) {
    super({ db });
    this.organizationId = organizationId;
    this.redis = Redis.fromEnv();
  }

  private async loadCredentials(): Promise<{
    encryptedAuthToken: string;
    subAccountSid: string;
    organizationPhoneNumber: string;
  }> {
    const credentials = await this.db.twilioCredentials.findUnique({
      where: { organizationId: this.organizationId },
      select: {
        subAccountSid: true,
        encryptedAuthToken: true,
        organization: {
          select: {
            phoneNumber: true,
          },
        },
      },
    });
    if (!credentials || !credentials.organization?.phoneNumber) {
      throw new Error('Invalid twilio configuration');
    }
    return {
      subAccountSid: credentials.subAccountSid,
      encryptedAuthToken: credentials.encryptedAuthToken,
      organizationPhoneNumber: credentials.organization.phoneNumber,
    };
  }

  private async getClient() {
    if (!this._client) {
      const credentials = await this.loadCredentials();
      const decryptedToken = await this.decryptToken(credentials.encryptedAuthToken);
      this._client = twilio(credentials.subAccountSid, decryptedToken);
      this.organizationPhoneNumber = credentials.organizationPhoneNumber;
    }
    return this._client;
  }

  private async decryptToken(encrypted: string) {
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted token format');
    }
    const [ivHex, authTagHex, encryptedHex] = parts;

    // Ensure parts are not undefined (TypeScript should infer this, but explicit check for clarity)
    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new Error('Invalid encrypted token format: missing parts');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encryptedData = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv(
      algorithm,
      Buffer.from(env.TWILIO_TOKEN_ENCRYPTION_KEY, 'hex'),
      iv
    );
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

    return decrypted.toString('utf8');
  }

  /**
   * Validates a Twilio request
   * @param request - The request object
   * @param url - The URL of the request
   * @param rawBody - The raw body of the request
   * @returns true if the request is valid, false otherwise
   */
  public async isValidTwilioRequest(
    request: Request,
    url: string,
    rawBody: string
  ): Promise<boolean> {
    const twilioSignature = request.headers.get('x-twilio-signature');
    if (!twilioSignature) {
      console.warn('Missing x-twilio-signature header');
      return false;
    }
    if (!rawBody) {
      console.warn('Received empty body for validation');
      return false;
    }
    try {
      if (env.NODE_ENV === 'development') {
        return true;
      }
      const credentials = await this.loadCredentials();
      const decryptedToken = await this.decryptToken(credentials.encryptedAuthToken);
      return validateRequest(
        decryptedToken,
        twilioSignature,
        url.replace('[organizationId]', this.organizationId),
        Object.fromEntries(new URLSearchParams(rawBody))
      );
    } catch (error) {
      console.error('Error during Twilio request validation:', error);
      if (error instanceof Error && error.message.includes('Invalid twilio configuration')) {
        // Specific handling for config errors if needed
      }
      return false;
    }
  }

  public async fetchWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
    try {
      // First, fetch the content templates
      const contentResponse = await this.getClient().then(client =>
        client.request({
          method: 'get',
          uri: `https://content.twilio.com/v1/Content`,
        })
      );

      if (!contentResponse?.body?.contents) {
        return [];
      }

      // Fetch approval status for each template
      const templates = await Promise.all(
        contentResponse.body.contents.map(async content => {
          try {
            // Get approval status for each template
            const approvalResponse = await this.getClient().then(client =>
              client.request({
                method: 'get',
                uri: `https://content.twilio.com/v1/Content/${content.sid}/ApprovalRequests`,
              })
            );

            const whatsappApproval = approvalResponse.body?.whatsapp || {};
            const templateType = content.types?.['twilio/media']
              ? 'Media'
              : content.types?.['whatsapp/card']
                ? 'Card'
                : content.types?.['twilio/call-to-action']
                  ? 'CallToAction'
                  : 'Text';

            return {
              sid: content.sid,
              date_updated: content.date_updated,
              date_created: content.date_created,
              name: content.friendly_name ?? 'Unnamed Template',
              description: getTemplateDescription(content.types),
              variables: Object.keys(content.variables ?? {}),
              language: content.language ?? 'en',
              contentType: templateType,
              lastUpdated: content.date_updated,
              // WhatsApp specific fields
              category: whatsappApproval.category,
              approvalStatus: whatsappApproval.status,
              rejectionReason: whatsappApproval.rejection_reason,
              // Map the WhatsApp approval status to our status field
              status: whatsappApproval.status || 'unknown',
              // Add media URLs if present
              media:
                content.types?.['twilio/media']?.media ||
                content.types?.['whatsapp/card']?.media ||
                [],
            };
          } catch (error) {
            console.error(`Error fetching approval status for template ${content.sid}:`, error);
            // Return template with unknown status
            const templateType = content.types?.['twilio/media']
              ? 'Media'
              : content.types?.['whatsapp/card']
                ? 'Card'
                : content.types?.['twilio/call-to-action']
                  ? 'CallToAction'
                  : 'Text';

            return {
              sid: content.sid,
              name: content.friendly_name ?? 'Unnamed Template',
              description: getTemplateDescription(content.types),
              variables: Object.keys(content.variables ?? {}),
              language: content.language ?? 'en',
              contentType: templateType,
              lastUpdated: content.date_updated,
              approvalStatus: 'unknown',
              status: 'unknown',
              media:
                content.types?.['twilio/media']?.media ||
                content.types?.['whatsapp/card']?.media ||
                [],
            };
          }
        })
      );

      return templates;
    } catch (error) {
      console.error('Error fetching WhatsApp templates:', error);
      throw error;
    }
  }

  /**
   * Fetches a WhatsApp template by its ID
   * @param id - The ID of the template to fetch
   * @returns The fetched template
   */
  public async fetchWhatsAppTemplateById(
    id: string,
    ignoreCache = false
  ): Promise<WhatsAppTemplate> {
    // Try to get from cache first
    const cacheKey = `twilio:template:${id}`;
    const cached = await this.redis.get<WhatsAppTemplate>(cacheKey);
    if (cached && !ignoreCache) {
      return cached;
    }

    const template = await this.getClient().then(client =>
      client.request({
        method: 'get',
        uri: `https://content.twilio.com/v1/Content/${id}`,
      })
    );
    if (template.statusCode !== 200) {
      throw new Error('Failed to fetch WhatsApp template');
    }

    // Get approval status
    const approvalResponse = await this.getClient().then(client =>
      client.request({
        method: 'get',
        uri: `https://content.twilio.com/v1/Content/${id}/ApprovalRequests`,
      })
    );

    const whatsappApproval = approvalResponse.body?.whatsapp || {};

    // Determine template type based on the content
    const templateType = template.body.types?.['twilio/media']
      ? 'Media'
      : template.body.types?.['whatsapp/card']
        ? 'Card'
        : template.body.types?.['twilio/call-to-action']
          ? 'CallToAction'
          : 'Text';

    // Get media URLs if present
    const mediaUrls =
      template.body.types?.['twilio/media']?.media ||
      template.body.types?.['whatsapp/card']?.media ||
      [];

    const whatsappTemplate = {
      sid: template.body.sid,
      name: template.body.friendly_name,
      description: getTemplateDescription(template.body.types),
      variables: Object.keys(template.body.variables ?? {}),
      language: template.body.language,
      status: whatsappApproval.status || 'unknown',
      category: whatsappApproval.category,
      approvalStatus: whatsappApproval.status,
      rejectionReason: whatsappApproval.rejection_reason,
      contentType: templateType,
      lastUpdated: template.body.date_updated,
      media: mediaUrls,
    };

    // Cache the template for 1 hour
    await this.redis.set(cacheKey, whatsappTemplate, { ex: 3600 });

    return whatsappTemplate;
  }

  public async sendWhatsAppTemplate({
    to,
    templateSid,
    variables = {},
    mediaUrls,
  }: WhatsAppTemplateMessage) {
    try {
      const formattedTo = formatPhoneNumberForWhatsApp(to);

      // Normalize special characters in variables
      const normalizedVariables = Object.fromEntries(
        Object.entries(variables).map(([key, value]) => [
          key,
          typeof value === 'string' ? normalizeSpecialCharacters(value) : value,
        ])
      );

      const message = await this.getClient().then(client => {
        if (!this.organizationPhoneNumber) {
          throw new Error('No organization phone number found');
        }
        const formattedFrom = formatPhoneNumberForWhatsApp(this.organizationPhoneNumber);
        return client.messages.create({
          from: formattedFrom,
          to: formattedTo,
          contentSid: templateSid,
          contentVariables: JSON.stringify(normalizedVariables),
          mediaUrl: mediaUrls,
        });
      });

      return {
        success: true,
        messageId: message.sid,
      };
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error;
    }
  }

  async createWhatsAppTemplate(params: CreateWhatsAppTemplateType) {
    const { name, category, language, content, sample, includeMedia, mediaFileType } = params;
    // Split sample values into array and create variables object
    const variables: Record<string, string> = {};
    const sampleValues = sample ? sample.split(',').map((s: string) => s.trim()) : [];
    sampleValues.forEach((value, index) => {
      variables[`${index + 1}`] = value;
    });

    const countVariables = (content: string) => {
      const regex = /\{(\d+)\}/g;
      const matches = content.match(regex);
      return matches ? matches.length : 0;
    };

    const totalVariables = countVariables(content);
    const hasValidVariables = totalVariables === Object.keys(variables).length;

    if (!hasValidVariables) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid number of variables. Please check the template content and try again.',
      });
    }

    const body: any = {
      friendly_name: name,
      language,
      variables,
      types: {
        'twilio/text': {
          body: content,
        },
      },
    };

    if (includeMedia && mediaFileType) {
      const mediaUrl = `${env.CDN_URL}/{{${totalVariables + 1}}}.${mediaFileType.split('/')[1]}`;
      variables[`${totalVariables + 1}`] = 'sample';
      delete body.types['twilio/text'];
      body.types['twilio/media'] = {
        body: content,
        media: [mediaUrl],
      };
    }
    const credentials = await this.loadCredentials();
    const decryptedToken = await this.decryptToken(credentials.encryptedAuthToken);
    // Create the template using Twilio's Content API
    const response = await fetch('https://content.twilio.com/v1/Content', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${credentials.subAccountSid}:${decryptedToken}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create template');
    }

    const contentTemplate = await response.json();

    // Submit the template for WhatsApp approval
    const approvalResponse = await fetch(
      `https://content.twilio.com/v1/Content/${contentTemplate.sid}/ApprovalRequests/whatsapp`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${credentials.subAccountSid}:${decryptedToken}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'), // Convert to valid WhatsApp template name
          category: 'UTILITY',
          allow_category_change: true,
        }),
      }
    );

    if (!approvalResponse.ok) {
      const error = await approvalResponse.json();
      throw new Error(error.message || 'Failed to submit template for approval');
    }

    const approvalResult = await approvalResponse.json();

    return {
      success: true,
      contentSid: contentTemplate.sid,
      approvalStatus: approvalResult.status,
      whatsappTemplateName: approvalResult.name,
    };
  }

  async deleteWhatsAppTemplate(contentSid: string) {
    const credentials = await this.loadCredentials();
    const decryptedToken = await this.decryptToken(credentials.encryptedAuthToken);
    const response = await fetch(`https://content.twilio.com/v1/Content/${contentSid}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Basic ${Buffer.from(`${credentials.subAccountSid}:${decryptedToken}`).toString('base64')}`,
      },
    });

    if (!response.ok) {
      // For DELETE, a 204 response is expected
      if (response.status !== 204) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(error.message || `Failed to delete template (Status: ${response.status})`);
      }
    }

    return {
      success: true,
      message: 'Template deleted successfully',
    };
  }

  public downloadAudio = async (audioUrl: string) => {
    const credentials = await this.loadCredentials();
    const decryptedToken = await this.decryptToken(credentials.encryptedAuthToken);

    const audioRes = await fetch(audioUrl, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${credentials.subAccountSid}:${decryptedToken}`).toString('base64')}`,
      },
    });

    const audioBuffer = await audioRes.arrayBuffer();
    return audioBuffer;
  };

  async sendWhatsAppMessage({ to, body }: { to: string; body: string }) {
    return this.getClient().then(client => {
      if (!this.organizationPhoneNumber) {
        throw new Error('No organization phone number found');
      }

      return client.messages.create({
        from: formatPhoneNumberForWhatsApp(this.organizationPhoneNumber),
        to: formatPhoneNumberForWhatsApp(to),
        body,
      });
    });
  }
}

export type WhatsAppTemplateMessage = {
  to: string;
  templateSid: string;
  variables?: Record<string, string>;
  mediaUrls?: string[];
};

export interface WhatsAppTemplate {
  sid: string;
  name: string;
  description?: string;
  variables: string[];
  language: string;
  status: string;
  category?: string;
  approvalStatus?: string;
  rejectionReason?: string;
  lastUpdated?: string;
  contentType?: string;
  media?: Array<string>;
}

export interface WhatsAppTemplateResponse {
  statusCode: number;
  body: {
    account_sid: string;
    date_created: string;
    date_updated: string;
    friendly_name: string;
    language: string;
    links: {
      approval_create: string;
      approval_fetch: string;
    };
    sid: string;
    types: {
      'twilio/text': {
        body: string;
      };
    };
    url: string;
    variables: Record<string, string>;
  };
}

function formatPhoneNumberForWhatsApp(phoneNumber: string): string {
  // Remove any non-digit characters except the plus sign
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  // Add whatsapp: prefix
  return `whatsapp:${cleaned}`;
}

interface TemplateTypes {
  'twilio/text'?: {
    body: string;
  };
  'twilio/media'?: {
    body: string;
    media: string[];
  };
  'whatsapp/card'?: {
    body: string;
    header_text?: string | null;
    footer?: string | null;
    media?: Array<any>;
    actions?: Array<{
      type: string;
      title: string;
      phone?: string;
      url?: string;
    }>;
  };
  'twilio/call-to-action'?: {
    body: string;
    actions?: Array<{
      type: string;
      title: string;
      url?: string;
      id?: string | null;
    }>;
  };
}

function getTemplateDescription(types: TemplateTypes | undefined): string | undefined {
  if (!types) return undefined;

  if (types['twilio/text']) {
    return types['twilio/text'].body;
  }

  if (types['twilio/media']) {
    return types['twilio/media'].body;
  }

  if (types['whatsapp/card']) {
    const card = types['whatsapp/card'];
    const parts: string[] = [];
    if (card.header_text) parts.push(`Header: ${card.header_text}`);
    if (card.body) parts.push(`Body: ${card.body}`);
    if (card.footer) parts.push(`Footer: ${card.footer}`);
    if (card.actions?.length) {
      const actionTexts = card.actions
        .map(
          action =>
            `${action.title} (${action.type}${action.phone ? ': ' + action.phone : ''}${action.url ? ': ' + action.url : ''})`
        )
        .join(', ');
      parts.push(`Actions: ${actionTexts}`);
    }
    return parts.join(' | ');
  }

  if (types['twilio/call-to-action']) {
    const cta = types['twilio/call-to-action'];
    const parts: string[] = [];
    if (cta.body) parts.push(`Body: ${cta.body}`);
    if (cta.actions?.length) {
      const actionTexts = cta.actions
        .map(action => `${action.title} (${action.type}${action.url ? ': ' + action.url : ''})`)
        .join(', ');
      parts.push(`Actions: ${actionTexts}`);
    }
    return parts.join(' | ');
  }

  return undefined;
}

// Add this helper function to normalize special characters
function normalizeSpecialCharacters(text: string): string {
  return text
    .replace(/'/g, '´') // Replace regular apostrophe with acute accent
    .replace(/'/g, '´') // Replace curly apostrophe with acute accent
    .replace(/'/g, '´'); // Replace another variant of apostrophe with acute accent
}
