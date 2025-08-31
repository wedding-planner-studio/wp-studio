'use client';

import React, { useState } from 'react';
import { Calendar, ArrowRight, User, Mail, Phone, CheckCircle } from 'lucide-react';
import { api } from '@/trpc/react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Button, Input } from '../ui';
import { BOOK_A_MEETING_URL } from '@/lib/constants';

export default function BookAMeeting() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { mutate: joinWaitlist, isPending } = api.user.joinWaitlist.useMutation({
    onSuccess: () => {
      setIsSubmitted(true);
      setFormData({ name: '', email: '', phone: '' });
      toast.success(
        'Gracias por tu interés en Evana. Nos pondremos en contacto contigo muy pronto.'
      );
    },
    onError: error => {
      console.error('Error joining waitlist:', error);
      toast.error('Por favor, inténtalo de nuevo más tarde.');
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simply call the mutation - state will be handled in onSuccess/onError
    joinWaitlist(formData);
  };

  if (isSubmitted) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-3xl md:text-4xl font-normal tracking-tight text-gray-900 mb-4 leading-tight">
            ¡Gracias por tu interés!
          </h2>
          <p className="text-base text-gray-500 max-w-xl mx-auto leading-relaxed">
            Nos pondremos en contacto contigo muy pronto para ayudarte con tu evento perfecto.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="book-a-meeting" className="bg-gradient-to-b from-white via-purple-50/20 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          {/* Badge */}
          <div className="inline-flex items-center bg-purple-50 text-purple-600 px-3 py-1.5 rounded-full text-sm font-medium mb-4 relative overflow-hidden">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-purple-300/30 to-transparent animate-[spin_6s_linear_infinite] blur-sm"></div>
            <Calendar className="h-4 w-4 mr-2 relative z-10" />
            <span className="relative z-10">Reserva tu demo</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-normal tracking-tight text-gray-900 mb-4 leading-tight">
            ¿Listo para crear eventos
            <br />
            <span className="text-purple-500">inolvidables?</span>
          </h1>

          {/* Description */}
          <p className="text-base text-gray-500 max-w-xl mx-auto mb-6 leading-relaxed">
            Descubre cómo Evana puede transformar la gestión de tus eventos. Agenda una demo
            personalizada o déjanos tus datos para comenzar.
          </p>
        </div>

        {/* CTA Form Card */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 ease-out">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Left Side - Benefits */}
              <div className="p-6 lg:p-8 bg-gradient-to-br from-purple-600 to-purple-700 text-white">
                <div className="h-full flex flex-col justify-center">
                  <h3 className="text-xl lg:text-2xl font-normal mb-4 leading-tight">
                    Demo personalizada
                    <span className="block text-purple-200">sin compromiso</span>
                  </h3>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-purple-100">
                      <CheckCircle className="h-4 w-4 mr-3 text-purple-200 flex-shrink-0" />
                      <span className="text-sm">Demo personalizada de 15 minutos</span>
                    </div>
                    <div className="flex items-center text-purple-100">
                      <CheckCircle className="h-4 w-4 mr-3 text-purple-200 flex-shrink-0" />
                      <span className="text-sm">Sin compromiso ni costos ocultos</span>
                    </div>
                    <div className="flex items-center text-purple-100">
                      <CheckCircle className="h-4 w-4 mr-3 text-purple-200 flex-shrink-0" />
                      <span className="text-sm">Configuración gratuita incluida</span>
                    </div>
                  </div>

                  <p className="text-purple-100 text-sm leading-relaxed">
                    Únete a más de 500 wedding planners que ya confían en Evana para crear
                    experiencias excepcionales.
                  </p>
                </div>
              </div>

              {/* Right Side - Contact Form */}
              <div className="p-6 lg:p-8">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre completo
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                        placeholder="Tu nombre"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Correo electrónico
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                        placeholder="tu@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                        placeholder="+52 55 1234 5678"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-3">
                    {/* Submit Form Button */}
                    <Button
                      disabled={isPending}
                      type="submit"
                      className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-2.5 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-2 group"
                    >
                      <span>Enviar información</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </Button>

                    {/* Book Meeting Button */}
                    <Link
                      href={BOOK_A_MEETING_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-gray-600 px-6 py-2.5 rounded-lg text-xs font-medium hover:text-gray-900 transition-all duration-300 flex items-center justify-center space-x-2"
                    >
                      Reservar demo ahora
                    </Link>
                  </div>

                  <p className="text-xs text-gray-500 text-center pt-2">
                    Al enviar este formulario, aceptas recibir comunicaciones de Evana. Puedes
                    cancelar en cualquier momento.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
