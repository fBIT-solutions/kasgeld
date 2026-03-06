import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getItems, addItem, getContainer } from "./lib/cosmosdb";

const containerId = "users";
const container = await getContainer(containerId);

export const authConfig = {
    providers: [
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const { email, password } = credentials;

                const userQuery = await container.items
                    .query({
                        query: "SELECT * FROM c WHERE c.email = @email",
                        parameters: [{ name: "@email", value: email }],
                    })
                    .fetchAll();
                
                // console.log("User Query Result:", userQuery);
                const user = userQuery.resources[0];
                if (!user) return null;

                if (!user.role.includes("admin") && user.expires && user.expires < Date.now()) {
                    console.log("User account has expired");
                    return null;
                }

                // Check if user has OTP that needs verification
                if (user.otp && user.mustChangePassword) {
                    console.log("User has OTP - requires verification first");
                    return null; // Will trigger CredentialsSignin error
                }

                const isValid = await bcrypt.compare(password, user.password);
                if (!isValid) return null;

                return {
                    id: user.id,
                    email: user.email,
                    firstname: user.firstname ?? "",
                    lastname: user.lastname ?? "",
                    displayname: user.displayname || `${user.firstname} ${user.lastname}`.trim(),
                    role: Array.isArray(user.role) ? user.role : [user.role || "member"],
                };
            },
        }),
    ],
    session: {
        strategy: "jwt", // of "database" als je dat liever hebt
    },
    secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.firstname = user.firstname;
        token.lastname = user.lastname;
        token.displayname = user.displayname;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.firstname = token.firstname;
      session.user.lastname = token.lastname;
      session.user.role = token.role;
      session.user.displayname = token.displayname;
      return session;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);

// pwd user: Hofstede81
// hash user: $2b$10$Fq9UQTpmpiZkYQ33uT.4rODqlOLksXK0MRDVDx2VPxZNp94By9dZ6