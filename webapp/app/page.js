"use client";
import { useView } from "@/context/ViewContext";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import SwapRequests from "@/components/swapRequests";

import { SignInForm } from "@/components/signin_form";
import Settings from "@/components/settings";
import EventsPage from "./events/page";
import dayjs from "dayjs";


export default function Home() {
    const { view } = useView();
    const { setView } = useView();
    const { data: session, status } = useSession();
    const router = useRouter();
    const date = dayjs().startOf('week').format('YYYY-MM-DD');
    const [runs, setRuns] = useState([]);
    const [users, setUsers] = useState([]);

    useEffect(() => {
        async function fetchEvents() {
            const res = await fetch("/api/runs");
            if (res.ok) {
                setRuns(await res.json());
            }
        }
        fetchEvents();
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
            title: "Settings",
            href: "/settings",
            description:
                "Manage your family members, guests and workers.",
            element: ({ users, runs, onChangeUsers, onChangeRuns }) => <Settings users={users} runs={runs} onChangeUsers={onChangeUsers} onChangeRuns={onChangeRuns} className="" />,
            roles: ["admin"],
        },
        {
            title: "Kalender",
            href: "/events",
            description:
                "Kasgeld Runs",
            element: ({ users, runs, onChangeUsers, onChangeRuns }) => <EventsPage users={users} runs={runs} onChangeUsers={onChangeUsers} onChangeRuns={onChangeRuns} className="" />,
            roles: ["member", "admin", "family"],
        },
        {
            title: "Swap Requests",
            href: "/swaps",
            description:
                "Manage your kasgeld swap requests",
            element: ({ users, runs, onChangeUsers, onChangeRuns }) => <SwapRequests users={users} runs={runs} onChangeUsers={onChangeUsers} onChangeRuns={onChangeRuns} className="" />,
            roles: ["member", "admin", "family"],
        },

    ]

    return (
        <main className="w-full min-h-screen h-screen">
            <div className="p-6">
                <div className="">
                    <h1 className="p-2 text-center text-3xl font-bold">Welcome @ Mavis Balker Kasgeld</h1>
                    {/* <p className="p-2 text-center text-base text-green-800/50">Our one-stop solution for family management.</p> */}
                </div>
                <div className="mt-2">
                    {(status === "authenticated") && (
                        <div className="flex flex-col space-y-2">
                            {/* {components.filter((component) =>
                                component.href === view) */}
                            {components.map((component) => (
                                <div key={component.title}>
                                    {component.roles.some(role => session.user.role.includes(role)) ? (
                                        component.element ? (
                                            component.element({ users, runs, onChangeUsers: setUsers, onChangeRuns: setRuns })
                                        ) : (
                                            router.push(component.href)
                                        )
                                        // <{component.element} className="w-80"/>
                                    ) : (
                                        <div className="text-red-500">
                                            You do not have access to this component.
                                        </div>
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
        </main >
    );
}