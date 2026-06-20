export const metadata = {
  title: "Schankwirt — Bestell-Terminal",
  description: "Bestell-Terminal für Fest & Gastronomie",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
