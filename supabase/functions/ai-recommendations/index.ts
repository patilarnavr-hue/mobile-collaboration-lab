import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Generating AI recommendations for user:", user.id);

    // Fetch user's latest data
    const [moistureResult, fertilityResult, scheduleResult] = await Promise.all([
      supabase
        .from("moisture_readings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("fertility_readings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("watering_schedules")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_enabled", true),
    ]);

    const moistureReadings = moistureResult.data || [];
    const fertilityReadings = fertilityResult.data || [];
    const schedules = scheduleResult.data || [];

    // Calculate averages and trends
    const avgMoisture = moistureReadings.length > 0
      ? moistureReadings.reduce((sum, r) => sum + Number(r.moisture_level), 0) / moistureReadings.length
      : 0;
    
    const avgFertility = fertilityReadings.length > 0
      ? fertilityReadings.reduce((sum, r) => sum + Number(r.overall_fertility || 0), 0) / fertilityReadings.length
      : 0;

    const latestMoisture = moistureReadings[0]?.moisture_level || 0;
    const latestFertility = fertilityReadings[0]?.overall_fertility || 0;

    // Build context for AI
    const dataContext = `
USER'S CURRENT FARM DATA:

Latest Readings:
- Soil Moisture: ${latestMoisture}% (Status: ${latestMoisture < 30 ? "Critical - Dry" : latestMoisture < 60 ? "Optimal" : "Overwatered"})
- Soil Fertility: ${latestFertility}%
${fertilityReadings[0] ? `- NPK Levels: N=${fertilityReadings[0].nitrogen_level}% P=${fertilityReadings[0].phosphorus_level}% K=${fertilityReadings[0].potassium_level}%` : ""}

7-Day Averages:
- Average Moisture: ${avgMoisture.toFixed(1)}%
- Average Fertility: ${avgFertility.toFixed(1)}%

Active Watering Schedules: ${schedules.length}
${schedules.map(s => `- ${s.title}: ${s.time_of_day} on ${s.days_of_week.join(", ")}`).join("\n")}

Historical Trend:
${moistureReadings.length > 1 ? `- Moisture ${moistureReadings[0].moisture_level > moistureReadings[moistureReadings.length - 1].moisture_level ? "increasing" : "decreasing"} over time` : "- Insufficient data for trend analysis"}
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
            content: `You are an expert agricultural advisor analyzing farm data. Provide 3-5 specific, actionable recommendations based on the user's current readings and trends.

Format your response as a JSON array of recommendation objects with this structure:
[
  {
    "priority": "high" | "medium" | "low",
    "category": "watering" | "fertilization" | "monitoring" | "maintenance",
    "title": "Brief recommendation title",
    "description": "Detailed explanation and action steps",
    "impact": "Expected positive outcome"
  }
]

Focus on:
1. Immediate actions for critical issues
2. Preventive measures for optimal growth
3. Long-term improvements for sustainability

Be specific with timings, quantities, and methods.`
          },
          {
            role: "user",
            content: `Analyze this farm data and provide recommendations:\n\n${dataContext}`
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status, await response.text());
      return new Response(JSON.stringify({ error: "Failed to generate recommendations" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Parse AI response
    let recommendations;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || aiResponse.match(/\[([\s\S]*?)\]/);
      recommendations = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : aiResponse);
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      recommendations = [{
        priority: "medium",
        category: "monitoring",
        title: "Keep monitoring your crops",
        description: "Continue tracking moisture and fertility levels regularly to maintain optimal growing conditions.",
        impact: "Consistent monitoring helps prevent issues before they become serious."
      }];
    }

    return new Response(JSON.stringify({ recommendations, dataContext }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Recommendations error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
