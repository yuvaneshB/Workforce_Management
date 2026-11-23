"""Compatibility module for public.employee_master.

Replaces old dim_workforce model with the new enterprise EmployeeMaster model.
"""

from app.models.employee_master import EmployeeMaster

Workforce = EmployeeMaster

__all__ = ["Workforce"]
