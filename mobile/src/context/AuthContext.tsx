import { createContext, useContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { apiFetch } from "../api/client";

interface User {
    id: number;
    username: string;
}

interface AuthContextValue {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const token = await SecureStore.getItemAsync("api_token");
                if (token) {
                    const data = await apiFetch<User>("/auth/me");
                    setUser(data);
                }
            } catch {
                await SecureStore.deleteItemAsync("api_token");
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    async function login(email: string, password: string) {
        const data = await apiFetch<{ token: string; user: User }>("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });
        await SecureStore.setItemAsync("api_token", data.token);
        setUser(data.user);
    }

    async function logout() {
        await SecureStore.deleteItemAsync("api_token");
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
