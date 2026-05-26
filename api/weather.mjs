const WEATHER_API_URL = "https://api.weatherapi.com/v1/forecast.json";

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": status === 200 ? "s-maxage=300, stale-while-revalidate=600" : "no-store",
      ...extraHeaders
    }
  });
}

function validateCity(value) {
  const city = String(value || "").trim();
  if (!city || city.length > 80) return "";
  if (!/^[\p{L}\p{N}\s,.'-]+$/u.test(city)) return "";
  return city;
}

export async function GET(request) {
  const apiKey = process.env.WEATHERAPI_KEY;
  if (!apiKey) {
    return json({ error: "Server is missing WEATHERAPI_KEY." }, 500);
  }

  const url = new URL(request.url);
  const city = validateCity(url.searchParams.get("q"));
  if (!city) {
    return json({ error: "A valid city query is required." }, 400);
  }

  const params = new URLSearchParams({
    key: apiKey,
    q: city,
    days: "7",
    aqi: "no",
    alerts: "no"
  });

  try {
    const response = await fetch(`${WEATHER_API_URL}?${params.toString()}`, {
      headers: { accept: "application/json" }
    });
    const data = await response.json();

    if (!response.ok) {
      return json({ error: data.error?.message || "Weather request failed." }, response.status);
    }

    return json(data);
  } catch {
    return json({ error: "Unable to reach weather provider." }, 502);
  }
}
