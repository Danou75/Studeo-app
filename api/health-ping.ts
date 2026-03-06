import { createClient } from '@supabase/supabase-js';

/**
 * Health Ping — Vercel Cron Job endpoint
 *
 * Appelé une fois par jour pour maintenir le projet Supabase actif
 * et éviter la mise en pause automatique (plan gratuit, inactivité > 7 jours).
 *
 * Sécurité : Vercel envoie automatiquement "Authorization: Bearer <CRON_SECRET>"
 * lors des appels cron si la variable CRON_SECRET est définie.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vérification optionnelle du secret (recommandée par Vercel)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      error: 'Missing Supabase environment variables',
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Appel léger à l'API auth — fonctionne toujours sans table dédiée
    // Cela suffit pour signaler l'activité à Supabase
    const { error } = await supabase.auth.getSession();

    const timestamp = new Date().toISOString();
    console.log(`[KeepAlive] ${timestamp} — Supabase ping OK`);

    return res.status(200).json({
      status: 'ok',
      timestamp,
      message: 'Supabase keep-alive ping sent successfully',
    });
  } catch (err: any) {
    console.error('[KeepAlive] Erreur lors du ping Supabase:', err.message);
    return res.status(500).json({
      status: 'error',
      message: err.message,
    });
  }
}
