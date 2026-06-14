import { cn } from '@/utils/cn';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export const Table = ({ children, className }: TableProps) => {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm text-left">
        {children}
      </table>
    </div>
  );
};

interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

Table.Header = ({ children, className }: TableHeaderProps) => (
  <thead className={cn('text-xs text-slate-600 uppercase bg-slate-50', className)}>
    {children}
  </thead>
);

interface TableBodyProps {
  children: React.ReactNode;
  className?: string;
}

Table.Body = ({ children, className }: TableBodyProps) => (
  <tbody className={cn('divide-y divide-slate-100', className)}>
    {children}
  </tbody>
);

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
  style?: React.CSSProperties;
}

Table.Row = ({ children, className, onClick, selected, style }: TableRowProps) => (
  <tr
    className={cn(
      'bg-white border-b transition-colors duration-150',
      selected && 'bg-blue-50',
      onClick && 'cursor-pointer hover:bg-slate-50',
      className
    )}
    onClick={onClick}
    style={style}
  >
    {children}
  </tr>
);

interface TableCellProps {
  children: React.ReactNode;
  className?: string;
  header?: boolean;
}

Table.Cell = ({ children, className, header }: TableCellProps) => {
  if (header) {
    return (
      <th className={cn('px-4 py-3 font-semibold text-slate-600', className)}>
        {children}
      </th>
    );
  }
  return (
    <td className={cn('px-4 py-3 text-slate-700', className)}>
      {children}
    </td>
  );
};
