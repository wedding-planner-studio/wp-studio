'use client';

import PublicLayout from '@/components/layouts/PublicLayout';
import Image from 'next/image';

interface TeamMember {
  name: string;
  title?: string;
  bio: string;
  imageSrc?: string;
}

const team: TeamMember[] = [
  {
    name: 'Maria Amparo Romo Rosas',
    title: 'Fundadora',
    bio:
      'Nacida y criada en México, nuestra fundadora es una orgullosa madre de cuatro hijos que siempre soñó con construir algo que sus hijos pudieran admirar. Con una profunda pasión por la elegancia, la organización y los valores familiares, transformó su visión en una empresa que crea bodas y eventos inolvidables. La innovación permanece en el corazón de su liderazgo, asegurando que el negocio siga evolucionando sin perder su esencia: la excelencia en cada detalle.',
    imageSrc: 'https://8eyoe3mdhc.ufs.sh/f/n8JiHxKrIpGQxvZTgpybOnPso0VvhXd45wyEWCLqgZUD2lkm',
  },
  {
    name: 'Alejandra Goretti Figueroa Romo',
    title: 'CEO',
    bio:
      'A los 24 años, nuestra CEO representa la nueva generación de liderazgo: dinámica, ambiciosa y visionaria. Con formación en medicina, decidió pausar su carrera para enfocarse en expandir el legado de su madre y guiar a la empresa hacia el futuro. Su misión es clara: impulsar la innovación, crear diferenciadores sólidos y conectar con clientes más jóvenes sin perder la tradición de excelencia de la marca. Bajo su liderazgo, la compañía evoluciona, combinando elegancia atemporal con tendencias modernas para mantenerse como líder del mercado.',
    imageSrc: 'https://8eyoe3mdhc.ufs.sh/f/n8JiHxKrIpGQ0leCLGHWMVRXx7eiwEC8l5QAg4BfHcqKNGbd',
  },
  {
    name: 'Esteban Perez',
    title: 'Jefe de Tecnología',
    bio:
      'A los 27 años, nuestro Jefe de Tecnología aporta más de cinco años de experiencia en el mundo de la programación, donde ha perfeccionado el arte de convertir ideas complejas en soluciones digitales fluidas. Apasionado por la innovación, cree que la tecnología no solo debe resolver problemas, sino crear experiencias extraordinarias. Su visión es fusionar creatividad con tecnología de vanguardia para hacer cada evento más inteligente, ágil e inolvidable. Con su liderazgo, la empresa abraza el futuro con confianza y valentía.',
    imageSrc: 'https://8eyoe3mdhc.ufs.sh/f/n8JiHxKrIpGQGG6yrw9sztDIT5oSBPhZkvEYUN3wLWnCuarO',
  },
  {
    name: 'Mariana Hernandez Hernandez',
    title: 'Jefa de Diseño',
    bio:
      'A los 29 años, nuestra Jefa de Diseño, originaria de Guadalajara, México, aporta años de experiencia transformando recintos en espacios extraordinarios. Orgullosamente mexicana, combina sus raíces culturales con un refinado sentido del estilo para crear diseños auténticos e innovadores. Con un ojo clínico para los detalles y una pasión por contar historias a través de los espacios, se asegura de que cada evento se sienta único, elegante e inolvidable. Para ella, cada venue es más que un lugar: es el escenario donde los recuerdos cobran vida.',
    imageSrc: 'https://8eyoe3mdhc.ufs.sh/f/n8JiHxKrIpGQ41QzTYOpSt69s83zfvmZabUhC4PqWAox2Nry',
  },
  {
    name: 'Joshua Omar Villa  Figueroa',
    title: 'Jefe de Audiovisuales',
    bio:
      'A los 27 años, nuestro Jefe de Audiovisuales suma más de una década de experiencia forjada por su pasión por la fotografía, que comenzó a los 12 años. Con una sólida visión artística y pericia técnica, lidera la creación de contenido visual de alta calidad que eleva cada evento. Su compromiso con la excelencia garantiza que cada producción no solo registre momentos, sino que los convierta en poderosas historias que fortalecen la marca y la experiencia de nuestros clientes.',
    imageSrc: 'https://8eyoe3mdhc.ufs.sh/f/n8JiHxKrIpGQBFaTygdns7B4thLjgkKRY9TSqP0CGzXErw58',
  },
];

export default function TeamPage() {
  return (
    <PublicLayout includeFooter>
      <section className="pt-28 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-flex items-center rounded-full bg-purple-50/80 px-3 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-200">
              Nuestro equipo
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">
                Las personas detrás de la excelencia
              </span>
            </h1>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              Elegancia, innovación y atención al detalle, hechas por un equipo apasionado.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {team.map(member => (
              <article
                key={member.name}
                className="group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur-sm p-6 sm:p-8 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div className="flex items-start gap-5">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-1 ring-gray-200">
                    <Image
                      src={member.imageSrc || '/placeholder-user.jpg'}
                      alt={member.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 leading-snug">
                      {member.name}
                    </h3>
                    {member.title && (
                      <p className="text-sm text-purple-700 font-medium mt-0.5">
                        {member.title}
                      </p>
                    )}
                  </div>
                </div>

                <p className="mt-5 text-sm sm:text-base leading-relaxed text-gray-700">
                  {member.bio}
                </p>

                {/* Accent gradient blob */}
                <div className="pointer-events-none absolute -right-20 -bottom-20 h-56 w-56 rounded-full opacity-10 blur-2xl bg-[conic-gradient(from_0deg_at_center,#9333EA_0deg,#7C3AED_72deg,#6D28D9_144deg,#5B21B6_198deg,#4C1D95_261deg,#9333EA_360deg)]" />
                <div className="pointer-events-none absolute -left-24 -top-24 h-40 w-40 rounded-full opacity-[0.07] blur-2xl bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.8),transparent_60%)]" />
              </article>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}


