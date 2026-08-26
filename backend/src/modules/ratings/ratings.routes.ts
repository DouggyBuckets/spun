import { Router } from "express";
import { z } from "zod";
import { db } from "../../db";
import { requireAuth } from "../../middleware/auth";
import { getOrCreateAlbum, getOrCreateSongByTrackId } from "../catalog/catalogImport";

const router = Router();

const rateSchema = z.object({
    score: z.number().int().min(1).max(10),
});

router.post("/albums/:spotifyId", requireAuth, async (req, res) => {
    const { score } = rateSchema.parse(req.body);
    const albumId = await getOrCreateAlbum(req.params.spotifyId as string);

    const result = await db.query(
        `INSERT INTO ratings (user_id, entity_type, entity_id, score)
        VALUES ($1, 'album', $2, $3)
        ON CONFLICT (user_id, entity_type, entity_id)
        DO UPDATE SET score = $3, updated_at = now()
        RETURNING id, score`,
        [req.user!.id, albumId, score]
    );
    res.json(result.rows[0]);
});

const rateSongSchema = z.object({
    score: z.number().int().min(1).max(10),
    albumSpotifyId: z.string(),
});

router.post("/songs/:spotifyId", requireAuth, async (req, res) => {
    const { score, albumSpotifyId } = rateSongSchema.parse(req.body);
    const songId = await getOrCreateSongByTrackId(req.params.spotifyId as string, albumSpotifyId);

    const result = await db.query(
        `INSERT INTO ratings (user_id, entity_type, entity_id, score)
        VALUES ($1, 'song', $2, $3)
        ON CONFLICT (user_id, entity_type, entity_id)
        DO UPDATE SET score = $3, updated_at = now()
        RETURNING id, score`,
        [req.user!.id, songId, score]
    );
    res.json(result.rows[0]);
});

export default router;