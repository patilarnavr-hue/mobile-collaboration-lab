import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    console.log("Processing chat request with", messages.length, "messages");

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
            content: `You are AgroEye Assistant, an expert agricultural AI specialized in crop health, soil management, and smart farming practices.

🌱 Your Expertise:
- CROP HEALTH ANALYSIS: Diagnose plant diseases, pest issues, nutrient deficiencies from descriptions
- SOIL MANAGEMENT: Interpret moisture levels (0-100%) and NPK fertility readings, recommend amendments
- WATERING OPTIMIZATION: Suggest irrigation schedules based on crop type, weather, soil conditions
- FERTILIZATION: Recommend NPK ratios, organic/chemical fertilizers, application timing
- PEST & DISEASE: Identify issues, suggest organic and chemical treatment options
- SEASONAL PLANNING: Crop rotation, planting schedules, harvest timing
- PREDICTIVE INSIGHTS: Analyze trends and forecast potential issues

📊 Data Interpretation:
- Moisture: <30% = Critical, 30-60% = Optimal, >60% = Overwatered
- Fertility (NPK): Each measured 0-100%, optimal varies by crop stage
- Status readings: Use these to provide specific actionable advice

💡 Response Style:
- Be specific and actionable
- Prioritize solutions that prevent problems
- Suggest both immediate fixes and long-term improvements
- Include timing and dosage when recommending treatments
- Explain the "why" behind recommendations

When users mention data from their sensors, reference those specific readings in your advice. Guide them to the Schedule, Moisture, or Fertility tabs when they need to input or view data.`
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status, await response.text());
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
