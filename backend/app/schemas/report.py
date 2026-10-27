from typing import List, Dict, Any
from pydantic import BaseModel


class DashboardStatsResponse(BaseModel):
    total_participants: int
    total_teams: int
    total_volunteers: int
    total_tickets_issued: int
    total_tickets_redeemed: int
    pending_tasks: int
    active_stage_team: str = "None"
    recent_scans: List[Dict[str, Any]] = []


class GlobalAuditLogResponse(BaseModel):
    id: str
    actor_name: str
    action: str
    target_type: str
    target_id: str
    details: Dict[str, Any] = {}
    created_at: str
