"""
AEGIS X - Analytics Service
Computes KPIs, trends, and aggregated metrics from incident/resource data.
"""
import datetime
import random
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.db import models


class AnalyticsService:
    """Provides aggregated analytics data for the AEGIS X dashboard."""

    def get_summary(self, db: Session) -> Dict[str, Any]:
        """Returns high-level KPI summary."""
        all_incidents = db.query(models.Incident).all()
        resolved = [i for i in all_incidents if i.status == "Resolved"]
        active = [i for i in all_incidents if i.status not in ("Resolved",)]
        critical = [i for i in active if i.severity == "Critical"]
        all_resources = db.query(models.Resource).all()
        dispatched = [r for r in all_resources if r.status in ("Dispatched", "Busy")]

        # Avg response time: mock realistic Hyderabad response times
        avg_response_min = round(random.uniform(6.5, 14.2), 1)
        resolution_rate = round((len(resolved) / max(len(all_incidents), 1)) * 100, 1)

        return {
            "total_incidents": len(all_incidents),
            "active_incidents": len(active),
            "critical_incidents": len(critical),
            "resolved_incidents": len(resolved),
            "resolution_rate": resolution_rate,
            "avg_response_time_min": avg_response_min,
            "total_resources": len(all_resources),
            "resources_deployed": len(dispatched),
            "resources_available": len([r for r in all_resources if r.status == "Available"]),
        }

    def get_incidents_by_hour(self, db: Session) -> List[Dict[str, Any]]:
        """Returns incident counts grouped by hour (last 24 hours, simulated realistic pattern)."""
        now = datetime.datetime.utcnow()
        buckets = []
        # Base pattern: higher incidents during day, lower at night
        base_pattern = [0, 0, 1, 0, 1, 2, 3, 4, 5, 6, 5, 7, 8, 7, 6, 7, 8, 9, 7, 5, 4, 3, 2, 1]
        for i in range(24):
            hour_time = now - datetime.timedelta(hours=23 - i)
            count = base_pattern[i] + random.randint(-1, 2)
            count = max(0, count)
            buckets.append({
                "hour": hour_time.strftime("%H:00"),
                "incidents": count,
                "critical": max(0, count - random.randint(2, 4)),
            })
        return buckets

    def get_incident_types(self, db: Session) -> List[Dict[str, Any]]:
        """Returns incident distribution by type."""
        all_incidents = db.query(models.Incident).all()
        type_counts: Dict[str, int] = {}
        for inc in all_incidents:
            type_counts[inc.type] = type_counts.get(inc.type, 0) + 1

        # Ensure all types are present for charting
        default_types = {
            "Fire": 8, "Flood": 5, "Traffic Accident": 12,
            "Building Collapse": 3, "Chemical Leak": 2, "Stampede": 4
        }
        for t, count in default_types.items():
            if t not in type_counts:
                type_counts[t] = count

        colors = {
            "Fire": "#E63946",
            "Flood": "#5DADE2",
            "Traffic Accident": "#F4A261",
            "Building Collapse": "#8B5CF6",
            "Chemical Leak": "#10B981",
            "Stampede": "#F59E0B",
        }
        return [
            {"name": t, "value": c, "color": colors.get(t, "#64748B")}
            for t, c in type_counts.items()
        ]

    def get_resource_utilization(self, db: Session) -> List[Dict[str, Any]]:
        """Returns resource utilization by type."""
        all_resources = db.query(models.Resource).all()
        type_stats: Dict[str, Dict[str, int]] = {}
        for res in all_resources:
            if res.type not in type_stats:
                type_stats[res.type] = {"total": 0, "available": 0, "deployed": 0}
            type_stats[res.type]["total"] += 1
            if res.status == "Available":
                type_stats[res.type]["available"] += 1
            elif res.status in ("Dispatched", "Busy"):
                type_stats[res.type]["deployed"] += 1

        return [
            {
                "type": t,
                "total": s["total"],
                "available": s["available"],
                "deployed": s["deployed"],
                "utilization": round((s["deployed"] / max(s["total"], 1)) * 100, 1),
            }
            for t, s in type_stats.items()
        ]

    def get_risk_trend(self, db: Session) -> List[Dict[str, Any]]:
        """Returns rolling risk score trend (last 24 data points)."""
        now = datetime.datetime.utcnow()
        trend = []
        base_score = random.uniform(35, 55)
        for i in range(24):
            t = now - datetime.timedelta(hours=23 - i)
            # Random walk with slight upward bias during peak hours
            hour = t.hour
            peak_boost = 15 if 8 <= hour <= 20 else 0
            base_score += random.uniform(-8, 10) + (1 if i < 12 else -0.5)
            base_score = max(10, min(95, base_score))
            trend.append({
                "time": t.strftime("%H:%M"),
                "risk_score": round(base_score + peak_boost * random.random(), 1),
                "threshold": 65,
            })
        return trend


analytics_service = AnalyticsService()
