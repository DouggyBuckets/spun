export const colors = {
    background: "#121212",
    surface: "#1E1E1E",
    surfaceRaised: "#262626",
    accent: "#8B5CF6",
    accentMuted: "#8B5CF633",
    // Semantic colors so ratings/likes/actions don't all reuse the same purple —
    // gold for ratings/stars and rose for likes are near-universal conventions.
    rating: "#F5A623",
    ratingMuted: "#F5A62333",
    like: "#EF476F",
    likeMuted: "#EF476F33",
    text: "#FFFFFF",
    textMuted: "#A0A0A0",
    border: "#333333",
    error: "#FF6B6B",
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
};

export const radius = {
    sm: 6,
    md: 10,
    lg: 16,
    pill: 999,
};

// A single reusable card-elevation style — spread onto a View's style array.
// (iOS reads the shadow* props, Android reads elevation; both are needed.)
export const cardShadow = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
};
