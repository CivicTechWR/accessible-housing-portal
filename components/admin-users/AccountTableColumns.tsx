/**
 * The column widths shared by the Invitations and All users tables, so their columns line up on
 * the users page: name, role, status, two dates, then a narrow actions column.
 */
export function AccountTableColumns() {
  return (
    <colgroup>
      <col />
      <col className="w-[18%]" />
      <col className="w-[20%]" />
      <col className="w-[12%]" />
      <col className="w-[12%]" />
      <col className="w-14" />
    </colgroup>
  );
}
