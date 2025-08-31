'use client';
import { ArrowRight } from 'lucide-react';
import { Button } from '../ui';
import Link from 'next/link';
import { BOOK_A_MEETING_URL } from '@/lib/constants';

export default function GrowYourBusiness() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight text-gray-900 mb-6 leading-tight">
          Tu negocio crece.
          <br />
          <span className="text-purple-500">El caos no.</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed mb-8">
          WP Studio garantiza atención personalizada para cada invitado, incluso mientras manejas más
          eventos al mismo tiempo.
        </p>
        <Link href={BOOK_A_MEETING_URL} target="_blank" rel="noopener noreferrer">
          <Button className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 group mx-auto">
            <span>Muéstrame cómo</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
