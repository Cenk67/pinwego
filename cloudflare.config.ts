import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  accountId: "cd4d86ef6b265aba4aaf7fdd6946874c",
  worker: defineWorker({
    name: "pinwego",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-09",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none" },
    workersDev: false,
    domains: ["pinwego.com", "www.pinwego.com"],
    env: {
      ASSETS: bindings.assets(),
      VINEXT_KV_CACHE: bindings.kv({ id: "3828054babf4482e869f08265407ba98" }),
    },
  }),
});
