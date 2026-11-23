"""ORM models mapped to new enterprise schema tables in Neon PostgreSQL."""

from app.core.database import Base
from app.models.plant_master import PlantMaster
from app.models.department import DepartmentMaster, EmployeeDepartmentMapping
from app.models.section import SectionMaster, EmployeeSectionMapping
from app.models.vendor import VendorMaster, EmployeeVendorMapping
from app.models.shift_master import ShiftMaster
from app.models.employee_master import EmployeeMaster
from app.models.experience import EmployeeExperience
from app.models.skills import EmployeeSkillMapping
from app.models.training import EmployeeTraining
from app.models.roster import EmployeeShiftRoster
from app.models.requirement import WorkforceRequirement
from app.models.attendance import WorkforceAttendance
from app.models.overtime import OvertimeTransaction
from app.models.production import HourlyProduction
from app.models.attrition import AttritionTransaction

# Compatibility aliases
Workforce = EmployeeMaster
ShiftCalendar = ShiftMaster

__all__ = [
    "Base",
    "PlantMaster",
    "DepartmentMaster",
    "EmployeeDepartmentMapping",
    "SectionMaster",
    "EmployeeSectionMapping",
    "VendorMaster",
    "EmployeeVendorMapping",
    "ShiftMaster",
    "EmployeeMaster",
    "EmployeeExperience",
    "EmployeeSkillMapping",
    "EmployeeTraining",
    "EmployeeShiftRoster",
    "WorkforceRequirement",
    "WorkforceAttendance",
    "OvertimeTransaction",
    "HourlyProduction",
    "AttritionTransaction",
    "Workforce",
    "ShiftCalendar",
]
