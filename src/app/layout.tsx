import type { Metadata } from "next";
import { Playfair_Display, Cormorant_Garamond, Poppins } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "700", "900"],
});
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["400", "500", "600", "700"],
});
const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["300", "400", "500", "600", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Lumière — Royal Indian Fine Dining | Indiranagar, Bengaluru",
    template: "%s | Lumière",
  },
  description:
    "Lumière is a royal celebration of India's rich culinary traditions — Awadhi, Mughlai, Chettinad, Coastal, and Punjabi delicacies in the heart of Bengaluru, India.",
  openGraph: {
    title: "Lumière — Royal Indian Fine Dining",
    description: "A royal celebration of authentic Indian regional flavours on a single table. Indiranagar, Bengaluru.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${cormorant.variable} ${poppins.variable} antialiased`}>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
