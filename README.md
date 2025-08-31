# Evana

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with just the scaffolding we set up for you, and add additional things later when they become necessary.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.

## Flag Reference System

The Flag Reference system provides advanced access control for features through a two-layer architecture that separates feature functionality from access control logic.

### Overview

The Flag Reference is a connection between **Features** and **Feature Flags** that enables granular access control for features across organizations.

### Architecture

#### 1. Two-Layer System

```prisma
model Feature {
  id                 String               @id @default(cuid())
  name               String               @unique
  description        String?
  isActive           Boolean              @default(true)
  featureFlagId      String?              // Optional link to feature flag ⭐
  // ...
  featureFlag        FeatureFlag?         @relation(fields: [featureFlagId], references: [id])
}

model FeatureFlag {
  id                String                      @id @default(cuid())
  name              String                      @unique
  description       String?
  isGloballyEnabled Boolean                     @default(false)
  // ...
  features          Feature[]                   // Features that use this flag
}
```

#### 2. How It Works

1. **Features** are the actual functionality (like "Advanced Analytics", "Bulk Messaging", etc.)
2. **Feature Flags** are access control mechanisms that can be:
   - Globally enabled/disabled
   - Whitelisted for specific organizations
   - Blacklisted for specific organizations
3. **The Connection**: A Feature can optionally reference a Feature Flag via `featureFlagId`

### Access Control Logic

When a feature has a `featureFlagId`, the system checks access using this hierarchy:

```typescript
// From FeatureFlagService.hasAccess()
async hasAccess(featureName: string): Promise<boolean> {
  // Get the feature flag
  const featureFlag = await this.db.featureFlag.findUnique({
    where: { name: featureName },
  });

  // If feature flag doesn't exist, the feature is accessible to everyone
  if (!featureFlag) return true;

  // Check if organization is blacklisted (takes precedence)
  if (isBlacklisted) return false;

  // If globally enabled and not blacklisted, allow access
  if (featureFlag.isGloballyEnabled) return true;

  // Otherwise, check if organization is whitelisted
  return !!isWhitelisted;
}
```

### UI Implementation

In the Organization Configuration Panel, the Flag Reference column displays:

```typescript
// From OrganizationConfigPanel.tsx
<td className="px-6 py-4 whitespace-nowrap">
  {(() => {
    const dbFeature = dbFeatures?.find(f => f.name === feature.name);
    return dbFeature?.featureFlagId ? (
      <div className="flex items-center gap-1">
        <FiGitBranch className="h-3 w-3 text-gray-400" />
        <span className="text-xs text-gray-600 font-mono">
          {dbFeature.featureFlagId}
        </span>
      </div>
    ) : (
      <span className="text-xs text-gray-400">No flag</span>
    );
  })()}
</td>
```

This displays:

- **Feature Flag ID** if the feature is linked to a flag
- **"No flag"** if the feature has no access control restrictions

### Practical Example

```
Feature: "Advanced Analytics"
├── featureFlagId: "flag_123abc"
└── FeatureFlag: "advanced_analytics_beta"
    ├── isGloballyEnabled: false
    ├── Whitelisted Orgs: ["org_premium_1", "org_enterprise_2"]
    └── Blacklisted Orgs: []
```

In this case:

- Only whitelisted organizations can access "Advanced Analytics"
- The Flag Reference column would show `flag_123abc`
- Admins can control access by managing the feature flag's whitelist/blacklist

### Benefits

- **Granular Control**: Features can be rolled out to specific organizations
- **A/B Testing**: Enable features for test groups
- **Emergency Disable**: Quickly disable problematic features globally
- **Gradual Rollout**: Start with whitelist, then enable globally
- **Organization-specific Access**: Perfect for tiered pricing or beta features

### Usage in Code

To check if a user has access to a feature:

```typescript
// Using the hook
const { hasAccess, isLoading } = useFeatureFlag('advanced_analytics');

// Using the service directly
const featureFlagService = new FeatureFlagService({ db, auth });
const hasAccess = await featureFlagService.hasAccess('advanced_analytics');
```

The Flag Reference essentially tells you "this feature has advanced access control rules" and shows you which feature flag controls that access.
