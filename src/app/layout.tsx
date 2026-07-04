import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "KilnGuard | Predictive Refractory & Digital Twin Early-Warning System",
  description: "Predictive maintenance dashboard and real-time mathematical risk engine for Dangote Cement Plc rotary kilns, analyzing thermal profiles and chemical fuel stresses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark h-full antialiased`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('unhandledrejection', function(event) {
                if (event.reason && (
                  (event.reason.message && event.reason.message.indexOf('MetaMask') !== -1) ||
                  (event.reason.stack && event.reason.stack.indexOf('MetaMask') !== -1) ||
                  (event.reason.toString && event.reason.toString().indexOf('MetaMask') !== -1)
                )) {
                  event.preventDefault();
                  console.warn('Suppressed MetaMask extension rejection:', event.reason);
                }
              });
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[#060814] text-slate-100 scanline selection:bg-sky-500/30">
        {children}
      </body>
    </html>
  );
}
