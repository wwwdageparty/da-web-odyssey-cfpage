export async function onRequestGet({ env }) {
  const C_SERVICE = "da-web-odyssey-cfpage";
  const C_VERSION = "0.0.1";
  const DEFAULT_INSTANCE = "default";

  const instance =
    env.INSTANCEID && env.INSTANCEID.trim() !== ""
      ? env.INSTANCEID.trim()
      : DEFAULT_INSTANCE;

  return new Response(JSON.stringify({
    service: C_SERVICE,
    version: C_VERSION,
    instance
  }, null, 2), {
    headers: { "Content-Type": "application/json" }
  });
}
