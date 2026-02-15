import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { crop_id } = await req.json();

    // Fetch crop details and historical data
    const [cropResult, moistureResult, fertilityResult, healthResult, weatherResult] = await Promise.all([
      supabase.from("crops").select("*").eq("id", crop_id).eq("user_id", user.id).single(),
      supabase.from("moisture_readings").select("*").eq("user_id", user.id).eq("crop_id", crop_id).order("created_at", { ascending: false }).limit(30),
      supabase.from("fertility_readings").select("*").eq("user_id", user.id).eq("crop_id", crop_id).order("created_at", { ascending: false }).limit(10),
      supabase.from("health_scores").select("*").eq("user_id", user.id).eq("crop_id", crop_id).order("created_at", { ascending: false }).limit(10),
      supabase.from("weather_data").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    ]);

    const crop = cropResult.data;
    if (!crop) {
      return new Response(JSON.stringify({ error: "Crop not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const moistureData = moistureResult.data || [];
    const fertilityData = fertilityResult.data || [];
    const healthData = healthResult.data || [];
    const weatherData = weatherResult.data || [];

    const avgMoisture = moistureData.length > 0
      ? moistureData.reduce((s, r) => s + Number(r.moisture_level), 0) / moistureData.length : 0;
    const avgFertility = fertilityData.length > 0
      ? fertilityData.reduce((s, r) => s + Number(r.overall_fertility || 0), 0) / fertilityData.length : 0;
    const avgHealth = healthData.length > 0
      ? healthData.reduce((s, r) => s + Number(r.overall_score), 0) / healthData.length : 0;

    const dataContext = `
CROP: ${crop.name} (${crop.crop_type})
Planted: ${crop.planting_date || "Unknown"}
Expected Harvest: ${crop.expected_harvest_date || "Unknown"}
Location: ${crop.location || "Unknown"}

SOIL DATA (30-day averages):
- Average Moisture: ${avgMoisture.toFixed(1)}%
- Average Fertility: ${avgFertility.toFixed(1)}%
- Average Health Score: ${avgHealth.toFixed(1)}/100
- Total Moisture Readings: ${moistureData.length}
- Total Fertility Readings: ${fertilityData.length}

LATEST WEATHER:
${weatherData.length > 0 ? `Temperature: ${weatherData[0].temperature}°C, Humidity: ${weatherData[0].humidity}%, Condition: ${weatherData[0].weather_condition}` : "No weather data"}

NPK LEVELS: ${fertilityData[0] ? `N=${fertilityData[0].nitrogen_level}% P=${fertilityData[0].phosphorus_level}% K=${fertilityData[0].potassium_level}%` : "No data"}
`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an agricultural yield prediction expert. Analyze the crop data and provide a yield forecast.

Return a JSON object:
{
  "estimated_yield": "e.g., 'Above Average' or '2.5 tons/hectare' or 'Good harvest expected'",
  "confidence": "High/Medium/Low",
  "factors": [
    { "name": "Soil Moisture", "impact": "Brief impact description", "status": "Good/Warning/Critical" },
    { "name": "Soil Fertility", "impact": "Brief impact description", "status": "Good/Warning/Critical" }
  ],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "timeline": "Expected harvest timeline info"
}

Be practical and specific to the crop type.`
          },
          { role: "user", content: `Predict yield for this crop:\n\n${dataContext}` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI prediction failed");
    }

    const data = await response.json();
    const aiContent = data.choices[0].message.content;

    let prediction;
    try {
      const jsonMatch = aiContent.match(/```json\n([\s\S]*?)\n```/) || aiContent.match(/\{[\s\S]*\}/);
      prediction = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiContent);
    } catch {
      prediction = {
        estimated_yield: "Insufficient Data",
        confidence: "Low",
        factors: [{ name: "Data Availability", impact: "More readings needed", status: "Warning" }],
        recommendations: ["Add more moisture and fertility readings for better predictions"],
        timeline: "Continue monitoring for accurate forecasts",
      };
    }

    return new Response(JSON.stringify({ prediction }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Yield prediction error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
