from pydantic import BaseModel
from typing import Optional

class CDRInput(BaseModel):
    call_id: str
    calling_number: str
    called_number: str
    call_start_time: str
    call_duration_sec: int
    call_type: str
    destination_country: str
    call_direction: str
    imei: Optional[str] = None
    cell_id: Optional[str] = None
    revenue: Optional[float] = 0.0

class CDRBatchInput(BaseModel):
    cdrs: list[CDRInput]