import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";
import { Menu } from "lucide-react";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 items-center border-b border-border px-4 md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground">
            <Menu className="h-6 w-6" />
          </button>
          <span className="ml-3 text-lg font-bold text-foreground">Memora</span>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <MobileNav />
      </div>
    </div>
  );
}
