import { OrganizationPlan as PrismaPlan } from '@prisma/client';

export type PlanFeatures = {
  generalEventInfo: boolean;
  guests: boolean;
  seatAssignment: boolean;
  detailedEventInfo: boolean;
  chatbotTesting: boolean;
  coupleAccount: boolean;
  templateBuilder: boolean;
};

export type PlanLimits = {
  activeEvents: number;
  whatsappMsgs: number;
};

export type Plan = {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'one-time';
  features: PlanFeatures;
  limits: PlanLimits;
  rsvp: {
    link: boolean;
    chatbot: boolean;
  };
  chatbot: {
    enabled: boolean;
    type: 'none' | 'basic' | 'custom';
    unlimitedInfo?: boolean;
  };
  customWhatsapp: boolean;
};

export const PLANS: Record<PrismaPlan, Plan> = {
  LITE: {
    id: 'lite',
    name: 'WP Studio Lite',
    price: 1990,
    currency: 'MXN',
    interval: 'month',
    features: {
      generalEventInfo: true,
      guests: true,
      seatAssignment: false,
      detailedEventInfo: false,
      chatbotTesting: false,
      coupleAccount: true,
      templateBuilder: false,
    },
    limits: {
      activeEvents: 1,
      whatsappMsgs: 200,
    },
    rsvp: {
      link: true,
      chatbot: false,
    },
    chatbot: {
      enabled: false,
      type: 'none',
    },
    customWhatsapp: false,
  },
  PRO: {
    id: 'pro',
    name: 'WP Studio Pro',
    price: 4990,
    currency: 'MXN',
    interval: 'month',
    features: {
      generalEventInfo: true,
      guests: true,
      seatAssignment: true,
      detailedEventInfo: false,
      chatbotTesting: true,
      coupleAccount: true,
      templateBuilder: true,
    },
    limits: {
      activeEvents: 5,
      whatsappMsgs: 500,
    },
    rsvp: {
      link: true,
      chatbot: false,
    },
    chatbot: {
      enabled: true,
      type: 'basic',
    },
    customWhatsapp: false,
  },
  ELITE: {
    id: 'elite',
    name: 'WP Studio Elite',
    price: 9990,
    currency: 'MXN',
    interval: 'month',
    features: {
      generalEventInfo: true,
      guests: true,
      seatAssignment: true,
      detailedEventInfo: true,
      chatbotTesting: true,
      coupleAccount: true,
      templateBuilder: true,
    },
    limits: {
      activeEvents: 20,
      whatsappMsgs: 1250,
    },
    rsvp: {
      link: true,
      chatbot: true,
    },
    chatbot: {
      enabled: true,
      type: 'custom',
      unlimitedInfo: true,
    },
    customWhatsapp: true,
  },
  SINGLE: {
    id: 'single',
    name: 'WP Studio Single Event',
    price: 7990,
    currency: 'MXN',
    interval: 'one-time',
    features: {
      generalEventInfo: true,
      guests: true,
      seatAssignment: true,
      detailedEventInfo: true,
      chatbotTesting: true,
      coupleAccount: true,
      templateBuilder: true,
    },
    limits: {
      activeEvents: 1,
      whatsappMsgs: 200,
    },
    rsvp: {
      link: true,
      chatbot: true,
    },
    chatbot: {
      enabled: true,
      type: 'custom',
      unlimitedInfo: true,
    },
    customWhatsapp: false,
  },
};
