export function ClientOrderSourceEmailsField({
  emails,
}: {
  emails: string[];
}) {
  return (
    <div>
      <dt className="text-[var(--text-muted)]">С каких почт поступают заказы</dt>
      <dd className="mt-0.5 break-all text-[var(--text-strong)]">
        {emails.length > 0 ? (
          <ul className="list-none space-y-0.5">
            {emails.map((email) => (
              <li key={email}>
                <a
                  href={`mailto:${email}`}
                  className="text-[var(--sidebar-blue)] hover:underline"
                >
                  {email}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          "—"
        )}
      </dd>
    </div>
  );
}
