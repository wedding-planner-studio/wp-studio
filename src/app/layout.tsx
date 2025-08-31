import { GeistSans } from 'geist/font/sans';
import '@/styles/globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={GeistSans.className}>{children}</body>
    </html>
  );
}
