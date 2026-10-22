"use client";
import { useView } from "@/context/ViewContext";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import SwapRequests from "@/components/swapRequests";
import NextUnitTransaction from "@/components/nextUnitTransaction";
import { UserMenu } from "@/components/user-menu";
import { PaymentStatusBanner } from "@/components/payment-status-banner";
import NotificationBadge from "@/components/notification-badge";
import { Button } from "@/components/ui/button";

import { SignInForm } from "@/components/signin_form";
import EventsPage from "./events/page";
import dayjs from "dayjs";
import { Currency, BanknoteArrowDownIcon } from "lucide-react";
import { ContactMessageButton } from "@/components/contact-message-button";
import { KasgeldRulesButton } from "@/components/kasgeld-rules-button";
import { useCommunity } from "@/context/CommunityContext";


export default function Home() {
    const { view } = useView();
    const { setView } = useView();
    const { data: session, status } = useSession();
    const { activeCommunity } = useCommunity();
    const router = useRouter();
    const date = dayjs().startOf('week').format('YYYY-MM-DD');
    const [runs, setRuns] = useState([]);
    const [users, setUsers] = useState([]);
    const [settings, setSettings] = useState({});

    useEffect(() => {
        async function fetchEvents() {
            const res = await fetch("/api/runs");
            if (res.ok) {
                setRuns(await res.json());
            }
        }
        async function fetchSettings() {
            const res = await fetch("/api/settings/get-config");
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
            }
        }
        fetchEvents();
        fetchSettings();
    }, []);

    useEffect(() => {
        async function fetchUsers() {
            const res = await fetch("/api/users");
            if (res.ok) {
                const data = await res.json()
                setUsers(data);
            }
        }
        if (session) {
            fetchUsers();
        }
    }, [session]);

    const components = [
        {
            title: "Volgende Transactie",
            href: "/next-transaction",
            description:
                "Je volgende geplande kasgeld transactie.",
            element: ({ users, runs, onChangeUsers, onChangeRuns }) => <NextUnitTransaction users={users} runs={runs} />,
            roles: ["member", "admin", "family"],
        },
        {
            title: "Kalender",
            href: "/events",
            description:
                "Kasgeld kalender met alle transacties.",
            element: ({ users, runs, onChangeUsers, onChangeRuns }) => <EventsPage users={users} runs={runs} onChangeUsers={onChangeUsers} onChangeRuns={onChangeRuns} className="" />,
            roles: ["member", "admin", "family"],
        },
        {
            title: "Ruil Verzoeken",
            href: "/swaps",
            description:
                "Beheer je kasgeld ruilverzoeken.",
            element: ({ users, runs, onChangeUsers, onChangeRuns }) => <SwapRequests users={users} runs={runs} onChangeUsers={onChangeUsers} onChangeRuns={onChangeRuns} className="" />,
            roles: ["member", "admin", "family"],
        },

    ]

    return (
      <main className="w-full min-h-screen h-screen">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">
              Welkom @ {activeCommunity?.name || "Kasgeld"}
            </h1>
            {status === "authenticated" && (
              <div className="flex items-center gap-4">
                <NotificationBadge />
                <UserMenu />
              </div>
            )}
          </div>
          <div className="mt-2">
            {status === "authenticated" && (
              <div className="flex flex-col space-y-4">
                {/* Admin Beheer Button */}
                {activeCommunity?.isOwner && (
                  <Button
                    onClick={() => router.push("/beheer")}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    Beheer Kasgeld (Admin)
                  </Button>
                )}
                {/* Payment Status Banner */}
                {session?.user?.email && session?.user?.id && (
                  <div className="mb-4">
                    {settings.paymentUrl && (
                    <Button
                      onClick={() =>
                        window.location.href = settings.paymentUrl 
                      }
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <BanknoteArrowDownIcon size={18} className=" text-white" /> Inleg betalen met WERO (Ideal)
                    </Button>
                    )}
                    <PaymentStatusBanner
                      userEmail={session.user.email}
                      userId={session.user.id}
                    />
                  </div>
                )}
                {/* {components.filter((component) =>
                                component.href === view) */}
                {components.map((component) => (
                  <div key={component.title}>
                    {component.roles.some((role) =>
                      session.user.role.includes(role),
                    ) ? (
                      component.element ? (
                        <div key={`${component.title}-${runs.length}`}>
                          {component.element({
                            users,
                            runs,
                            onChangeUsers: setUsers,
                            onChangeRuns: setRuns,
                          })}
                        </div>
                      ) : (
                        router.push(component.href)
                      )
                    ) : (
                      // <{component.element} className="w-80"/>
                      <div className="text-red-500"></div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {status !== "authenticated" && (
              <div className="flex flex-col items-center justify-center min-h-screen py-2">
                <SignInForm />
              </div>
            )}
          </div>
        </div>
          <div className="px-2 py-2">
            <p className="text-xs text-muted-foreground mb-2">Hulp & Informatie</p>
            <div className="flex gap-1">
              <KasgeldRulesButton />
              <ContactMessageButton />
            </div>
          </div>
        
      </main>
    );
}