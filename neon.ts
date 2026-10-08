import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Library files (staff uploads and client deliverables). Private: every read goes through a signed link.
  buckets: { library: { access: "private" } },
});
