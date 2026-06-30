import httpx
import json
import logging
from app.config import settings

logger = logging.getLogger("aegis_x")

class AICopilotService:
    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"
        self.model = "google/gemini-2.5-flash"  # Default openrouter model

    async def get_response(self, prompt: str, system_context: str = "") -> str:
        if not self.api_key:
            return self._fallback_response(prompt)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://github.com/aegis-x/aegis-x",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_context or "You are AEGIS X AI Emergency Copilot, an expert Geospatial Intelligence Assistant. Provide direct, highly professional, operational emergency advice, evacuation routes, and resource allocation ideas. Keep responses concise, structured, and action-oriented."},
                {"role": "user", "content": prompt}
            ]
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(self.api_url, headers=headers, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    logger.error(f"OpenRouter API error: {response.text}")
                    return self._fallback_response(prompt)
        except Exception as e:
            logger.error(f"Failed to reach OpenRouter: {str(e)}")
            return self._fallback_response(prompt)

    def _fallback_response(self, prompt: str) -> str:
        prompt_lower = prompt.lower()
        
        # Heuristics based on incident types
        if "fire" in prompt_lower:
            return (
                "### 🚨 AEGIS X AI Operational Alert: Active Fire Incident\n\n"
                "**Risk Assessment:** High propagation probability based on standard urban fuel loads. Smoke inhalation risk in downwind zones. Structural integrity compromised in primary zone.\n\n"
                "**Recommended Action Plan:**\n"
                "1. **Evacuation Corridor:** Establish a perimeter of 500m around the point of origin. Instruct citizens to evacuate upwind. \n"
                "2. **Resource Allocation:** Deploy 3x Fire Engines, 1x Aerial Ladder, 2x BLS Ambulances, and 1x ALS Command Unit.\n"
                "3. **Responder Instructions:** Focus on containment first to prevent lateral spread to adjacent structures. Coordinate with municipal water board for hydrant pressure routing.\n"
                "4. **Citizen Broadcast:** 'URGENT: Structural fire active in Sector 4. Evacuate immediately via North Route towards City Park. Keep doors/windows closed to block smoke.'"
            )
        elif "flood" in prompt_lower:
            return (
                "### 🌊 AEGIS X AI Operational Alert: Rising Flood Levels\n\n"
                "**Risk Assessment:** Significant runoff. Potential compromise of low-lying sub-stations and transit tunnels. High risk of electrical hazards.\n\n"
                "**Recommended Action Plan:**\n"
                "1. **Evacuation Corridor:** Immediate evacuation of all basements and ground-floor units in the flood zone. Direct occupants to high-ground shelters.\n"
                "2. **Resource Allocation:** Deploy 2x Swift Water Rescue Teams, 4x High-Clearance Utility Trucks, 2x Police units for road closures, and 1x Emergency Power Unit.\n"
                "3. **Responder Instructions:** Set up floating barricades at intersections with depth exceeding 15cm. Secure power grid terminals in sub-sectors A & B.\n"
                "4. **Citizen Broadcast:** 'URGENT: Flash flooding is occurring. Avoid underpasses and low-lying roads. Head to the nearest elevated shelter or municipal building.'"
            )
        elif "collapse" in prompt_lower or "building" in prompt_lower:
            return (
                "### 🏢 AEGIS X AI Operational Alert: Structural Collapse Event\n\n"
                "**Risk Assessment:** Extremely high threat of secondary collapse. Trap hazards within voids. Dust plume inhalation and utility line leakage (natural gas, electrical line snapping).\n\n"
                "**Recommended Action Plan:**\n"
                "1. **Evacuation Corridor:** 100m absolute exclusionary zone for non-first responders. 300m dust protection perimeter.\n"
                "2. **Resource Allocation:** Dispatch Search & Rescue Dogs (USAR), Heavy Rescue Cranes, 3x ALS Ambulances, and Gas/Power Utility shutoff crews.\n"
                "3. **Responder Instructions:** Cut main utility inflows immediately. Deploy structural shoring before initiating deep void search. Implement acoustic search protocols.\n"
                "4. **Citizen Broadcast:** 'CRITICAL: Building failure. Evacuate the surrounding streets to allow emergency vehicles clear access. Use masks or wet cloths to filter dust.'"
            )
        elif "chemical" in prompt_lower or "leak" in prompt_lower:
            return (
                "### ☣️ AEGIS X AI Operational Alert: Hazardous Material Release\n\n"
                "**Risk Assessment:** Airborne dispersion of toxic chemicals. Ground-level pooling of heavier-than-air gases. Water system contamination potential.\n\n"
                "**Recommended Action Plan:**\n"
                "1. **Evacuation Corridor:** Establish a dynamic wind-direction buffer. Citizens downwind must shelter-in-place in upper levels with sealed ventilation.\n"
                "2. **Resource Allocation:** Deploy Hazmat Team A, Decontamination Units, 2x ALS Ambulances, and environmental containment specialists.\n"
                "3. **Responder Instructions:** Operate in full Class-A personal protective equipment. Set up clean/hot zone thresholds. Implement foam spray to suppress vapor cloud.\n"
                "4. **Citizen Broadcast:** 'ALERT: Chemical leak detected. If downwind, stay indoors, close all vents, seal door gaps with damp towels. Turn off air conditioners.'"
            )
        
        # General Copilot guidance
        return (
            "### 🛡️ AEGIS X Emergency Intelligence Copilot\n\n"
            "**System Status:** Ready to coordinate response. Waiting for specific geospatial triggers.\n\n"
            "**General Dispatch Guidelines:**\n"
            "- Always verify severity: **Low** (deploy single local unit), **Medium** (deploy standard task force), **High** (multi-agency response), **Critical** (activate state-level command center).\n"
            "- Coordinate hospital capacity: Route casualties to hospitals with >20% current bed availability.\n"
            "- OSRM routing is actively suggesting paths with lowest traffic density.\n\n"
            "*How can I help you simulate, assess, or mitigate this crisis?*"
        )
# Instantiate the service
ai_copilot = AICopilotService()
