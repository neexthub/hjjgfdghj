import { z } from "zod";

export const safeExternalUrl = z.string().url().max(2000).refine((value) => {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password
    && host !== "localhost" && !host.endsWith(".local") && !host.endsWith(".internal")
    && !host.startsWith("[") && !/^\d+(?:\.\d+){3}$/.test(host);
}, "Use a public HTTP(S) URL without credentials");