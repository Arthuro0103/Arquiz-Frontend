import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// import Layout from "@/components/Layout"; // Removido
import { ThemeProvider } from "@/components/ThemeProvider";
import AuthProvider from "@/components/AuthProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import ErrorBoundary from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/sonner';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arquiz - Quiz Platform",
  description: "Real-time quiz competitions platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <AuthProvider>
            <QueryProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                <WebSocketProvider>
                    {children}
                    <Toaster />
                </WebSocketProvider>
              </ThemeProvider>
            </QueryProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
