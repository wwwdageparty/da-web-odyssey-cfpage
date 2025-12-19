export async function onRequest(context) {
  const { DB, DA_DATAAPI_URL, DA_DATAAPI_TOKEN, DA_DATAAPI_SERVICE_NAME } = context.env;
  const url = new URL(context.request.url);
  const idParam = url.searchParams.get("id");
  const tableName = "daodyssey";

  try {
    const useRemote = 
      typeof DA_DATAAPI_URL === "string" && DA_DATAAPI_URL.trim() !== "" &&
      typeof DA_DATAAPI_TOKEN === "string" && DA_DATAAPI_TOKEN.trim() !== "" &&
      typeof DA_DATAAPI_SERVICE_NAME === "string" && DA_DATAAPI_SERVICE_NAME.trim() !== "";

    // -------------------------------
    // REMOTE MODE
    // -------------------------------
    if (useRemote) {
      const req = {
        type: "request",
        request_id: crypto.randomUUID(),
        service: DA_DATAAPI_SERVICE_NAME,
        action: "get",
        payload: {
          order: "desc",
          orderby: "id",
          ...(idParam && /^\d+$/.test(idParam)
            ? { offset: Number(idParam) }
            : {}),
          limit: 10
        }
      };

      const resp = await fetch(DA_DATAAPI_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${DA_DATAAPI_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req)
      });

      const data = await resp.json();

      if (data.type !== "ack") {
        return new Response(JSON.stringify({
          status: "error",
          message: "Remote gateway returned NACK"
        }), { status: 500 });
      }

      // rows returned from remote
      return new Response(JSON.stringify({
        status: "ok",
        mode: "remote",
        data: data.payload.rows || []
      }), { headers: { "Content-Type": "application/json" }});
    }

    // -------------------------------
    // LOCAL D1 MODE
    // -------------------------------
    if (DB) {
      let stmt;

      if (idParam && /^\d+$/.test(idParam)) {
        stmt = DB.prepare(
          `SELECT id, t1, v1
           FROM ${tableName}
           WHERE id < ?
           ORDER BY id DESC
           LIMIT 10`
        ).bind(Number(idParam));
      } else {
        stmt = DB.prepare(
          `SELECT id, t1, v1
           FROM ${tableName}
           ORDER BY id DESC
           LIMIT 10`
        );
      }

      const { results } = await stmt.all();

      return new Response(JSON.stringify({
        status: "ok",
        mode: "local",
        data: results || []
      }), { headers: { "Content-Type": "application/json" }});
    }

    // -------------------------------
    // NO REMOTE + NO LOCAL
    // -------------------------------
    return new Response(JSON.stringify({
      status: "error",
      message: "No data backend configured (no DA_DATAAPI_URL/DA_DATAAPI_TOKEN and no DB)"
    }), { status: 500 });

  } catch (err) {
    return new Response(JSON.stringify({
      status: "error",
      message: err.message
    }), { status: 500 });
  }
}
