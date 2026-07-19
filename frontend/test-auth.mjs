import { createAuthClient } from "better-auth/react";
const authClient = createAuthClient({ baseURL: "http://localhost:6203" });
authClient.signIn.email({ email: "alice@example.com", password: "password123" }).then(console.log).catch(console.error);
