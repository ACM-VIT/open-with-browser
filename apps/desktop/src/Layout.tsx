import { ReactNode } from 'react';

type LayoutProps = {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
};

export default function Layout({
  children,
  currentPage,
  onNavigate,
}: LayoutProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'rules', label: 'Rules' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className='layout'>
      <nav className='nav'>
        <div className='nav-brand'>
          <h1>Open With Browser</h1>
        </div>
        <ul className='nav-list'>
          {navItems.map(item => (
            <li key={item.id} className='nav-item'>
              <button
                className={`nav-link ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <main className='main-content'>{children}</main>
    </div>
  );
}
