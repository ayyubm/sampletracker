import { AuthProvider } from '../lib/contexts/AuthContext';
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <div id="portal-root" />
        </AuthProvider>
      </body>
    </html>
  );
}
