"use client";
import { React, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import SignUpForm from "@/components/signup_form";
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
import { Checkbox } from "./ui/checkbox";
import { toast } from "sonner";
import QRCodeComponent from "@/components/qr-generator";
import { X } from "lucide-react";
import dayjs from "dayjs";
import KasgeldManage from "./kasgeldManage";

export default function Settings({ users, runs, onChangeUsers, onChangeRuns }) {
    const { data: session } = useSession();
    const router = useRouter();
    const [selectedUser, setSelectedUser] = useState(null);
    const [openUserDetails, setOpenUserDetails] = useState(false);
    const [openRolePopover, setOpenRolePopover] = useState(false);
    const [editUser, setEditUser] = useState([]);
    const roles = ["default", "guest", "member", "family", "worker", "admin"];
                                    const [qrToken, setQrToken] = useState(null);

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen py-2">
                <h1 className="text-3xl font-bold mb-6">Please log in to access Settings</h1>
                <p className="text-lg">You need to be logged in to view this page.</p>
            </div>
        );
    }

    return (
        <div className="settings-component flex flex-col items-center w-full py-2">
            <h1 className="text-3xl font-semibold mb-6">Settings</h1>
                <p className="text-xl font-semibold">Manage Users</p>
            <div className="flex flex-row w-full justify-between mb-2 items-center border-b-2 border-green-800 py-2">
                <div className="flex items-center gap-2 mt-1">
                    <Select
                        value={selectedUser?.id || ""}
                        onValueChange={userId => {
                            const user = users.find(u => u.id === userId);
                            setSelectedUser(user);
                            setOpenUserDetails(true);
                            setEditUser({ ...user });
                        }}
                    >
                        <SelectTrigger className="w-32 h-7 text-xs">
                            <SelectValue placeholder="User" />
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
                <Sheet>
                    <SheetTrigger asChild className=""><Button className="text-xs">Add users</Button></SheetTrigger>
                    <SheetContent className="w-full max-w-md">
                        <SignUpForm />
                    </SheetContent>
                </Sheet>
            </div>
            <KasgeldManage users={users} runs={runs} onChangeUsers={onChangeUsers} onChangeRuns={onChangeRuns} />
            <Popover open={openUserDetails}>
                <PopoverTrigger>
                    {/* <Button className="text-xs">View User Details</Button> */}<span className="hidden">edit</span>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                    {selectedUser && (
                        <X
                            size={18}
                            className="absolute top-4 right-4 cursor-pointer "
                            onClick={() => {setOpenUserDetails(false); setSelectedUser(null); setEditUser([]); setQrToken(null);}}
                        />
                    )}
                    {selectedUser && (
                        <div className="flex flex-col gap-2 mt-6 text-sm">
                            <Label className="text-sm">Email:
                                <Input className="text-sm grow" value={selectedUser.email}
                                    readOnly>
                                </Input>
                            </Label>
                            <Label className="text-sm">First Name:
                                <Input className="text-sm" value={editUser.firstname}
                                    onChange={e => setEditUser({ ...editUser, firstname: e.target.value })}>
                                </Input>
                            </Label>
                            <Label className="text-sm">Last Name:
                                <Input className="text-sm" value={editUser.lastname}
                                    onChange={e => setEditUser({ ...editUser, lastname: e.target.value })}>
                                </Input>
                            </Label>
                            <Label className="text-sm">Roles:
                                <Popover open={openRolePopover} onOpenChange={setOpenRolePopover}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="grow justify-start">
                                            {editUser.role.length
                                                ? editUser.role.join(", ")
                                                : "Select roles"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="">
                                        <div className="flex flex-col space-y-2">
                                            {roles.map((role) => (
                                                <div key={role} className="flex items-center space-x-2" >
                                                    <Checkbox
                                                        id={role}
                                                        checked={editUser.role.includes(role)}
                                                        onCheckedChange={(checked) => {
                                                            console.log("Checkbox checked:", checked);
                                                            const newValue = checked
                                                                ? [...(editUser.role || []), role]
                                                                : editUser.role?.filter((r) => r !== role);

                                                            setEditUser({ ...editUser, role: newValue });
                                                        }}
                                                    />
                                                    <label
                                                        htmlFor={role}
                                                        className="text-sm font-medium leading-none"
                                                    >
                                                        {role.charAt(0).toUpperCase() + role.slice(1)}
                                                    </label>
                                                </div>
                                            ))}
                                            <Button
                                                variant="outline"
                                                className="mt-2"
                                                onClick={() => {
                                                    setOpenRolePopover(false);
                                                }}>
                                                Close
                                            </Button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </Label>
                            <Label className="text-sm">Expires:
                                <Input className="text-sm" type="date"
                                    value={dayjs(editUser.expires).format("YYYY-MM-DD")}
                                    onChange={e => setEditUser({ ...editUser, expires: e.target.value })}>
                                </Input>
                            </Label>
                            <Button
                                variant="outline"
                                className="mt-2 text-sm"
                                onClick={() => {
                                    const userToken = Buffer.from(`${selectedUser.email}:${selectedUser.password}`).toString("base64");
                                    setQrToken(`https://fambalker.net/guest-access?token=${userToken}`);
                                }}
                            >
                                Generate Login QR Code
                            </Button>
                            {qrToken && <QRCodeComponent url={qrToken} />}
                            <div className="flex flex-row justify-between items-center gap-2">
                                <Button
                                    className="mt-2"
                                    onClick={async () => {
                                        const res = await fetch(`/api/users?id=${selectedUser.id}&email=${selectedUser.email}`, {
                                            method: "PUT",
                                            headers: {
                                                "Content-Type": "application/json",
                                            },
                                            body: JSON.stringify(editUser),
                                        });
                                        if (res.ok) {
                                            toast.success("User updated successfully!");
                                            onChangeUsers(users.map(u => u.id === selectedUser.id ? { ...u, ...editUser } : u));
                                            setOpenUserDetails(false);
                                            setSelectedUser(null);
                                            setEditUser([]);
                                        } else {
                                            toast.error("Failed to update user.");
                                        }
                                    }}>
                                    Save
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="mt-2"
                                    onClick={async () => {
                                        const res = await fetch(`/api/users?id=${selectedUser.id}&email=${selectedUser.email}`, {
                                            method: "DELETE",
                                        });
                                        if (res.ok) {
                                            toast.success("User deleted successfully!");
                                            onChangeUsers(users.filter(u => u.id !== selectedUser.id));
                                            setOpenUserDetails(false);
                                            setSelectedUser(null);
                                            setEditUser([]);
                                        } else {
                                            toast.error("Failed to delete user.");
                                        }
                                    }}>
                                    Delete User
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