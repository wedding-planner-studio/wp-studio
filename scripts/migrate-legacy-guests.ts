#!/usr/bin/env tsx

import { PrismaClient, GuestStatus, GuestPriority, GuestLanguage } from '@prisma/client';
import * as readline from 'readline';
import chalk from 'chalk';

const db = new PrismaClient();

interface LegacyGuest {
  id: string;
  name: string;
  phone: string | null;
  hasPlusOne: boolean;
  plusOneName: string | null;
  status: GuestStatus;
  table: string | null;
  dietaryRestrictions: string | null;
  notes: string | null;
  category: string | null;
  priority: GuestPriority;
  preferredLanguage: GuestLanguage;
  inviter: string | null;
  eventId: string;
  isPrimaryGuest: boolean;
  hasMultipleGuests: boolean;
  guestGroupId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Simple prompt functions using readline
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function askQuestion(question: string): Promise<string> {
  const rl = createInterface();
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function confirmAction(message: string): Promise<boolean> {
  const answer = await askQuestion(`${message} (y/N): `);
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

async function migrateLegacyGuests(eventId: string) {
  console.log(chalk.blue(`🔍 Analyzing event: ${eventId}`));

  // Verify event exists
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      organizationId: true,
      _count: {
        select: {
          guests: true,
        },
      },
    },
  });

  if (!event) {
    console.log(chalk.red('❌ Event not found'));
    process.exit(1);
  }

  console.log(chalk.green(`✅ Found event: "${event.name}"`));
  console.log(chalk.gray(`   Total guests: ${event._count.guests}`));

  // Get all guests for this event
  const allGuests = (await db.guest.findMany({
    where: {
      eventId,
      status: { not: GuestStatus.INACTIVE }, // Only process active guests
    },
    orderBy: { name: 'asc' },
  })) as LegacyGuest[];

  // Filter guests that have plus ones and haven't been migrated yet
  const guestsWithPlusOnes = allGuests.filter(
    guest =>
      guest.hasPlusOne && guest.isPrimaryGuest && !guest.hasMultipleGuests && !guest.guestGroupId
  );

  // Filter guests that are already in the new system
  const guestsAlreadyMigrated = allGuests.filter(
    guest => guest.hasMultipleGuests || guest.guestGroupId || !guest.isPrimaryGuest
  );

  // Filter guests without plus ones
  const soloGuests = allGuests.filter(
    guest =>
      !guest.hasPlusOne && guest.isPrimaryGuest && !guest.hasMultipleGuests && !guest.guestGroupId
  );

  console.log(chalk.yellow('\n📊 Migration Analysis:'));
  console.log(chalk.gray(`   • Solo guests (no migration needed): ${soloGuests.length}`));
  console.log(chalk.gray(`   • Guests already in new system: ${guestsAlreadyMigrated.length}`));
  console.log(chalk.blue(`   • Guests with plus ones to migrate: ${guestsWithPlusOnes.length}`));

  if (guestsWithPlusOnes.length === 0) {
    console.log(
      chalk.green(
        '\n✅ No guests need migration. All guests are already in the new system or are solo guests.'
      )
    );
    return;
  }

  console.log(chalk.yellow('\n📋 Guests to be migrated:'));
  guestsWithPlusOnes.forEach((guest, index) => {
    console.log(
      chalk.gray(`   ${index + 1}. ${guest.name} + "${guest.plusOneName || 'Unnamed Plus One'}"`)
    );
  });

  console.log(chalk.yellow('\n🔄 Migration Plan:'));
  console.log(chalk.gray('   For each guest with a plus one:'));
  console.log(chalk.gray('   1. Update guest: isPrimaryGuest=true, hasMultipleGuests=true'));
  console.log(chalk.gray('   2. Create a GuestGroup with the guest as leader'));
  console.log(chalk.gray('   3. Create a new Guest record for the plus one'));
  console.log(chalk.gray('   4. Link both guests to the group'));
  console.log(chalk.gray('   5. Clear legacy hasPlusOne and plusOneName fields'));

  // Ask for confirmation
  const shouldProceed = await confirmAction(
    `Do you want to proceed with migrating ${guestsWithPlusOnes.length} guests?`
  );

  if (!shouldProceed) {
    console.log(chalk.yellow('Migration cancelled.'));
    return;
  }

  console.log(chalk.blue('\n🚀 Starting migration...'));

  let successCount = 0;
  let errorCount = 0;

  for (const guest of guestsWithPlusOnes) {
    try {
      await db.$transaction(async tx => {
        console.log(chalk.gray(`   Processing: ${guest.name}...`));

        // 1. Create the GuestGroup
        const guestGroup = await tx.guestGroup.create({
          data: {
            eventId: guest.eventId,
            leadGuestId: guest.id,
          },
        });

        // 2. Update the main guest
        await tx.guest.update({
          where: { id: guest.id },
          data: {
            isPrimaryGuest: true,
            hasMultipleGuests: true,
            guestGroupId: guestGroup.id,
          },
        });

        // 3. Create the plus one guest
        const plusOneName = guest.plusOneName || `Invitado adicional`;
        await tx.guest.create({
          data: {
            name: plusOneName,
            phone: null, // Plus ones typically don't have their own phone
            status: guest.status, // Same status as main guest
            table: guest.table, // Same table assignment
            dietaryRestrictions: null,
            notes: null,
            category: guest.category,
            priority: guest.priority,
            preferredLanguage: guest.preferredLanguage,
            inviter: guest.inviter,
            eventId: guest.eventId,
            isPrimaryGuest: false,
            hasMultipleGuests: false,
            guestGroupId: guestGroup.id,
            // Legacy fields should be false/null for new guests
            hasPlusOne: false,
            plusOneName: null,
          },
        });

        console.log(chalk.green(`   ✅ ${guest.name} + "${plusOneName}"`));
        successCount++;
      });
    } catch (error) {
      console.log(chalk.red(`   ❌ Failed to migrate ${guest.name}: ${error}`));
      errorCount++;
    }
  }

  console.log(chalk.blue('\n📈 Migration Results:'));
  console.log(chalk.green(`   ✅ Successfully migrated: ${successCount} guests`));
  if (errorCount > 0) {
    console.log(chalk.red(`   ❌ Failed migrations: ${errorCount} guests`));
  }

  // Verify the migration
  console.log(chalk.blue('\n🔍 Verifying migration...'));

  const postMigrationGuests = await db.guest.findMany({
    where: {
      eventId,
      status: { not: GuestStatus.INACTIVE },
    },
    include: {
      guestGroup: {
        include: {
          guests: true,
          leadGuest: true,
        },
      },
    },
  });

  const remainingLegacyGuests = postMigrationGuests.filter(
    guest => guest.hasPlusOne && guest.isPrimaryGuest
  );

  const newSystemGuests = postMigrationGuests.filter(
    guest => guest.hasMultipleGuests || guest.guestGroupId
  );

  console.log(chalk.gray(`   • Remaining legacy guests: ${remainingLegacyGuests.length}`));
  console.log(chalk.gray(`   • Guests in new system: ${newSystemGuests.length}`));
  console.log(chalk.gray(`   • Total guest records: ${postMigrationGuests.length}`));

  if (remainingLegacyGuests.length === 0) {
    console.log(
      chalk.green(
        '\n🎉 Migration completed successfully! All guests have been migrated to the new system.'
      )
    );
  } else {
    console.log(
      chalk.yellow(
        '\n⚠️  Some guests still remain in the legacy system. You may want to run the migration again.'
      )
    );
  }
}

async function main() {
  console.log(chalk.blue('🔄 Legacy Guest Migration Tool'));
  console.log(
    chalk.gray(
      'This tool migrates guests from hasPlusOne/plusOneName to the new GuestGroup system.\n'
    )
  );

  let eventId: string;

  // Check if eventId was provided as command line argument
  if (process.argv[2]) {
    eventId = process.argv[2];
    console.log(chalk.gray(`Using event ID from command line: ${eventId}`));
  } else {
    // Prompt for event ID
    eventId = await askQuestion('Enter the Event ID to migrate: ');
    if (!eventId.trim()) {
      console.log(chalk.red('❌ Event ID is required'));
      process.exit(1);
    }
  }

  try {
    await migrateLegacyGuests(eventId.trim());
  } catch (error) {
    console.log(chalk.red(`\n❌ Migration failed: ${error}`));
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n\n⚠️  Migration interrupted by user'));
  await db.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log(chalk.yellow('\n\n⚠️  Migration terminated'));
  await db.$disconnect();
  process.exit(0);
});

// Run main function if this file is executed directly
main().catch(error => {
  console.error(chalk.red('Unhandled error:'), error);
  process.exit(1);
});
