"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import UserCreationForm from "@/components/user-creation-form";
import RegistrationRequestsPanel from "@/components/registration-requests-panel";
import AppSettingsPanel from "@/components/app-settings-panel";
import {
    Sheet,
    SheetTrigger,
    SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { X } from "lucide-react";
import KasgeldManage from "./kasgeldManage";
import { useCommunity } from "@/context/CommunityContext";

export default function Settings({ users, runs, onChangeUsers, onChangeRuns }) {
    const { data: session } = useSession();
    const { activeCommunity } = useCommunity();
    const [selectedUser, setSelectedUser] = useState(null);
    const [openUserDetails, setOpenUserDetails] = useState(false);
    const [editUser, setEditUser] = useState(null);

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen py-2">
                <h1 className="text-3xl font-bold mb-6">Log in om Kasgeld te kunnen beheren</h1>
                <p className="text-lg">Je moet ingelogd zijn om deze pagina te bekijken.</p>
            </div>
        );
    }

    const isAdmin = activeCommunity?.isOwner;

    return (
        <div className="settings-component flex flex-col items-center w-full py-2">
            <h1 className="text-3xl font-semibold mb-6">Kasgeld Beheer</h1>
            
            <p className="text-xl font-semibold">Beheer Deelnemers</p>
            <div className="flex flex-row w-full justify-between mb-2 items-center border-b-2 border-green-800 py-2">
                <div className="flex items-center gap-2 mt-1">
                    <Select
                        value={selectedUser?.id || ""}
                        onValueChange={userId => {
                            const user = users.find(u => u.id === userId);
                            setSelectedUser(user);
                            setOpenUserDetails(true);
                            setEditUser(user);
                        }}
                    >
                        <SelectTrigger className="w-32 h-7 text-xs">
                            <SelectValue placeholder="Deelnemer" />
                        </SelectTrigger>
                        <SelectContent>
                            {users?.map(u => (
                                <SelectItem key={u.id} value={u.id}>
                                    {u.firstname} {u.lastname}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {isAdmin && (
                    <Sheet>
                        <SheetTrigger asChild className=""><Button className="text-xs">Deelnemer toevoegen</Button></SheetTrigger>
                        <SheetContent className="w-full max-w-md overflow-y-auto">
                            <div className="mt-6">
                                <UserCreationForm onUserCreated={() => onChangeUsers()} />
                            </div>
                        </SheetContent>
                    </Sheet>
                )}
            </div>
            <KasgeldManage users={users} runs={runs} onChangeUsers={onChangeUsers} onChangeRuns={onChangeRuns} />
            
            {isAdmin && (
                <div className="w-full mt-8 space-y-8">
                    <AppSettingsPanel />
                    <RegistrationRequestsPanel />
                </div>
            )}
            
            <Popover open={openUserDetails}>
                <PopoverTrigger>
                    {/* <Button className="text-xs">View User Details</Button> */}<span className="hidden">bewerken</span>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                    {selectedUser && (
                        <X
                            size={18}
                            className="absolute top-4 right-4 cursor-pointer "
                            onClick={() => {setOpenUserDetails(false); setSelectedUser(null); setEditUser(null);}}
                        />
                    )}
                    {selectedUser && (
                        <div className="flex flex-col gap-2 mt-6 text-sm">
                            <Label className="text-sm">Email:
                                <Input className="text-sm grow" value={selectedUser.email}
                                    readOnly>
                                </Input>
                            </Label>
                            <Label className="text-sm">Voornaam:
                                <Input className="text-sm" value={editUser.firstname}
                                    onChange={e => setEditUser({ ...editUser, firstname: e.target.value })}>
                                </Input>
                            </Label>
                            <Label className="text-sm">Achternaam:
                                <Input className="text-sm" value={editUser.lastname}
                                    onChange={e => setEditUser({ ...editUser, lastname: e.target.value })}>
                                </Input>
                            </Label>
                            <p className="text-sm">
                                Communityrol: {selectedUser.communityRole === "owner" ? "Owner (admin)" : "Member"}
                            </p>
                            <div className="flex flex-row justify-between items-center gap-2">
                                <Button
                                    className="mt-2"
                                    onClick={async () => {
                                        try {
                                            const res = await fetch(`/api/users?id=${encodeURIComponent(selectedUser.id)}`, {
                                                method: "PUT",
                                                headers: {
                                                    "Content-Type": "application/json",
                                                },
                                                body: JSON.stringify(editUser),
                                            });
                                            if (res.ok) {
                                                const updated = await res.json();
                                                toast.success("Deelnemer succesvol bijgewerkt!");
                                                onChangeUsers(users.map(u => u.id === selectedUser.id ? updated : u));
                                                setOpenUserDetails(false);
                                                setSelectedUser(null);
                                                setEditUser(null);
                                            } else {
                                                const error = await res.json();
                                                toast.error(error.details || "Fout bij het updaten van deelnemer.");
                                            }
                                        } catch (error) {
                                            console.error("Update error:", error);
                                            toast.error("Netwerkfout bij het updaten.");
                                        }
                                    }}>
                                    Opslaan
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="mt-2"
                                    onClick={async () => {
                                        try {
                                            const res = await fetch(`/api/users?id=${encodeURIComponent(selectedUser.id)}`, {
                                                method: "DELETE",
                                            });
                                            if (res.ok) {
                                                toast.success("Deelnemer succesvol verwijderd!");
                                                onChangeUsers(users.filter(u => u.id !== selectedUser.id));
                                                setOpenUserDetails(false);
                                                setSelectedUser(null);
                                                setEditUser(null);
                                            } else {
                                                const error = await res.json();
                                                toast.error(error.details || "Fout bij het verwijderen van deelnemer.");
                                            }
                                        } catch (error) {
                                            console.error("Delete error:", error);
                                            toast.error("Netwerkfout bij het verwijderen.");
                                        }
                                    }}>
                                    Deelnemer Verwijderen
                                </Button>
                            </div>
                        </div>
                    )
                    }
                </PopoverContent>
            </Popover>
        </div>
    );
}
// W3lc0M3@28052025