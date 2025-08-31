import { clerkClient } from '@clerk/clerk-sdk-node';
import {
  PrismaClient,
  GuestPriority,
  GuestStatus,
  QuestionStatus,
  VenuePurpose,
  BulkMessageStatus,
  MessageDeliveryStatus,
} from '@prisma/client';
import { faker } from '@faker-js/faker';
import { format } from 'date-fns';

const prisma = new PrismaClient();

// Default questions for each event
const defaultQuestions = [
  {
    question: '¿Cuándo es la boda?',
    category: 'SCHEDULE',
    answer: 'La boda será el 22 de marzo de 2025. Por favor marca tu calendario.',
  },
  {
    question: '¿Dónde será la ceremonia principal?',
    category: 'VENUE',
    answer: 'La ceremonia principal se llevará a cabo en el salón principal.',
  },
  {
    question: '¿A qué hora comienza la ceremonia principal?',
    category: 'SCHEDULE',
    answer:
      'La ceremonia comenzará puntualmente a las 7 PM hora México. Te recomendamos llegar 15-30 minutos antes.',
  },
  {
    question: '¿Dónde se llevará a cabo la ceremonia religiosa?',
    category: 'VENUE',
    answer: 'La ceremonia religiosa será en la iglesia que se indicará en tu invitación.',
  },
  {
    question: '¿A qué hora es la ceremonia religiosa?',
    category: 'SCHEDULE',
    answer: 'El horario de la ceremonia religiosa se indicará en tu invitación.',
  },
  {
    question: '¿Dónde será la recepción?',
    category: 'VENUE',
    answer: 'La recepción será en el salón de eventos que se indicará en tu invitación.',
  },
  {
    question: '¿A qué hora empieza la recepción?',
    category: 'SCHEDULE',
    answer:
      'La recepción comenzará inmediatamente después de la ceremonia, aproximadamente a las 8PM hora México.',
  },
  {
    question: '¿A qué hora termina la fiesta?',
    category: 'SCHEDULE',
    answer: 'La fiesta está programada para terminar a las 4 AM hora México.',
  },
  {
    question: '¿Cuál es el código de vestimenta para la boda?',
    category: 'DRESS_CODE',
    answer:
      'El código de vestimenta es formal. Para los caballeros se sugiere traje oscuro y para las damas vestido largo o cocktail.',
  },
  {
    question: '¿Pueden asistir niños a la boda?',
    category: 'GENERAL',
    answer: 'Lamentablemente, por cuestiones de espacio, la boda será un evento solo para adultos.',
  },
  {
    question: '¿Qué tan formal es el evento?',
    category: 'DRESS_CODE',
    answer:
      'El evento es formal. Esperamos que nuestros invitados se vistan elegantemente para la ocasión.',
  },
  {
    question: '¿Hay restricciones sobre qué puedo usar?',
    category: 'DRESS_CODE',
    answer:
      'Por favor evita usar blanco (reservado para la novia). No hay otras restricciones específicas.',
  },
  {
    question: '¿Hay una lista de regalos para la boda?',
    category: 'GIFTS',
    answer:
      'Sí, hemos registrado una lista de regalos en Liverpool, puedes acceder con el código 17482342. También apreciamos contribuciones en efectivo para nuestro fondo de luna de miel.',
  },
  {
    question: '¿Cómo puedo enviar un regalo a los novios?',
    category: 'GIFTS',
    answer:
      'Puedes enviarnos regalos por la mesa de regalos del evento o puedes hacer una transferencia bancaria a la cuenta de la novia.',
  },
  {
    question: '¿Cuáles son los datos bancarios para hacer la transferencia?',
    category: 'GIFTS',
    answer:
      'Los datos bancarios son: Banco: Santander, Cuenta: 000000000000000000, CLABE: 000000000000000000.',
  },
  {
    question: '¿Cuál es el sitio web de la boda?',
    category: 'GENERAL',
    answer: 'Puedes visitar nuestro sitio web en https://www.theplannerhouse.com.',
  },
  {
    question: '¿Cuál es la contraseña del sitio web de la boda?',
    category: 'GENERAL',
    answer: 'La contraseña para acceder al sitio web es "BodaChida".',
  },
  {
    question: '¿Dónde me puedo hospedar durante mi viaje para la boda?',
    category: 'VENUE',
    answer: 'Te recomendamos buscar en google maps y hay varios por la zona',
  },
  {
    question: '¿Hay hoteles o Airbnbs recomendados cerca del lugar del evento?',
    category: 'VENUE',
    answer:
      'No tenemos hotelees recomendadors pero pueden buscar en google maps y hay varios por la zona',
  },
  {
    question: '¿Puedo llevar un acompañante a la boda?',
    category: 'GENERAL',
    answer:
      'Los acompañantes están permitidos solo si fueron específicamente incluidos en tu invitación.',
  },
  {
    question: '¿Habrá comida y bebidas en la boda?',
    category: 'FOOD',
    answer: 'Sí, serviremos una cena completa y habrá barra libre durante toda la recepción.',
  },
  {
    question: '¿Cómo puedo encontrar más detalles sobre la boda si tengo preguntas?',
    category: 'GENERAL',
    answer: 'Puedes contactar a Vero en el número +523333333333 o vero@theplannerhouse.com.',
  },
  {
    question: '¿Qué debo hacer si no puedo asistir a la boda pero quiero enviar un regalo?',
    category: 'GIFTS',
    answer:
      'Si no puedes asistir, puedes hacer una transferencia bancaria usando los datos proporcionados.',
  },
  {
    question: '¿Habrá estacionamiento disponible en la ceremonia o en el lugar de la fiesta?',
    category: 'VENUE',
    answer:
      'Sí, ambos lugares cuentan con estacionamiento gratuito para los invitados. También ofreceremos servicio de valet parking.',
  },
] as const;

// Helper function to create default questions for an event
async function createDefaultQuestions(eventId: string) {
  const questions = defaultQuestions.map(q => ({
    eventId,
    question: q.question,
    answer: q.answer,
    category: q.category,
    status: QuestionStatus.ACTIVE,
  }));

  await prisma.eventQuestion.createMany({
    data: questions,
  });
}

// Helper function to create random guests
function generateRandomGuests(eventId: string, count: number) {
  return Array.from({ length: count }, () => {
    const hasPlusOne = faker.datatype.boolean();
    return {
      name: faker.person.fullName(),
      phone: faker.phone.number(),
      hasPlusOne,
      plusOneName: hasPlusOne ? faker.person.fullName() : null,
      status: faker.helpers.arrayElement(Object.values(GuestStatus)),
      table: faker.helpers.arrayElement([
        null,
        ...Array.from({ length: 20 }, (_, i) => `Table ${i + 1}`),
      ]),
      dietaryRestrictions: faker.helpers.arrayElement([
        null,
        'Vegetarian',
        'Vegan',
        'Gluten Free',
        'Dairy Free',
        'Nut Allergy',
      ]),
      notes: faker.helpers.arrayElement([null, faker.lorem.sentence()]),
      category: faker.helpers.arrayElement(['Family', 'Friends', 'Work']),
      priority: faker.helpers.arrayElement(Object.values(GuestPriority)),
      inviter: faker.helpers.arrayElement(['Person 1', 'Person 2', 'Both']),
      eventId,
    };
  });
}

// Helper function to generate random bulk messages
function generateRandomBulkMessages(eventId: string, createdById: string, count: number) {
  const templates = [
    { sid: 'HM123456', name: 'Welcome Message' },
    { sid: 'HM234567', name: 'RSVP Reminder' },
    { sid: 'HM345678', name: 'Event Details' },
    { sid: 'HM456789', name: 'Dress Code Info' },
    { sid: 'HM567890', name: 'Final Instructions' },
  ];

  return Array.from({ length: count }, () => {
    const template = faker.helpers.arrayElement(templates);
    return {
      name: `${template.name} - ${format(faker.date.recent(), 'MMM d')}`,
      templateSid: template.sid,
      templateName: template.name,
      eventId,
      status: faker.helpers.arrayElement(Object.values(BulkMessageStatus)),
      createdById,
    };
  });
}

// Helper function to generate message deliveries for a bulk message
async function createMessageDeliveriesForBulkMessage(
  prisma: PrismaClient,
  bulkMessageId: string,
  eventId: string
) {
  // Get all guests for the event
  const guests = await prisma.guest.findMany({
    where: { eventId },
    select: { id: true },
  });

  const deliveries = guests.map(guest => {
    const variableOptions = [
      { dbNull: true },
      { name: faker.person.firstName() },
      {
        name: faker.person.firstName(),
        table: faker.number.int({ min: 1, max: 20 }).toString(),
      },
    ];

    return {
      bulkMessageId,
      guestId: guest.id,
      status: faker.helpers.arrayElement(Object.values(MessageDeliveryStatus)),
      messageSid: faker.helpers.arrayElement([null, faker.string.alphanumeric(32)]),
      errorMessage: faker.helpers.arrayElement([
        null,
        'Failed to deliver: Phone number not reachable',
        'Failed to deliver: Invalid phone number',
        'Failed to deliver: Network error',
      ]),
      variables: faker.helpers.arrayElement(variableOptions),
    };
  });

  await prisma.messageDelivery.createMany({
    data: deliveries,
  });
}

async function main() {
  // Create first organization
  const organization = await prisma.organization.create({
    data: {
      name: 'The Planner House',
      status: 'ACTIVE',
      attributes: {
        industry: 'Wedding Planning',
        employeeCount: 10,
        headquarters: 'Guadalajara, Mexico',
      },
    },
  });

  console.log('Organization created:', organization);

  // Try to create Clerk users, but continue if it fails
  let users: any[] = [];
  try {
    const clerkUsers = await clerkClient.users.getUserList({
      orderBy: 'created_at',
      limit: 10,
    });

    // Create users
    for (const clerkUser of clerkUsers.data) {
      const data = {
        username: clerkUser.username ?? '',
        email: clerkUser.emailAddresses?.[0]?.emailAddress ?? null,
        firstName: clerkUser.firstName ?? null,
        lastName: clerkUser.lastName ?? null,
        phone: clerkUser.phoneNumbers?.[0]?.phoneNumber ?? null,
        attributes: JSON.stringify(clerkUser),
        organizationId: organization.id,
      };

      const user = await prisma.user.upsert({
        where: { id: clerkUser.id },
        update: data,
        create: { id: clerkUser.id, ...data },
      });

      users.push(user);
      console.log(`Created user: ${clerkUser.id}`);
    }
    console.log('Clerk users created successfully');
  } catch (error) {
    console.warn(
      'Warning: Could not create Clerk users. This is expected if CLERK_SECRET_KEY is not set.'
    );
    console.warn('Continuing with event creation...');
  }

  // Create 45 sample events with guests and questions
  const events = Array.from({ length: 45 }, () => {
    const person1LastName = faker.person.lastName();
    const eventType = faker.helpers.arrayElement(['Wedding', 'Anniversary', 'Engagement Party']);
    const futureDate = faker.date.future();
    const startHour = faker.number.int({ min: 12, max: 20 });
    const endHour = startHour + faker.number.int({ min: 2, max: 6 });

    return {
      name: `${person1LastName} ${eventType}`,
      date: futureDate,
      startTime: `${startHour.toString().padStart(2, '0')}:00`,
      endTime: `${endHour.toString().padStart(2, '0')}:00`,
      person1: `${faker.person.firstName()} ${person1LastName}`,
      person2: `${faker.person.firstName()} ${faker.person.lastName()}`,
      status: faker.helpers.arrayElement(['ACTIVE', 'INACTIVE']),
      organizationId: organization.id,
      venues: {
        create: [
          {
            name: faker.company.name(),
            address: `${faker.location.streetAddress()} - ${faker.location.city()}`,
            purpose: VenuePurpose.MAIN,
          },
          // Add a religious venue for some events
          ...(faker.datatype.boolean()
            ? [
                {
                  name: `${faker.helpers.arrayElement(['San Juan', 'Santa María', 'Cristo Rey'])} Church`,
                  address: `${faker.location.streetAddress()} - ${faker.location.city()}`,
                  purpose: VenuePurpose.RELIGIOUS,
                },
              ]
            : []),
          // Add a reception venue for some events
          ...(faker.datatype.boolean()
            ? [
                {
                  name: faker.company.name(),
                  address: `${faker.location.streetAddress()} - ${faker.location.city()}`,
                  purpose: VenuePurpose.RECEPTION,
                },
              ]
            : []),
          // Occasionally add an after party venue
          ...(faker.datatype.boolean() && faker.datatype.boolean()
            ? [
                {
                  name: faker.company.name(),
                  address: `${faker.location.streetAddress()} - ${faker.location.city()}`,
                  purpose: VenuePurpose.AFTER_PARTY,
                },
              ]
            : []),
        ],
      },
    };
  });

  // Create events with guests, questions, and bulk messages
  for (const eventData of events) {
    const event = await prisma.event.create({
      data: eventData,
    });

    // Generate and insert 50 guests for this event
    const guests = generateRandomGuests(event.id, 50);
    await prisma.guest.createMany({
      data: guests,
    });

    // Create default questions for this event
    await createDefaultQuestions(event.id);

    // Generate and insert 3-7 bulk messages for this event
    if (users.length > 0) {
      const randomUser = faker.helpers.arrayElement(users);
      const bulkMessages = generateRandomBulkMessages(
        event.id,
        randomUser.id,
        faker.number.int({ min: 3, max: 7 })
      );

      for (const messageData of bulkMessages) {
        const bulkMessage = await prisma.bulkMessage.create({
          data: messageData,
        });

        // Create message deliveries for each bulk message
        await createMessageDeliveriesForBulkMessage(prisma, bulkMessage.id, event.id);
      }
    }

    console.log(
      `Created event with ID ${event.id}, 50 guests, default questions, and bulk messages`
    );
  }

  console.log('Events, guests, questions, and bulk messages created!');
  console.log('Seeding completed!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
