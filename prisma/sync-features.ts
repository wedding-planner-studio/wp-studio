import { PrismaClient } from '@prisma/client';
import { FEATURE_DEFINITIONS, LIMIT_DEFINITIONS } from '../src/lib/types/features.js';

const prisma = new PrismaClient();

// Feature flags that should be created
const FEATURE_FLAGS = {
  'event-additional-confirmations': {
    name: 'event-additional-confirmations',
    description: 'Controls access to additional guest confirmations feature',
    isGloballyEnabled: false, // Start disabled, enable via whitelist
  },
  'reply-to-guest-messages': {
    name: 'reply-to-guest-messages',
    description: 'Controls access to reply to guest messages feature',
    isGloballyEnabled: false, // Start disabled, enable via whitelist
  },
};

// Mapping of features to their feature flags
const FEATURE_TO_FLAG_MAPPING = {
  additionalGuestConfirmations: 'event-additional-confirmations',
};

async function syncFeatureFlags() {
  console.log('🔄 Syncing feature flags...');

  for (const [flagName, flagDefinition] of Object.entries(FEATURE_FLAGS)) {
    const featureFlag = await prisma.featureFlag.upsert({
      where: { name: flagName },
      update: {
        description: flagDefinition.description,
        isGloballyEnabled: flagDefinition.isGloballyEnabled,
      },
      create: {
        name: flagName,
        description: flagDefinition.description,
        isGloballyEnabled: flagDefinition.isGloballyEnabled,
      },
    });
    console.log(`✅ Synced feature flag: ${flagDefinition.name}`);
  }
}

async function syncFeatures() {
  console.log('🔄 Syncing predefined features to database...');

  // Sync Features
  for (const [featureName, featureDefinition] of Object.entries(FEATURE_DEFINITIONS)) {
    // Check if this feature should be linked to a feature flag
    const flagName = FEATURE_TO_FLAG_MAPPING[featureName as keyof typeof FEATURE_TO_FLAG_MAPPING];
    let featureFlagId: string | undefined = undefined;

    if (flagName) {
      const featureFlag = await prisma.featureFlag.findUnique({
        where: { name: flagName },
      });
      featureFlagId = featureFlag?.id;
    }

    await prisma.feature.upsert({
      where: { name: featureName },
      update: {
        description: featureDefinition.description,
        isActive: true,
        ...(featureFlagId && { featureFlagId }),
      },
      create: {
        name: featureName,
        description: featureDefinition.description,
        isActive: true,
        ...(featureFlagId && { featureFlagId }),
      },
    });
    console.log(
      `✅ Synced feature: ${featureDefinition.displayName}${featureFlagId ? ` (linked to flag: ${flagName})` : ''}`
    );
  }

  // Sync Limit Types
  for (const [limitName, limitDefinition] of Object.entries(LIMIT_DEFINITIONS)) {
    await prisma.limitType.upsert({
      where: { name: limitName },
      update: {
        description: limitDefinition.description,
        defaultValue: limitDefinition.defaultValue,
        unit: limitDefinition.unit,
        isActive: true,
      },
      create: {
        name: limitName,
        description: limitDefinition.description,
        defaultValue: limitDefinition.defaultValue,
        unit: limitDefinition.unit,
        isActive: true,
      },
    });
    console.log(`✅ Synced limit type: ${limitDefinition.displayName}`);
  }

  console.log('🎉 Feature sync completed successfully!');
}

async function main() {
  try {
    // First sync feature flags
    await syncFeatureFlags();

    // Then sync features (which may reference the flags)
    await syncFeatures();
  } catch (error) {
    console.error('❌ Error syncing features:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
