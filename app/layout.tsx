export const metadata = {
  title: "The Record — Horace Mann School",
  description: "The student newspaper of Horace Mann School",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
