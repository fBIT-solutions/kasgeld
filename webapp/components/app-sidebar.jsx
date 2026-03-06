"use client";

import { useView } from "@/context/ViewContext";
import { useSession } from "next-auth/react";
import { Calendar, Home, Settings, LogInIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarGroupContent,
    SidebarTrigger,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar
  } from "@/components/ui/sidebar";
  
  const items = [
    { url: "/events", icon: Calendar, title: "Kasgeld Kalender" },
    { url: "/settings", icon: Settings, title: "Settings" },
  ];

  export function AppSidebar() {
    const router = useRouter();
    const session = useSession();
    const { state,open,setOpen,openMobile,setOpenMobile,isMobile,toggleSidebar} = useSidebar()
    const { setView } = useView();
    return (
      <Sidebar variant="sidebar" collapsible="icon" >
        <SidebarHeader className="flex flex-row items-center justify-between">
          <SidebarTrigger className="hover:text-green-800 "/>
          <div className="flex items-center gap-2">
            { session.data?.user?.id ? (
              <UserMenu />
            ) : (
              <Button variant="ghost" onClick={() => {router.push("/signin")}}><LogInIcon /></Button>
            )}
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup />
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Button href="/" onClick={() => {setView("/"); router.push("/")}} className="mt-2 justify-start text-(--cus-accent-color-light) hover:text-(--cus-accent-hover-color-light) cursor-pointer bg-transparent border-none" >
                    <Home />
                    <span onClick= {() => {toggleSidebar() }}>Home</span>
                  </Button>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Button href={item.url} onClick= {() => {setView(item.url)}} className="mt-2 justify-start text-(--cus-accent-color-light) hover:text-(--cus-accent-hover-color-light) cursor-pointer bg-transparent border-none" >
                      <item.icon />
                      <span onClick= {() => {toggleSidebar() }}>{item.title}</span>
                    </Button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
          <SidebarGroup />
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>
    )
  }
  