export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <div>Article Page: {slug} — TODO</div>;
}
