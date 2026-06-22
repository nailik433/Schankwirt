export const metadata = {
  title: "Anglerhock 2026 — Bestell-Terminal",
  description: "Bestell-Terminal für den Anglerhock 2026",
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
