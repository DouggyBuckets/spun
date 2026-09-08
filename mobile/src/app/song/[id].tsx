import { useEffect, useState } from "react";
import { View, Text, Image, TextInput, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, ApiError } from "../../api/client";
import { colors, spacing, radius, cardShadow } from "../../constants/theme";
import { StarRating } from "../../components/StarRating";
import { useToggle } from "../../hooks/useToggle";
import { Touchable } from "../../components/Touchable";

interface RatingResponse {
    score: number | null;
    averageScore: number | null;
    ratingCount: number;
}

interface SongReview {
    id: number;
    body: string;
    score: number | null;
    created_at: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    like_count: number;
    liked_by_me: boolean;
}

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
    const [averageScore, setAverageScore] = useState<number | null>(null);
    const [ratingCount, setRatingCount] = useState(0);
    const [reviews, setReviews] = useState<SongReview[]>([]);
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
                const [ratingData, reviewsData] = await Promise.all([
                    apiFetch<RatingResponse>(`/ratings/songs/${id}`),
                    apiFetch<SongReview[]>(`/reviews/songs/${id}`),
                ]);
                setMyRating(ratingData.score);
                setAverageScore(ratingData.averageScore);
                setRatingCount(ratingData.ratingCount);
                setReviews(reviewsData);
            } catch {
                // not fatal to the screen — just leave rating/reviews unset
            }
        })();
    }, [id]);

    async function refreshReviews() {
        try {
            setReviews(await apiFetch<SongReview[]>(`/reviews/songs/${id}`));
        } catch {
            // non-critical — the new review still posted successfully
        }
    }

    async function handleToggleReviewLike(review: SongReview) {
        const next = !review.liked_by_me;
        setReviews((prev) =>
            prev.map((r) =>
                r.id === review.id
                    ? { ...r, liked_by_me: next, like_count: r.like_count + (next ? 1 : -1) }
                    : r
            )
        );
        try {
            await apiFetch(`/reviews/${review.id}/like`, { method: next ? "POST" : "DELETE" });
        } catch {
            setReviews((prev) =>
                prev.map((r) =>
                    r.id === review.id
                        ? { ...r, liked_by_me: !next, like_count: r.like_count + (next ? -1 : 1) }
                        : r
                )
            );
        }
    }

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
            await refreshReviews();
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
            <Touchable onPress={() => router.push(`/album/${albumId}`)}>
                <Text style={styles.albumLink}>from {albumName}</Text>
            </Touchable>

            <View style={styles.ratingCard}>
                <StarRating score={myRating} onRate={handleRate} />
                {ratingCount > 0 ? (
                    <View style={styles.averageRatingRow}>
                        <Ionicons name="star" size={12} color={colors.rating} />
                        <Text style={styles.averageRating}>
                            {averageScore !== null ? (averageScore / 2).toFixed(1) : "—"}/5 average ·{" "}
                            {ratingCount} {ratingCount === 1 ? "rating" : "ratings"}
                        </Text>
                    </View>
                ) : (
                    <Text style={styles.averageRating}>No ratings yet — be the first</Text>
                )}
            </View>
            {ratingError && <Text style={styles.error}>{ratingError}</Text>}

            <View style={styles.actionRow}>
                <Touchable
                    style={[styles.actionButton, like.isOn && styles.actionButtonLikeActive]}
                    onPress={like.toggle}
                    disabled={like.isLoading}
                >
                    <Ionicons
                        name={like.isOn ? "heart" : "heart-outline"}
                        size={22}
                        color={like.isOn ? colors.like : colors.textMuted}
                    />
                </Touchable>
                <Touchable
                    style={[styles.actionButton, listenLater.isOn && styles.actionButtonActive]}
                    onPress={listenLater.toggle}
                    disabled={listenLater.isLoading}
                >
                    <Ionicons
                        name={listenLater.isOn ? "bookmark" : "bookmark-outline"}
                        size={22}
                        color={listenLater.isOn ? colors.accent : colors.textMuted}
                    />
                </Touchable>
                <Touchable
                    style={[styles.actionButton, justLogged && styles.actionButtonActive]}
                    onPress={handleLog}
                    disabled={isLogging}
                >
                    {isLogging ? (
                        <ActivityIndicator size="small" color={colors.textMuted} />
                    ) : (
                        <Ionicons
                            name={justLogged ? "checkmark-circle" : "add-circle-outline"}
                            size={22}
                            color={justLogged ? colors.accent : colors.textMuted}
                        />
                    )}
                </Touchable>
            </View>
            <View style={styles.actionLabelRow}>
                <Text style={styles.actionLabel}>Like</Text>
                <Text style={styles.actionLabel}>Save</Text>
                <Text style={styles.actionLabel}>Log</Text>
            </View>
            {(like.error || listenLater.error || logError) && (
                <Text style={styles.error}>{like.error || listenLater.error || logError}</Text>
            )}

            {!isReviewOpen ? (
                <Touchable style={styles.listRow} onPress={() => setIsReviewOpen(true)}>
                    <Ionicons name="create-outline" size={18} color={colors.accent} />
                    <Text style={styles.listRowText}>
                        {reviewSubmitted ? "Review posted ✓ — write another" : "Write a review"}
                    </Text>
                </Touchable>
            ) : (
                <View style={styles.formCard}>
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
                        <Touchable onPress={() => setIsReviewOpen(false)}>
                            <Text style={styles.actionLink}>Cancel</Text>
                        </Touchable>
                        <Touchable
                            style={styles.button}
                            onPress={handleSubmitReview}
                            disabled={isSubmittingReview}
                        >
                            <Text style={styles.buttonText}>
                                {isSubmittingReview ? "Posting..." : "Post"}
                            </Text>
                        </Touchable>
                    </View>
                </View>
            )}

            {!isRecommendOpen ? (
                <Touchable style={styles.listRow} onPress={() => setIsRecommendOpen(true)}>
                    <Ionicons name="paper-plane-outline" size={18} color={colors.accent} />
                    <Text style={styles.listRowText}>
                        {recommendSent ? "Sent ✓ — recommend to someone else" : "Recommend to a friend"}
                    </Text>
                </Touchable>
            ) : (
                <View style={styles.formCard}>
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
                        <Touchable onPress={() => setIsRecommendOpen(false)}>
                            <Text style={styles.actionLink}>Cancel</Text>
                        </Touchable>
                        <Touchable
                            style={styles.button}
                            onPress={handleSendRecommendation}
                            disabled={isSendingRecommendation}
                        >
                            <Text style={styles.buttonText}>
                                {isSendingRecommendation ? "Sending..." : "Send"}
                            </Text>
                        </Touchable>
                    </View>
                </View>
            )}

            {reviews.length > 0 && (
                <View style={styles.reviewsSection}>
                    <Text style={styles.sectionTitle}>Reviews</Text>
                    {reviews.map((review) => (
                        <View key={review.id} style={styles.reviewCard}>
                            <View style={styles.reviewHeader}>
                                <Touchable onPress={() => router.push(`/profile/${review.username}`)}>
                                    <Text style={styles.reviewAuthor}>
                                        {review.display_name ?? review.username}
                                    </Text>
                                </Touchable>
                                {review.score !== null && (
                                    <View style={styles.reviewScorePill}>
                                        <Ionicons name="star" size={11} color={colors.rating} />
                                        <Text style={styles.reviewScore}>{review.score / 2}/5</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.reviewBody}>{review.body}</Text>
                            <Touchable
                                style={styles.reviewLikeRow}
                                onPress={() => handleToggleReviewLike(review)}
                            >
                                <Ionicons
                                    name={review.liked_by_me ? "heart" : "heart-outline"}
                                    size={16}
                                    color={review.liked_by_me ? colors.like : colors.textMuted}
                                />
                                {review.like_count > 0 && (
                                    <Text style={styles.reviewLikeCount}>{review.like_count}</Text>
                                )}
                            </Touchable>
                        </View>
                    ))}
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
        padding: spacing.lg,
        gap: spacing.sm,
    },
    cover: {
        width: 220,
        height: 220,
        borderRadius: radius.md,
        marginBottom: spacing.sm,
        ...cardShadow,
    },
    title: {
        color: colors.text,
        fontSize: 22,
        fontWeight: "800",
        textAlign: "center",
        letterSpacing: 0.2,
    },
    artist: {
        color: colors.textMuted,
        fontSize: 16,
        fontWeight: "500",
    },
    albumLink: {
        color: colors.accent,
        fontSize: 13,
        fontWeight: "600",
    },
    ratingCard: {
        width: "100%",
        alignItems: "center",
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        gap: spacing.xs,
        marginTop: spacing.sm,
    },
    averageRatingRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    averageRating: {
        color: colors.textMuted,
        fontSize: 13,
    },
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.md,
        marginTop: spacing.sm,
    },
    actionButton: {
        width: 48,
        height: 48,
        borderRadius: radius.pill,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: "center",
        alignItems: "center",
    },
    actionButtonActive: {
        backgroundColor: colors.accentMuted,
    },
    actionButtonLikeActive: {
        backgroundColor: colors.likeMuted,
    },
    actionLabelRow: {
        flexDirection: "row",
        justifyContent: "center",
        gap: spacing.md,
    },
    actionLabel: {
        width: 48,
        color: colors.textMuted,
        fontSize: 11,
        textAlign: "center",
    },
    actionLink: {
        color: colors.accent,
        marginTop: spacing.xs,
        fontWeight: "600",
    },
    listRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        width: "100%",
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    listRowText: {
        color: colors.text,
        fontWeight: "600",
    },
    formCard: {
        width: "100%",
        gap: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.sm,
        padding: 10,
        backgroundColor: colors.surfaceRaised,
        color: colors.text,
    },
    textArea: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.sm,
        padding: 10,
        backgroundColor: colors.surfaceRaised,
        color: colors.text,
        minHeight: 80,
        textAlignVertical: "top",
    },
    formButtons: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: spacing.md,
    },
    button: {
        backgroundColor: colors.accent,
        borderRadius: radius.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    buttonText: {
        color: colors.text,
        fontWeight: "600",
    },
    sectionTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: "700",
        alignSelf: "flex-start",
        marginTop: spacing.xs,
    },
    reviewsSection: {
        width: "100%",
        gap: spacing.sm,
    },
    reviewCard: {
        width: "100%",
        gap: spacing.xs,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        ...cardShadow,
        shadowOpacity: 0.15,
    },
    reviewHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    reviewAuthor: {
        color: colors.accent,
        fontWeight: "600",
    },
    reviewScorePill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: colors.ratingMuted,
        borderRadius: radius.pill,
        paddingVertical: 2,
        paddingHorizontal: 8,
    },
    reviewScore: {
        color: colors.text,
        fontSize: 12,
        fontWeight: "600",
    },
    reviewBody: {
        color: colors.text,
        fontSize: 14,
        textAlign: "left",
    },
    reviewLikeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        alignSelf: "flex-start",
    },
    reviewLikeCount: {
        color: colors.textMuted,
        fontSize: 12,
    },
    error: {
        color: colors.error,
    },
});
