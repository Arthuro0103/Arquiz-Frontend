import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      {/* Aqui pode ir um Header ou Navbar comum */}
      <main>{children}</main>
      {/* Aqui pode ir um Footer comum */}
    </div>
  );
};

export default Layout; 