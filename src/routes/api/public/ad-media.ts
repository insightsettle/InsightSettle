import { createFileRoute } from "@tanstack/react-router";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/**
 * TEMPORARY (marketing ad, 31 Oct 2026): generates one still image for the Insight ad with Lovable AI
 * and stores it in the `ad-media` bucket. Called only from the database with the cron secret.
 * Body: { name }. The job (prompt, reference images) is read from `ad_media_jobs`. Remove after the ad is made.
 */
export const Route = createFileRoute("/api/public/ad-media")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;
        let name = "";
        try {
          name = String(((await request.json()) as { name?: string }).name ?? "").slice(0, 60);
          const { data: job } = await db.from("ad_media_jobs").select("*").eq("name", name).maybeSingle();
          if (!job) return Response.json({ error: "no job" }, { status: 404 });
          await db.from("ad_media_jobs").update({ status: "running", error: null, updated_at: new Date().toISOString() }).eq("id", job.id);

          const content: any[] = [{ type: "text", text: job.prompt }];
          for (const ref of (job.ref_names ?? []) as string[]) {
            const { data: r } = await db.from("ad_media_jobs").select("path").eq("name", ref).maybeSingle();
            if (!r?.path) continue;
            const { data: blob } = await db.storage.from("ad-media").download(r.path);
            if (!blob) continue;
            const b64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
            content.push({ type: "image_url", image_url: { url: `data:image/png;base64,${b64}` } });
          }
          const key = process.env["LOVABLE_API_KEY"];
          if (!key) throw new Error("LOVABLE_API_KEY missing");
          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Lovable-API-Key": key, "Content-Type": "application/json" },
            body: JSON.stringify({ model: job.model, messages: [{ role: "user", content }], modalities: ["image", "text"] }),
          });
          const text = await res.text();
          if (!res.ok) throw new Error(`gateway ${res.status}: ${text.slice(0, 400)}`);
          const json = JSON.parse(text);
          const url: string | undefined = json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (!url?.startsWith("data:")) throw new Error(`no image: ${text.slice(0, 300)}`);
          const [meta, data] = url.split(",");
          const mime = /data:([^;]+)/.exec(meta ?? "")?.[1] ?? "image/png";
          const ext = mime.includes("jpeg") ? "jpg" : mime.includes("webp") ? "webp" : "png";
          const path = `${crypto.randomUUID()}-${name}.${ext}`;
          const { error: upErr } = await db.storage.from("ad-media").upload(path, Buffer.from(data ?? "", "base64"), { contentType: mime, upsert: true });
          if (upErr) throw upErr;
          await db.from("ad_media_jobs").update({ status: "done", path, updated_at: new Date().toISOString() }).eq("id", job.id);
          return Response.json({ ok: true, path });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          if (name) await db.from("ad_media_jobs").update({ status: "failed", error: message.slice(0, 1000), updated_at: new Date().toISOString() }).eq("name", name);
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
