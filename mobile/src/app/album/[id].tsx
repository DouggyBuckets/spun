import { useEffect, useState } from "react";
import {
    View,
    Text,
    Image,
    FlatList,
    TextInput,
    StyleSheet,
    ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, ApiError } from "../../api/client";
import { colors, spacing, radius, cardShadow } from "../../constants/theme";
import { StarRating } from "../../components/StarRating";
import { useToggle } from "../../hooks/useToggle";
import { Touchable } from "../../components/Touchable";

interface Track {
    id: string;
    name: string;
    track_number: number;
    duration_ms: number;
    artists: { id: string; name: string }[];
}

interface AlbumDetails {
    id: string;
    name: string;
    artists: { id: string; name: string }[];
    images: { url: string }[];
    release_date: string;
    album_type: string;
    tracks: { items: Track[] };
}

interface RatingResponse {
    score: number | null;
    averageScore: number | null;
    ratingCount: number;
}

interface TrackRating {
    spotifyId: string;
    averageScore: number;
    ratingCount: number;
}

interface AlbumReview {
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

function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function AlbumDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [album, setAlbum] = useState<AlbumDetails | null>(null);
    const [myRating, setMyRating] = useState<number | null>(null);
    const [averageScore, setAverageScore] = useState<number | null>(null);
    const [ratingCount, setRatingCount] = useState(0);
    const [reviews, setReviews] = useState<AlbumReview[]>([]);
    const [trackRatings, setTrackRatings] = useState<Record<string, TrackRating>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ratingError, setRatingError] = useState<string | null>(null);

    const like = useToggle(`/likes/albums/${id}`, "liked");
    const listenLater = useToggle(`/listen-later/albums/${id}`, "inQueue");

    // "log this listen" (a Spin) — not a toggle, just an action that adds a new entry each time
    const [isLogging, setIsLogging] = useState(false);
    const [justLogged, setJustLogged] = useState(false);
    const [logError, setLogError] = useState<string | null>(null);

    // review
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [reviewBody, setReviewBody] = useState("");
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [reviewSubmitted, setReviewSubmitted] = useState(false);
    const [reviewError, setReviewError] = useState<string | null>(null);

    // recommend
    const [isRecommendOpen, setIsRecommendOpen] = useState(false);
    const [recipientUsername, setRecipientUsername] = useState("");
    const [recommendNote, setRecommendNote] = useState("");
    const [isSendingRecommendation, setIsSendingRecommendation] = useState(false);
    const [recommendSent, setRecommendSent] = useState(false);
    const [recommendError, setRecommendError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const [albumData, ratingData, reviewsData, trackRatingsData] = await Promise.all([
                    apiFetch<AlbumDetails>(`/catalog/albums/${id}`),
                    apiFetch<RatingResponse>(`/ratings/albums/${id}`),
                    apiFetch<AlbumReview[]>(`/reviews/albums/${id}`),
                    apiFetch<TrackRating[]>(`/ratings/albums/${id}/tracks`),
                ]);
                setAlbum(albumData);
                setMyRating(ratingData.score);
                setAverageScore(ratingData.averageScore);
                setRatingCount(ratingData.ratingCount);
                setReviews(reviewsData);
                setTrackRatings(
                    Object.fromEntries(trackRatingsData.map((t) => [t.spotifyId, t]))
                );
            } catch (err) {
                setError(err instanceof ApiError ? err.message : "Something went wrong");
            } finally {
                setIsLoading(false);
            }
        })();
    }, [id]);

    async function refreshReviews() {
        try {
            setReviews(await apiFetch<AlbumReview[]>(`/reviews/albums/${id}`));
        } catch {
            // non-critical — the new review still posted successfully
        }
    }

    async function handleToggleReviewLike(review: AlbumReview) {
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
        const previousRating = myRating;
        setMyRating(score);
        try {
            await apiFetch(`/ratings/albums/${id}`, {
                method: "POST",
                body: JSON.stringify({ score }),
            });
        } catch (err) {
            setMyRating(previousRating);
            setRatingError(err instanceof ApiError ? err.message : "Something went wrong");
        }
    }

    async function handleLog() {
        setLogError(null);
        setJustLogged(false);
        setIsLogging(true);
        try {
            await apiFetch(`/spins/albums/${id}`, {
                method: "POST",
                body: JSON.stringify({}),
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
            await apiFetch(`/reviews/albums/${id}`, {
                method: "POST",
                body: JSON.stringify({ body: reviewBody }),
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
            await apiFetch(`/recommendations/albums/${id}`, {
                method: "POST",
                body: JSON.stringify({
                    recipientUsername,
                    note: recommendNote || undefined,
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

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={colors.accent} />
            </View>
        );
    }

    if (error || !album) {
        return (
            <View style={styles.centered}>
                <Text style={styles.error}>{error ?? "Album not found"}</Text>
            </View>
        );
    }

    return (
        <FlatList
            style={styles.container}
            data={album.tracks.items}
            keyExtractor={(track) => track.id}
            ListHeaderComponent={
                <View style={styles.header}>
                    {album.images[0] && (
                        <Image source={{ uri: album.images[0].url }} style={styles.cover} />
                    )}
                    <Text style={styles.title}>{album.name}</Text>
                    <Text style={styles.artist}>
                        {album.artists.map((a) => a.name).join(", ")}
                    </Text>
                    <Text style={styles.meta}>
                        {album.release_date.slice(0, 4)} · {album.tracks.items.length} tracks
                    </Text>

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
                        <Touchable
                            style={styles.actionButton}
                            onPress={() =>
                                router.push({ pathname: "/lists/add-to", params: { albumId: id } })
                            }
                        >
                            <Ionicons name="list-outline" size={22} color={colors.textMuted} />
                        </Touchable>
                    </View>
                    <View style={styles.actionLabelRow}>
                        <Text style={styles.actionLabel}>Like</Text>
                        <Text style={styles.actionLabel}>Save</Text>
                        <Text style={styles.actionLabel}>Log</Text>
                        <Text style={styles.actionLabel}>Add to list</Text>
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
                </View>
            }
            renderItem={({ item }) => (
                <Touchable
                    style={styles.trackRow}
                    onPress={() =>
                        router.push({
                            pathname: "/song/[id]",
                            params: {
                                id: item.id,
                                albumId: album.id,
                                name: item.name,
                                artistNames: item.artists.map((a) => a.name).join(", "),
                                albumName: album.name,
                                imageUrl: album.images[0]?.url,
                            },
                        })
                    }
                >
                    <Text style={styles.trackNumber}>{item.track_number}</Text>
                    <View style={styles.trackText}>
                        <Text style={styles.trackName}>{item.name}</Text>
                        {item.artists.length > 1 && (
                            <Text style={styles.trackArtist}>
                                {item.artists.map((a) => a.name).join(", ")}
                            </Text>
                        )}
                    </View>
                    {trackRatings[item.id] && (
                        <View style={styles.trackRatingPill}>
                            <Ionicons name="star" size={10} color={colors.rating} />
                            <Text style={styles.trackRatingText}>
                                {(trackRatings[item.id]!.averageScore / 2).toFixed(1)}
                            </Text>
                        </View>
                    )}
                    <Text style={styles.trackDuration}>{formatDuration(item.duration_ms)}</Text>
                </Touchable>
            )}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.background,
    },
    header: {
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
        fontSize: 24,
        fontWeight: "800",
        textAlign: "center",
        letterSpacing: 0.2,
    },
    artist: {
        color: colors.textMuted,
        fontSize: 16,
        fontWeight: "500",
    },
    meta: {
        color: colors.textMuted,
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 0.5,
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
    trackRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    trackNumber: {
        color: colors.textMuted,
        width: 24,
        textAlign: "right",
    },
    trackText: {
        flex: 1,
    },
    trackName: {
        color: colors.text,
        fontWeight: "500",
    },
    trackArtist: {
        color: colors.textMuted,
        fontSize: 12,
    },
    trackDuration: {
        color: colors.textMuted,
    },
    trackRatingPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
    },
    trackRatingText: {
        color: colors.textMuted,
        fontSize: 12,
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
