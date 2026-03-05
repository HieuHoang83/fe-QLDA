import DocumentDetail from "@/components/Menu/DocumentDetail";

export default function DocumentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <DocumentDetail id={params.id} />;
}
