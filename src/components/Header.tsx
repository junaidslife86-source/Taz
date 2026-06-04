type HeaderProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </header>
  );
}
