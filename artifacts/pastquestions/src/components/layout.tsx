import React from "react";
import { useLocalAuth } from "@/hooks/use-local-auth";
import { Link, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  BookOpen,
  History,
  LogOut,
  Moon,
  Sun,
  User as UserIcon,
  LayoutDashboard,
  Users,
  Database,
  FileText,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Layout({ children }: { children: React.ReactNode }) {
  const { logout } = useLocalAuth();
  const { data: user } = useGetMe();
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();

  const studentNav = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Practice", href: "/practice", icon: BookOpen },
    { name: "History", href: "/history", icon: History },
  ];

  const adminNav = [
    { name: "Admin Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Questions", href: "/admin/questions", icon: FileText },
    { name: "Subjects", href: "/admin/subjects", icon: BookOpen },
    { name: "Exam Types", href: "/admin/exam-types", icon: Database },
    { name: "Users", href: "/admin/users", icon: Users },
  ];

  const nav = user?.role === "admin" ? adminNav : studentNav;
  const displayName = user?.firstName || user?.username || "User";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background w-full">
        <Sidebar>
          <SidebarHeader className="h-16 flex items-center px-4 border-b">
            <Link href={user?.role === "admin" ? "/admin" : "/practice"} className="flex items-center gap-2 font-bold text-lg text-primary tracking-tight">
              <div className="bg-primary text-primary-foreground p-1 rounded">
                <BookOpen className="h-5 w-5" />
              </div>
              FedCSQ
            </Link>
          </SidebarHeader>
          <SidebarContent className="py-4">
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.href || location.startsWith(item.href + "/")}
                    tooltip={item.name}
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t p-4">
            <div className="flex items-center justify-between">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-auto p-0 hover:bg-transparent justify-start">
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {displayName[0]?.toUpperCase() || <UserIcon className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-sm">
                      <span className="font-medium">{displayName}</span>
                      <span className="text-xs text-muted-foreground capitalize">{user?.role || "student"}</span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                    {theme === "dark" ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                    Toggle Theme
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => logout()} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between px-6 border-b bg-background sticky top-0 z-10 md:hidden">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="font-bold text-primary">FedCSQ</span>
            </div>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                {displayName[0]?.toUpperCase() || <UserIcon className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-8 w-full max-w-[1400px] mx-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
