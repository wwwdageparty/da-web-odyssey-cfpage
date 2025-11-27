export async function onRequestPost(context) {
  const { request, env } = context;
  const { DB, DA_DATAAPI_URL, DA_DATAAPI_TOKEN, DA_WRITE_TOKEN, DA_DATAAPI_SERVICE_NAME } = env;

  // ------------------------------------
  // AUTH CHECK
  // ------------------------------------
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (token !== DA_WRITE_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }

  // ------------------------------------
  // GET MESSAGE BODY
  // ------------------------------------
  const text = await request.text();
  const message = text.trim();

  if (!message) {
    return new Response("Message cannot be empty", { status: 400 });
  }

  try {
    const useRemote = 
      typeof DA_DATAAPI_URL === "string" && DA_DATAAPI_URL.trim() !== "" &&
      typeof DA_DATAAPI_TOKEN === "string" && DA_DATAAPI_TOKEN.trim() !== "" &&
      typeof DA_DATAAPI_SERVICE_NAME === "string" && DA_DATAAPI_SERVICE_NAME.trim() !== "";

    // ------------------------------------
    // REMOTE MODE
    // ------------------------------------
    if (useRemote) {
      const payload = {
        type: "request",
        request_id: crypto.randomUUID(),
        service: DA_DATAAPI_SERVICE_NAME,
        action: "post",
        payload: {
          t1: message
        }
      };

      const resp = await fetch(DA_DATAAPI_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${DA_DATAAPI_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await resp.json();

      if (data.type !== "ack") {
        return new Response("Remote gateway returned NACK", { status: 500 });
      }

      return new Response("✅ Remote log written successfully.", {
        status: 200
      });
    }


    // ------------------------------------
    // LOCAL D1 MODE
    // ------------------------------------
    if (DB) {
      await DB.prepare(
        "INSERT INTO daodyssey (t1) VALUES (?)"
      ).bind(message).run();

      return new Response("✅ Local log written successfully.", {
        status: 200
      });
    }

    // ------------------------------------
    // NEITHER REMOTE NOR LOCAL
    // ------------------------------------
    return new Response("❌ No backend (API or DB) configured.", {
      status: 500
    });

  } catch (err) {
    return new Response(`❌ Error: ${err.message}`, {
      status: 500
    });
  }
}
