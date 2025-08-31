import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UploadThingError } from 'uploadthing/server';
import { getAuth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();
const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Route for handling media uploads with specific type restrictions
  messageMedia: f({
    image: {
      maxFileSize: '32MB',
      maxFileCount: 1,
    },
    blob: {
      maxFileSize: '16MB',
      maxFileCount: 1,
    },
  })
    .input(z.object({ eventId: z.string() }))
    .middleware(async ({ req, input }) => {
      const auth = await getAuth(req);
      if (!auth?.userId) throw new UploadThingError('Unauthorized');
      const { organizationId } = await prisma.user.findUniqueOrThrow({
        where: { id: auth.userId },
        select: { organizationId: true },
      });
      const eventId = input.eventId;
      console.log('Uploading media for eventId', eventId);
      return { userId: auth.userId, organizationId, eventId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Validate file types
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      const allowedDocTypes = [
        'application/pdf',
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      ];

      // Check if it's an image file
      const isAttemptingImage = file.type.startsWith('image/');

      if (isAttemptingImage && !allowedImageTypes.includes(file.type)) {
        throw new UploadThingError(
          'Sorry, this image format is not supported. Please use JPG, JPEG, or PNG files only.'
        );
      }

      // If it's not an image, check if it's a supported document type
      if (!isAttemptingImage && !allowedDocTypes.includes(file.type)) {
        throw new UploadThingError(
          'Sorry, this document format is not supported. Please use PDF, DOC, DOCX, PPTX, or XLSX files only.'
        );
      }

      const mediaFile = await prisma.mediaFile.create({
        data: {
          filename: file.name,
          fileKey: file.key,
          fileUrl: file.ufsUrl,
          fileSize: file.size,
          fileType: file.type,
          addedById: metadata.userId,
          organizationId: metadata.organizationId!,
          eventId: metadata.eventId!,
        },
      });

      // Return the file details to be saved in the database
      return {
        id: mediaFile.id,
        url: mediaFile.fileUrl,
        key: mediaFile.fileKey,
        name: mediaFile.filename,
        size: mediaFile.fileSize,
        type: mediaFile.fileType,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
