"""Compatibility module for shift calendar.

Replaces old dim_shift_calendar model with ShiftMaster.
"""

from app.models.shift_master import ShiftMaster

ShiftCalendar = ShiftMaster

__all__ = ["ShiftCalendar"]
