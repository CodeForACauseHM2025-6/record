import Link from "next/link";

export function BylineAuthors({
  authors,
  linkClassName,
}: {
  authors: { id: string; name: string }[];
  linkClassName?: string;
}) {
  return (
    <>
      {authors.map((a, i) => (
        <span key={a.id}>
          <Link href={`/profile/${a.id}`} className={linkClassName}>
            {a.name}
          </Link>
          {i < authors.length - 1 && (
            <span>{i === authors.length - 2 ? " & " : ", "}</span>
          )}
        </span>
      ))}
    </>
  );
}
