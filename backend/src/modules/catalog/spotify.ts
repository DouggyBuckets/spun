import { config } from "../../config";

interface CachedToken {
    token: string;
    expiresAt: number; //timestamp (ms) when this token stops being valid
}

interface SpotifyTokenResponse {
    access_token: string;
    expires_in: number; //seconds until token expires
}

let cachedToken: CachedToken | null = null;

export async function getSpotifyToken(): Promise<string> {
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
        return cachedToken.token
    }

    const credentials = Buffer.from(`${config.spotifyClientId}:${config.spotifyClientSecret}`).toString("base64");
    const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Basic ${credentials}`
        },
        body: "grant_type=client_credentials"
    });

    const data = await response.json() as SpotifyTokenResponse;
    cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000) //expires_in converted to millliseconds from seconds
    }

    return cachedToken.token;
}

interface SpotifyAlbumResponse {
    albums: { items: {name: string, images: {url: string}[]}[] } //only the fields we care about
}

export async function searchAlbums(query: string) {
    const token = await getSpotifyToken();
    const params = new URLSearchParams({q: query, type: "album", limit: "10"});
    const response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });
    return await response.json() as SpotifyAlbumResponse;
}