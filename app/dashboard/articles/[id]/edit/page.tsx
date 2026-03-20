export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div>Edit Article: {id} — TODO</div>;
}
