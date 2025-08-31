import { RestrictedEvents } from '@/components/providers/restricted-events';

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return <RestrictedEvents>{children}</RestrictedEvents>;
}
