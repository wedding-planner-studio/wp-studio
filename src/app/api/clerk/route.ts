/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { type WebhookEvent } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';

import { db } from '@/server/db';
import { UserRole, UserStatus } from '@prisma/client';
import { env } from '@/env';

const handleClerkEvent = async (evt: WebhookEvent) => {
  const eventType = evt.type;

  /*
  if (
    eventType === "organization.created" ||
    eventType === "organization.updated"
  ) {
    const attributes = evt.data;
    const id = attributes.id;
    const name = attributes.name;
    const organizationAttributes = JSON.parse(JSON.stringify(attributes));
    try {
      await db.organization.upsert({
        where: { id: id },
        update: {
          name: name,
          attributes: JSON.parse(JSON.stringify(organizationAttributes)),
        },
        create: {
          id: id,
          name: name,
          attributes: JSON.parse(JSON.stringify(organizationAttributes)),
        },
      });
    } catch (error) {
      console.error("Error upserting organization:", error);
      throw error;
    }
  }

  if (eventType === "organization.deleted") {
    const attributes = evt.data;
    const id = attributes.id;
    try {
      console.log("Deleted ID: ", id);
      await db.organization.update({
        where: { id: id },
        data: { status: "DEACTIVATED" },
      });
    } catch (error) {
      console.error("Error updating organization status:", error);
      throw error;
    }
  }
  */

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const attributes = evt.data;
    const id = attributes.id;

    const primaryEmailAddress = attributes.email_addresses?.find(
      email => email.id === attributes.primary_email_address_id
    );

    const data = {
      username: attributes.username ?? '',
      email:
        primaryEmailAddress?.email_address ??
        attributes.email_addresses?.[0]?.email_address ??
        null,
      firstName: attributes.first_name ?? null,
      lastName: attributes.last_name ?? null,
      phone: attributes.phone_numbers?.[0]?.phone_number ?? null,
      attributes: JSON.parse(JSON.stringify(attributes)),
      role: UserRole.ORG_ADMIN,
      status: UserStatus.ACTIVE,
    };
    try {
      await db.user.upsert({
        where: { id },
        update: data,
        create: { id, ...data },
      });
    } catch (error) {
      console.error('Error upserting user:', error);
      throw error;
    }
  }

  if (eventType === 'user.deleted') {
    const attributes = evt.data;
    const id = attributes.id;
    try {
      await db.user.update({
        where: { id },
        data: { status: UserStatus.INACTIVE },
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  /*
  if (
    eventType === "organizationMembership.created" ||
    eventType === "organizationMembership.updated"
  ) {
    const attributes = evt.data;
    await db.user.update({
      where: { id: attributes.public_user_data.user_id },
      data: { organizationId: attributes.organization.id },
    });
  }

  if (eventType === "organizationMembership.deleted") {
    const attributes = evt.data;
    await db.user.update({
      where: { id: attributes.public_user_data.user_id },
      data: { organizationId: null },
    });
  }
  */
};

export async function POST(req: Request) {
  const SIGNING_SECRET = env.CLERK_WEBHOOK_SIGNING_SECRET;

  // Create new Svix instance with secret
  const wh = new Webhook(SIGNING_SECRET);

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing Svix headers', {
      status: 400,
    });
  }

  // Get body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  let evt: WebhookEvent;

  // Verify payload with headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error: Could not verify webhook:', err);
    return new Response('Error: Verification error', {
      status: 400,
    });
  }

  // Do something with payload
  // For this guide, log payload to console
  const { id } = evt.data;
  const eventType = evt.type;
  console.log(`Received webhook with ID ${id} and event type of ${eventType}`);
  console.log('Webhook payload:', body);

  await handleClerkEvent(evt);

  return new Response('Webhook received', { status: 200 });
}
