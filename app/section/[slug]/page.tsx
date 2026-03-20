export default async function SectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <div>Section Page: {slug} — TODO</div>;
}
