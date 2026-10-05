import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lumière OS | B2B Multi-Tenant Restaurant Operating System",
  description: "All-in-one restaurant SaaS platform for reservations, real-time KDS, marketplace order sync, inventory, and fine dining operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-navy-950 text-slate-100 min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
