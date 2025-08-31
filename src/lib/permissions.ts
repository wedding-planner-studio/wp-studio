import { UserRole } from '@prisma/client';

export type Action = 'create' | 'read' | 'update' | 'delete' | 'view';
export type Section =
  | 'sudo'
  | 'bulkMessages'
  | 'events'
  | 'eventQuestions'
  | 'chatbot'
  | 'media'
  | 'guests'
  | 'venues'
  | 'whatsapp'
  | 'admin'
  | 'seatMap'
  | 'seatAssignment'
  | 'orgMsgUsage'
  | 'coupleAccount'
  | 'settings'
  | 'billing'
  | 'campaignMessages'
  | 'subscription'
  | 'guestRequests'
  | 'members';

type Permissions = Record<
  Section,
  {
    hasAccessToSection: boolean;
    actions: Action[];
  }
>;

const basePermissions: Permissions = {
  // Sudo
  sudo: {
    hasAccessToSection: false,
    actions: [],
  },
  // Bulk Messages
  bulkMessages: {
    hasAccessToSection: true,
    actions: [],
  },
  // Events
  events: {
    hasAccessToSection: true,
    actions: [],
  },
  // Event Questions
  eventQuestions: {
    hasAccessToSection: true,
    actions: [],
  },
  // Chatbot
  chatbot: {
    hasAccessToSection: true,
    actions: [],
  },
  // Media
  media: {
    hasAccessToSection: true,
    actions: [],
  },
  // Guests
  guests: {
    hasAccessToSection: true,
    actions: [],
  },
  // Venues
  venues: {
    hasAccessToSection: true,
    actions: [],
  },
  // Whatsapp
  whatsapp: {
    hasAccessToSection: true,
    actions: [],
  },
  // Admin
  admin: {
    hasAccessToSection: false,
    actions: [],
  },
  // Seat Map
  seatMap: {
    hasAccessToSection: true,
    actions: [],
  },
  // Seat Assignment
  seatAssignment: {
    hasAccessToSection: true,
    actions: [],
  },
  // Usage
  orgMsgUsage: {
    hasAccessToSection: true,
    actions: [],
  },
  // Couple Account
  coupleAccount: {
    hasAccessToSection: true,
    actions: [],
  },
  // Settings
  settings: {
    hasAccessToSection: true,
    actions: [],
  },
  // Billing
  billing: {
    hasAccessToSection: true,
    actions: [],
  },
  // Subscription
  subscription: {
    hasAccessToSection: true,
    actions: [],
  },
  // Campaign Messages
  campaignMessages: {
    hasAccessToSection: true,
    actions: [],
  },
  // Members
  members: {
    hasAccessToSection: true,
    actions: [],
  },
  // Guest Requests
  guestRequests: {
    hasAccessToSection: true,
    actions: [],
  },
};

// Define common permission patterns
const adminPermissions: Permissions = {
  sudo: {
    hasAccessToSection: false,
    actions: [],
  },
  bulkMessages: {
    hasAccessToSection: true,
    actions: ['create', 'read', 'update', 'delete'],
  },
  events: {
    hasAccessToSection: true,
    actions: ['create', 'read', 'update', 'delete'],
  },
  eventQuestions: {
    hasAccessToSection: true,
    actions: ['create', 'read', 'update', 'delete'],
  },
  chatbot: {
    hasAccessToSection: true,
    actions: ['create', 'read', 'update', 'delete'],
  },
  media: {
    hasAccessToSection: true,
    actions: ['create', 'read', 'update', 'delete'],
  },
  guests: {
    hasAccessToSection: true,
    actions: ['create', 'read', 'update', 'delete'],
  },
  venues: {
    hasAccessToSection: true,
    actions: ['create', 'read', 'update', 'delete'],
  },
  admin: {
    hasAccessToSection: true,
    actions: ['create', 'read', 'update', 'delete'],
  },
  whatsapp: {
    hasAccessToSection: true,
    actions: ['create', 'read', 'update', 'delete'],
  },
  seatMap: {
    hasAccessToSection: true,
    actions: ['create', 'read', 'update', 'delete'],
  },
  seatAssignment: {
    hasAccessToSection: true,
    actions: ['create', 'read', 'update', 'delete'],
  },
  orgMsgUsage: {
    hasAccessToSection: true,
    actions: ['create', 'read', 'update', 'delete'],
  },
  coupleAccount: {
    hasAccessToSection: true,
    actions: ['create', 'read', 'update', 'delete'],
  },
  settings: {
    hasAccessToSection: true,
    actions: ['create', 'read', 'update', 'delete'],
  },
  billing: {
    hasAccessToSection: true,
    actions: ['create', 'read', 'update', 'delete'],
  },
  subscription: {
    hasAccessToSection: true,
    actions: ['create', 'read', 'update', 'delete'],
  },
  campaignMessages: {
    hasAccessToSection: true,
    actions: ['create', 'read', 'update', 'delete'],
  },
  members: {
    hasAccessToSection: true,
    actions: ['create', 'read', 'update', 'delete'],
  },
  guestRequests: {
    hasAccessToSection: true,
    actions: ['create', 'read', 'update', 'delete'],
  },
};

// TODO: Por ahora, los permisos de los miembros son los mismos que los de los administradores
const memberPermissions: Permissions = {
  ...adminPermissions,
};

const eventManagerPermissions: Permissions = {
  sudo: {
    hasAccessToSection: false,
    actions: [],
  },
  bulkMessages: {
    hasAccessToSection: true,
    actions: ['read'],
  },
  events: {
    hasAccessToSection: true,
    actions: ['read'],
  },
  eventQuestions: {
    hasAccessToSection: true,
    actions: ['read', 'create', 'update', 'delete'],
  },
  chatbot: {
    hasAccessToSection: true,
    actions: ['read'],
  },
  media: {
    hasAccessToSection: true,
    actions: ['read', 'create'],
  },
  guests: {
    hasAccessToSection: true,
    actions: ['read'],
  },
  venues: {
    hasAccessToSection: true,
    actions: ['read'],
  },
  whatsapp: {
    hasAccessToSection: true,
    actions: ['read'],
  },
  admin: {
    hasAccessToSection: false,
    actions: [],
  },
  seatMap: {
    hasAccessToSection: false,
    actions: ['read'],
  },
  seatAssignment: {
    hasAccessToSection: true,
    actions: ['read', 'create', 'update', 'delete'],
  },
  orgMsgUsage: {
    hasAccessToSection: false,
    actions: [],
  },
  coupleAccount: {
    hasAccessToSection: false,
    actions: [],
  },
  settings: {
    hasAccessToSection: false,
    actions: [],
  },
  billing: {
    hasAccessToSection: false,
    actions: [],
  },
  campaignMessages: {
    hasAccessToSection: false,
    actions: [],
  },
  subscription: {
    hasAccessToSection: false,
    actions: [],
  },
  members: {
    hasAccessToSection: false,
    actions: [],
  },
  guestRequests: {
    hasAccessToSection: false,
    actions: [],
  },
};

const sudoPermissions: Permissions = {
  ...adminPermissions,
  sudo: {
    hasAccessToSection: true,
    actions: ['create', 'read', 'update', 'delete'],
  },
};

// Build role-based permissions
export const permissions = {
  [UserRole.ORG_ADMIN]: adminPermissions,
  [UserRole.ORG_MEMBER]: memberPermissions,
  [UserRole.EVENT_MANAGER]: eventManagerPermissions,
  [UserRole.SUDO]: sudoPermissions,
} as const;

export type Role = keyof typeof permissions;
export type Permission = keyof typeof basePermissions;
export function hasPermission(role: Role, permission: Permission, action: Action): boolean {
  return permissions[role]?.[permission]?.actions.includes(action) ?? false;
}
export function hasAccessToSection(role: Role, section: Section): boolean {
  return permissions[role]?.[section]?.hasAccessToSection ?? false;
}
