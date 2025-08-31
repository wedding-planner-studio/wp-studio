// src/app/api/cdn/[mediaId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';
import { removeSpecialCharacters } from '@/lib/utils';

const prisma = new PrismaClient();
export const runtime = 'nodejs';

// Map supported file extensions to correct MIME types
const EXT_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  // add more as needed
};

export async function GET(_req: NextRequest, context) {
  try {
    const mediaIdWithExt = context.params.mediaId;
    const ext = path.extname(mediaIdWithExt).toLowerCase();
    const mediaId = mediaIdWithExt.replace(ext, ''); // strip extension from ID

    const contentType = EXT_TO_MIME[ext];
    if (!contentType) {
      return new NextResponse('Unsupported file type', { status: 400 });
    }

    // Special case for sample.[ext]
    if (mediaId === 'sample') {
      if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.pdf') {
        try {
          const sampleImagePath = path.join(process.cwd(), 'public/sample' + ext);
          const fileBuffer = await fs.readFile(sampleImagePath);

          let contentType = 'image/png';
          if (ext === '.pdf') {
            contentType = 'application/pdf';
          } else if (ext === '.jpg' || ext === '.jpeg') {
            contentType = 'image/jpeg';
          } else if (ext === '.png') {
            contentType = 'image/png';
          }
          return new NextResponse(fileBuffer, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=31536000, immutable',
              'Content-Disposition': `inline; filename="sample${ext}"; filename*=UTF-8''sample${ext}`,
            },
          });
        } catch (error) {
          console.error('Failed to read sample image:', error);
        }
      }
    }

    const mediaFile = await prisma.mediaFile.findUnique({
      where: { id: mediaId },
      select: { fileUrl: true, filename: true },
    });

    if (!mediaFile) {
      return new NextResponse('Media not found', { status: 404 });
    }

    const fileRes = await fetch(mediaFile.fileUrl);
    if (!fileRes.ok) {
      return new NextResponse('Failed to fetch file', { status: 500 });
    }

    // Get original filename from database or fallback to ID
    let originalFilename = mediaFile.filename;

    // If no filename in database, use mediaId with extension
    if (!originalFilename) {
      originalFilename = `${mediaId}${ext}`;
    } else if (!originalFilename.endsWith(ext)) {
      // If filename doesn't have the correct extension, add it
      originalFilename = `${originalFilename}${ext}`;
    }

    // Clean the filename
    const cleanFilename = removeSpecialCharacters(originalFilename);

    // Encode for Content-Disposition
    const encodedFilename = encodeURIComponent(cleanFilename)
      .replace(/['()]/g, escape)
      .replace(/\*/g, '%2A');

    if (!originalFilename.endsWith(ext)) {
      originalFilename += ext;
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': `inline; filename="${cleanFilename}"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (e) {
    console.error('API error', e);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
