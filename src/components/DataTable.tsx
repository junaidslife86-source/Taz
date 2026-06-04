type Column<T> = {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T | ((row: T) => string);
  emptyMessage?: string;
};

export function DataTable<T>({
  columns,
  data,
  keyField,
  emptyMessage = "No data to show.",
}: DataTableProps<T>) {
  const getKey = (row: T, index: number): string => {
    if (typeof keyField === "function") return keyField(row);
    return String(row[keyField] ?? index);
  };

  if (data.length === 0) {
    return <p className="empty-table-message">{emptyMessage}</p>;
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.className}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={getKey(row, index)}>
              {columns.map((col) => (
                <td key={col.key} className={col.className}>
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
