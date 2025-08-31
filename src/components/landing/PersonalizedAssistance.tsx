'use client';

export default function PersonalizedAssistance() {
  return (
    <section id="empleado-ia" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight text-gray-900 mb-6 leading-tight">
          La atención personalizada <br />
          <span className="text-purple-500">que cada invitado merece</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8 leading-relaxed">
          WP Studio atiende a tus invitados a cualquier hora y en su propio idioma. Para que tú puedas
          enfocarte en lo que realmente importa.
        </p>
      </div>

      {/* Chat Interface */}
      <div className="max-w-4xl mx-auto">
        <div className="space-y-6">
          {/* Guest Message 1 - Spanish */}
          <div className="flex items-start space-x-3 animate-[slideInLeft_0.8s_ease-out]">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-medium">MG</span>
            </div>
            <div className="flex-1">
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-800">¡Sí voy! ¿A qué hora es la ceremonia?</p>
              </div>
              <p className="text-xs text-gray-500 mt-1">María García</p>
            </div>
          </div>

          {/* WP Studio Response 1 - Spanish */}
          <div className="flex items-start space-x-3 justify-end animate-[slideInRight_0.8s_ease-out_1s_both]">
            <div className="flex-1 text-right">
              <div className="bg-purple-600 text-white rounded-2xl px-4 py-3 shadow-sm inline-block">
                <p className="text-sm">
                  ¡Perfecto María, ya está confirmada! La ceremonia es a las 4:00 PM en el Jardín
                  Botánico 🌸
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1">WP Studio • Instantáneo</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
          </div>

          {/* Guest Message 2 - English */}
          <div className="flex items-start space-x-3 animate-[slideInLeft_0.8s_ease-out_2s_both]">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-medium">JS</span>
            </div>
            <div className="flex-1">
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-800">
                  Hi! What&apos;s the dress code for the wedding?
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1">John Smith</p>
            </div>
          </div>

          {/* WP Studio Response 2 - English */}
          <div className="flex items-start space-x-3 justify-end animate-[slideInRight_0.8s_ease-out_3s_both]">
            <div className="flex-1 text-right">
              <div className="bg-purple-600 text-white rounded-2xl px-4 py-3 shadow-sm inline-block">
                <p className="text-sm">
                  Hello John! The dress code is cocktail attire. Looking forward to seeing you
                  there! 🤵
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1">WP Studio • Instant</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
          </div>

          {/* Guest Message 3 - Italian */}
          <div className="flex items-start space-x-3 animate-[slideInLeft_0.8s_ease-out_4s_both]">
            <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-medium">GR</span>
            </div>
            <div className="flex-1">
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-800">Ciao! Ci sarà un menu vegetariano?</p>
              </div>
              <p className="text-xs text-gray-500 mt-1">Giulia Rossi</p>
            </div>
          </div>

          {/* WP Studio Response 3 - Italian */}
          <div className="flex items-start space-x-3 justify-end animate-[slideInRight_0.8s_ease-out_5s_both]">
            <div className="flex-1 text-right">
              <div className="bg-purple-600 text-white rounded-2xl px-4 py-3 shadow-sm inline-block">
                <p className="text-sm">
                  Ciao Giulia! Sì, abbiamo opzioni vegetariane deliziose nel menu! 🌱
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1">WP Studio • Istantaneo</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
          </div>
        </div>
      </div>

      {/* Custom keyframes for animations */}
      <style jsx>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </section>
  );
}
