import { useEffect, useState } from "react";
import { View, Text, Image, Pressable, TextInput, ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { apiFetch, ApiError } from "../../api/client";
import { colors } from "../../constants/theme";
import { StarRating } from "../../components/StarRating";
import { useToggle } from "../../hooks/useToggle";

export default function SongDetailScreen() {
    const { id, albumId, name, albumName, artistNames, imageUrl } = useLocalSearchParams<{
        id: string;
        albumId: string;
        name: string;
        albumName: string;
        artistNames: string;
        imageUrl?: string;
    }>();

    const [myRating, setMyRating] = useState<number | null>(null);
    const [ratingError, setRatingError] = useState<string | null>(null);

    const like = useToggle(`/likes/songs/${id}`, "liked", { albumSpotifyId: albumId });
    const listenLater = useToggle(`/listen-later/songs/${id}`, "inQueue", { albumSpotifyId: albumId });

    const [isLogging, setIsLogging] = useState(false);
    const [justLogged, setJustLogged] = useState(false);
    const [logError, setLogError] = useState<string | null>(null);

    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [reviewBody, setReviewBody] = useState("");
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [reviewSubmitted, setReviewSubmitted] = useState(false);
    const [reviewError, setReviewError] = useState<string | null>(null);

    const [isRecommendOpen, setIsRecommendOpen] = useState(false);
    const [recipientUsername, setRecipientUsername] = useState("");
    const [recommendNote, setRecommendNote] = useState("");
    const [isSendingRecommendation, setIsSendingRecommendation] = useState(false);
    const [recommendSent, setRecommendSent] = useState(false);
    const [recommendError, setRecommendError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const data = await apiFetch<{ score: number | null }>(`/ratings/songs/${id}`);
                setMyRating(data.score);
            } catch {
                // not fatal to the screen — just leave rating unset
            }
        })();
    }, [id]);

    async function handleRate(score: number) {
        setRatingError(null);
        const previous = myRating;
        setMyRating(score);
        try {
            await apiFetch(`/ratings/songs/${id}`, {
                method: "POST",
                body: JSON.stringify({ score, albumSpotifyId: albumId }),
            });
        } catch (err) {
            setMyRating(previous);
            setRatingError(err instanceof ApiError ? err.message : "Something went wrong");
        }
    }

    async function handleLog() {
        setLogError(null);
        setJustLogged(false);
        setIsLogging(true);
        try {
            await apiFetch(`/spins/songs/${id}`, {
                method: "POST",
                body: JSON.stringify({ albumSpotifyId: albumId }),
            });
            setJustLogged(true);
        } catch (err) {
            setLogError(err instanceof ApiError ? err.message : "Something went wrong");
        } finally {
            setIsLogging(false);
        }
    }

    async function handleSubmitReview() {
        if (!reviewBody.trim()) return;
        setReviewError(null);
        setIsSubmittingReview(true);
        try {
            await apiFetch(`/reviews/songs/${id}`, {
                method: "POST",
                body: JSON.stringify({ body: reviewBody, albumSpotifyId: albumId }),
            });
            setReviewSubmitted(true);
            setReviewBody("");
            setIsReviewOpen(false);
        } catch (err) {
            setReviewError(err instanceof ApiError ? err.message : "Something went wrong");
        } finally {
            setIsSubmittingReview(false);
        }
    }

    async function handleSendRecommendation() {
        if (!recipientUsername.trim()) return;
        setRecommendError(null);
        setIsSendingRecommendation(true);
        try {
            await apiFetch(`/recommendations/songs/${id}`, {
                method: "POST",
                body: JSON.stringify({
                    recipientUsername,
                    note: recommendNote || undefined,
                    albumSpotifyId: albumId,
                }),
            });
            setRecommendSent(true);
            setRecipientUsername("");
            setRecommendNote("");
            setIsRecommendOpen(false);
        } catch (err) {
            setRecommendError(err instanceof ApiError ? err.message : "Something went wrong");
        } finally {
            setIsSendingRecommendation(false);
        }
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {imageUrl && <Image source={{ uri: imageUrl }} style={styles.cover} />}
            <Text style={styles.title}>{name}</Text>
            <Text style={styles.artist}>{artistNames}</Text>
            <Pressable onPress={() => router.push(`/album/${albumId}`)}>
                <Text style={styles.albumLink}>from {albumName}</Text>
            </Pressable>

            <StarRating score={myRating} onRate={handleRate} />
            {ratingError && <Text style={styles.error}>{ratingError}</Text>}

            <View style={styles.actionRow}>
                <Pressable onPress={like.toggle} disabled={like.isLoading}>
                    <Text style={[styles.actionIcon, like.isOn && styles.actionIconActive]}>
                        {like.isOn ? "♥" : "♡"}
                    </Text>
                </Pressable>
                <Pressable onPress={listenLater.toggle} disabled={listenLater.isLoading}>
                    <Text style={[styles.actionIcon, listenLater.isOn && styles.actionIconActive]}>
                        🕐
                    </Text>
                </Pressable>
                <Pressable onPress={handleLog} disabled={isLogging}>
                    <Text style={styles.actionLink}>
                        {isLogging ? "Logging..." : justLogged ? "Logged ✓" : "Log listen"}
                    </Text>
                </Pressable>
            </View>
            {(like.error || listenLater.error || logError) && (
                <Text style={styles.error}>{like.error || listenLater.error || logError}</Text>
            )}

            {!isReviewOpen ? (
                <Pressable onPress={() => setIsReviewOpen(true)}>
                    <Text style={styles.actionLink}>
                        {reviewSubmitted ? "Review posted ✓ — write another" : "Write a review"}
                    </Text>
                </Pressable>
            ) : (
                <View style={styles.form}>
                    <TextInput
                        style={styles.textArea}
                        placeholder="Write your review..."
                        placeholderTextColor={colors.textMuted}
                        value={reviewBody}
                        onChangeText={setReviewBody}
                        multiline
                    />
                    {reviewError && <Text style={styles.error}>{reviewError}</Text>}
                    <View style={styles.formButtons}>
                        <Pressable onPress={() => setIsReviewOpen(false)}>
                            <Text style={styles.actionLink}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            style={styles.button}
                            onPress={handleSubmitReview}
                            disabled={isSubmittingReview}
                        >
                            <Text style={styles.buttonText}>
                                {isSubmittingReview ? "Posting..." : "Post"}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            )}

            {!isRecommendOpen ? (
                <Pressable onPress={() => setIsRecommendOpen(true)}>
                    <Text style={styles.actionLink}>
                        {recommendSent ? "Sent ✓ — recommend to someone else" : "Recommend to a friend"}
                    </Text>
                </Pressable>
            ) : (
                <View style={styles.form}>
                    <TextInput
                        style={styles.input}
                        placeholder="Their username"
                        placeholderTextColor={colors.textMuted}
                        value={recipientUsername}
                        onChangeText={setRecipientUsername}
                        autoCapitalize="none"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Add a note (optional)"
                        placeholderTextColor={colors.textMuted}
                        value={recommendNote}
                        onChangeText={setRecommendNote}
                    />
                    {recommendError && <Text style={styles.error}>{recommendError}</Text>}
                    <View style={styles.formButtons}>
                        <Pressable onPress={() => setIsRecommendOpen(false)}>
                            <Text style={styles.actionLink}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            style={styles.button}
                            onPress={handleSendRecommendation}
                            disabled={isSendingRecommendation}
                        >
                            <Text style={styles.buttonText}>
                                {isSendingRecommendation ? "Sending..." : "Send"}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        alignItems: "center",
        padding: 24,
        gap: 10,
    },
    cover: {
        width: 200,
        height: 200,
        borderRadius: 8,
        marginBottom: 12,
    },
    title: {
        color: colors.text,
        fontSize: 20,
        fontWeight: "700",
        textAlign: "center",
    },
    artist: {
        color: colors.textMuted,
        fontSize: 16,
    },
    albumLink: {
        color: colors.accent,
        fontSize: 13,
    },
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 20,
        marginTop: 4,
    },
    actionIcon: {
        fontSize: 26,
        color: colors.textMuted,
    },
    actionIconActive: {
        color: colors.accent,
    },
    actionLink: {
        color: colors.accent,
        marginTop: 4,
    },
    form: {
        width: "100%",
        gap: 8,
        marginTop: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 10,
        backgroundColor: colors.surface,
        color: colors.text,
    },
    textArea: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 10,
        backgroundColor: colors.surface,
        color: colors.text,
        minHeight: 80,
        textAlignVertical: "top",
    },
    formButtons: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 16,
    },
    button: {
        backgroundColor: colors.accent,
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    buttonText: {
        color: colors.text,
        fontWeight: "600",
    },
    error: {
        color: colors.error,
    },
});
