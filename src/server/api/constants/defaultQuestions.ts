import { QuestionCategory } from '@prisma/client';

export const defaultQuestions = [
  {
    question: '¿Cuándo es la boda?',
    category: QuestionCategory.SCHEDULE,
    answer: '',
  },
  {
    question: '¿Dónde será la boda?',
    category: QuestionCategory.VENUE,
    answer: '',
  },
  {
    question: '¿A qué hora comienza la boda?',
    category: QuestionCategory.SCHEDULE,
    answer: '',
  },
  {
    question: '¿Dónde se llevará a cabo la ceremonia religiosa?',
    category: QuestionCategory.VENUE,
    answer: '',
  },
  {
    question: '¿A qué hora es la ceremonia religiosa?',
    category: QuestionCategory.SCHEDULE,
    answer: '',
  },
  {
    question: '¿Dónde será la fiesta después de la ceremonia?',
    category: QuestionCategory.VENUE,
    answer: '',
  },
  {
    question: '¿A qué hora empieza la fiesta?',
    category: QuestionCategory.SCHEDULE,
    answer: '',
  },
  {
    question: '¿A qué hora termina la fiesta?',
    category: QuestionCategory.SCHEDULE,
    answer: '',
  },
  {
    question: '¿Cuál es el código de vestimenta para la boda?',
    category: QuestionCategory.DRESS_CODE,
    answer: '',
  },
  {
    question: '¿Pueden asistir niños a la boda?',
    category: QuestionCategory.GENERAL,
    answer: '',
  },
  {
    question: '¿Qué tan formal es el evento?',
    category: QuestionCategory.DRESS_CODE,
    answer: '',
  },
  {
    question: '¿Hay restricciones sobre como puedo vestir?',
    category: QuestionCategory.DRESS_CODE,
    answer: '',
  },
  {
    question: '¿Hay una lista de regalos para la boda?',
    category: QuestionCategory.GIFTS,
    answer: '',
  },
  {
    question: '¿Cómo puedo enviar un regalo a los novios?',
    category: QuestionCategory.GIFTS,
    answer: '',
  },
  {
    question: '¿Cuál es el sitio web de la boda?',
    category: QuestionCategory.GENERAL,
    answer: '',
  },
  {
    question: '¿Cuál es la contraseña del sitio web de la boda?',
    category: QuestionCategory.GENERAL,
    answer: '',
  },
  {
    question: '¿Dónde me puedo hospedar durante mi viaje para la boda?',
    category: QuestionCategory.VENUE,
    answer: '',
  },
  {
    question: '¿Hay hoteles o Airbnbs recomendados cerca del lugar del evento?',
    category: QuestionCategory.VENUE,
    answer: '',
  },
  {
    question: '¿Puedo llevar un acompañante a la boda?',
    category: QuestionCategory.GENERAL,
    answer:
      'Sólo podrás llevar un acompañante si tu invitación lo permite, revise el mensaje que te mandamos para confirmar',
  },
  {
    question: '¿Qué debo hacer si no puedo asistir a la boda pero quiero enviar un regalo?',
    category: QuestionCategory.GIFTS,
    answer: '',
  },
  {
    question: '¿Habrá estacionamiento disponible en la ceremonia o en el lugar de la fiesta?',
    category: QuestionCategory.VENUE,
    answer: '',
  },
] as const;
