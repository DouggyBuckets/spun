import { Stack } from "expo-router";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { Text } from "react-native";

function RootLayoutContent() {
    const { isLoading } = useAuth();

    if (isLoading) {
        return <Text>Loading...</Text>;
    }

    return <Stack />;
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <RootLayoutContent />
        </AuthProvider>
    );
}
