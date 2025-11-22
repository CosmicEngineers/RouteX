import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HPCL Coastal Tanker Fleet Optimizer",
  description: "Strategic Optimization Platform for Hindustan Petroleum Corporation Limited",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
