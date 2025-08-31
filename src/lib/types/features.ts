// Feature checking utilities
export type FeatureName =
  | 'seatAssignment'
  | 'bulkMessages'
  | 'coupleAccount'
  | 'advancedChatbot'
  | 'chatbotTesting'
  | 'additionalGuestConfirmations'
  | 'customWhatsapp';

export enum LimitName {
  ActiveEvents = 'activeEvents',
  WhatsappMsgs = 'whatsappMsgs',
}

// Predefined feature definitions
export interface FeatureDefinition {
  name: FeatureName;
  displayName: string;
  description: string;
  requiresConfiguration?: boolean;
  dependsOn?: FeatureName[];
}

export interface LimitDefinition {
  name: LimitName;
  displayName: string;
  description: string;
  defaultValue: number;
  unit: string;
  minValue?: number;
  maxValue?: number;
  relatedFeatures?: FeatureName[];
}

// Predefined features catalog
export const FEATURE_DEFINITIONS: Record<FeatureName, FeatureDefinition> = {
  advancedChatbot: {
    name: 'advancedChatbot',
    displayName: 'Advanced Chatbot',
    description: 'Fully customizable chatbot with advanced features',
    requiresConfiguration: true,
  },
  customWhatsapp: {
    name: 'customWhatsapp',
    displayName: 'Custom WhatsApp Profile',
    description: 'Custom WhatsApp profile for the organization',
    requiresConfiguration: true,
  },
  seatAssignment: {
    name: 'seatAssignment',
    displayName: 'Seat Assignment',
    description: 'Allow guests to select their preferred seats',
  },
  bulkMessages: {
    name: 'bulkMessages',
    displayName: 'Bulk Messages',
    description: 'Send messages to multiple guests at once',
  },
  coupleAccount: {
    name: 'coupleAccount',
    displayName: 'Couple Account',
    description: 'Shared account access for couples',
  },
  chatbotTesting: {
    name: 'chatbotTesting',
    displayName: 'Chatbot Testing',
    description: 'Test chatbot responses before going live',
    dependsOn: ['advancedChatbot'],
  },
  additionalGuestConfirmations: {
    name: 'additionalGuestConfirmations',
    displayName: 'Additional Guest Confirmations',
    description: 'Allow guests to confirm additional guests',
  },
};

// Predefined limits catalog
export const LIMIT_DEFINITIONS: Record<LimitName, LimitDefinition> = {
  [LimitName.ActiveEvents]: {
    name: LimitName.ActiveEvents,
    displayName: 'Active Events',
    description: 'Maximum number of active events at once',
    defaultValue: 1,
    unit: 'events',
    minValue: 1,
    maxValue: 50,
  },
  [LimitName.WhatsappMsgs]: {
    name: LimitName.WhatsappMsgs,
    displayName: 'WhatsApp Messages',
    description: 'Monthly WhatsApp message allowance',
    defaultValue: 100,
    unit: 'messages/month',
    minValue: 0,
    maxValue: 10000,
    relatedFeatures: ['bulkMessages', 'customWhatsapp'],
  },
};

// Database interfaces (simplified)
export interface OrganizationFeature {
  id: string;
  organizationId: string;
  featureName: FeatureName;
  isEnabled: boolean;
  configuration?: Record<string, any>;
  enabledAt: Date;
  enabledBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationLimit {
  id: string;
  organizationId: string;
  limitName: LimitName;
  value: number;
  setBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationUsage {
  id: string;
  organizationId: string;
  limitName: LimitName;
  currentValue: number;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationFeatureConfig {
  features: OrganizationFeature[];
  limits: OrganizationLimit[];
  usage: OrganizationUsage[];
}

// Admin interfaces
export interface FeatureToggleRequest {
  organizationId: string;
  featureName: FeatureName;
  isEnabled: boolean;
  configuration?: Record<string, any>;
}

export interface LimitUpdateRequest {
  organizationId: string;
  limitName: LimitName;
  value: number;
}

// Utility functions
export function getFeatureDefinition(featureName: FeatureName): FeatureDefinition {
  return FEATURE_DEFINITIONS[featureName];
}

export function getLimitDefinition(limitName: LimitName): LimitDefinition {
  return LIMIT_DEFINITIONS[limitName];
}

export function getAllFeatureDefinitions(): FeatureDefinition[] {
  return Object.values(FEATURE_DEFINITIONS);
}

export function getAllLimitDefinitions(): LimitDefinition[] {
  return Object.values(LIMIT_DEFINITIONS);
}
