# Central Workforce Intelligence — 30-Question Benchmark Report

## 1. Executive Performance Summary

- **Total Questions Evaluated**: 30
- **Overall Average Latency**: **37,059.2 ms**
- **Clean Tools Success Rate**: **100.0%** (30/30)
- **Partial Answer Rate (on Timeout)**: **0.0%** (0/30)
- **Legacy Fallback Rate**: **0.0%** (0/30)
- **Numbers Checked (Non-Fallback Answers)**: 536
- **Unverified Numbers Rate**: **5.4%** (29/536)

### Average Latency by Category

| Category | Question Count | Average Latency (ms) |
| :--- | :---: | :---: |
| **single-domain** | 17 | **37,501.9 ms** |
| **cross-domain** | 8 | **56,215.6 ms** |
| **ambiguous** | 3 | **4,964.6 ms** |
| **out-of-scope** | 2 | **4,811.7 ms** |

## 2. Per-Question Detailed Results Table

| ID | Category | Total (ms) | Tools | LLM Calls | Sup (ms) | Spec (ms) | Tool (ms) | Fallback / Partial Reason |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| q01_attendance | single-domain | 36,277 | 2 | 4 | 3,127 | 22,975 | 10,149 | None (Clean Tools Mode) |
| q02_overtime | single-domain | 26,511 | 1 | 3 | 2,849 | 18,755 | 4,893 | None (Clean Tools Mode) |
| q03_attrition | single-domain | 26,930 | 1 | 3 | 2,748 | 18,178 | 5,993 | None (Clean Tools Mode) |
| q04_vendor | single-domain | 31,940 | 2 | 5 | 10,212 | 14,010 | 7,705 | None (Clean Tools Mode) |
| q05_production | single-domain | 27,649 | 1 | 4 | 11,054 | 12,575 | 4,009 | None (Clean Tools Mode) |
| q06_skill | single-domain | 72,710 | 2 | 4 | 3,368 | 58,685 | 10,646 | None (Clean Tools Mode) |
| q07_cross_absenteeism_overtime | cross-domain | 40,330 | 2 | 6 | 18,393 | 29,174 | 10,624 | None (Clean Tools Mode) |
| q08_cross_vendor_attrition | cross-domain | 40,436 | 2 | 6 | 18,173 | 26,062 | 7,882 | None (Clean Tools Mode) |
| q09_cross_skills_planning | cross-domain | 91,532 | 5 | 10 | 25,071 | 90,795 | 32,254 | None (Clean Tools Mode) |
| q10_cross_plants_comparison | cross-domain | 42,612 | 4 | 7 | 18,815 | 35,347 | 15,341 | None (Clean Tools Mode) |
| q11_ambiguous_best_employee | ambiguous | 5,207 | 0 | 1 | 5,199 | 0 | 0 | None (Clean Tools Mode) |
| q12_out_of_scope_stock_price | out-of-scope | 4,507 | 0 | 1 | 4,495 | 0 | 0 | None (Clean Tools Mode) |
| q13_cross_ot_attrition | cross-domain | 49,450 | 2 | 6 | 19,566 | 46,024 | 10,137 | None (Clean Tools Mode) |
| q14_cross_shift_efficiency | cross-domain | 46,384 | 4 | 8 | 14,359 | 37,247 | 12,565 | None (Clean Tools Mode) |
| q15_cross_vendor_skills | cross-domain | 35,617 | 2 | 6 | 14,614 | 21,433 | 12,346 | None (Clean Tools Mode) |
| q16_cross_shortage_overtime | cross-domain | 103,364 | 2 | 7 | 31,888 | 24,848 | 8,762 | None (Clean Tools Mode) |
| q17_ambiguous_top_performer | ambiguous | 5,493 | 0 | 1 | 5,481 | 0 | 0 | None (Clean Tools Mode) |
| q18_out_of_scope_weather | out-of-scope | 5,117 | 0 | 1 | 5,107 | 0 | 0 | None (Clean Tools Mode) |
| q19_ambiguous_line_status | ambiguous | 4,194 | 0 | 1 | 4,189 | 0 | 0 | None (Clean Tools Mode) |
| q20_attendance_tanglish | single-domain | 27,651 | 1 | 3 | 2,450 | 18,431 | 6,755 | None (Clean Tools Mode) |
| q21_attendance_typo | single-domain | 23,404 | 1 | 3 | 2,541 | 14,703 | 6,146 | None (Clean Tools Mode) |
| q22_overtime_short | single-domain | 75,015 | 0 | 1 | 2,996 | 0 | 0 | None (Clean Tools Mode) |
| q23_overtime_typo | single-domain | 75,016 | 0 | 1 | 3,141 | 0 | 0 | None (Clean Tools Mode) |
| q24_attrition_tanglish | single-domain | 28,020 | 1 | 3 | 3,280 | 19,213 | 5,514 | None (Clean Tools Mode) |
| q25_attrition_short | single-domain | 24,654 | 1 | 3 | 2,804 | 17,750 | 4,087 | None (Clean Tools Mode) |
| q26_vendor_tanglish | single-domain | 23,432 | 2 | 4 | 2,663 | 13,617 | 7,135 | None (Clean Tools Mode) |
| q27_production_typo | single-domain | 25,232 | 1 | 4 | 10,015 | 11,676 | 3,527 | None (Clean Tools Mode) |
| q28_skill_short | single-domain | 51,958 | 2 | 4 | 2,899 | 35,078 | 13,971 | None (Clean Tools Mode) |
| q29_planning_shortage | single-domain | 27,028 | 2 | 4 | 2,766 | 14,398 | 9,847 | None (Clean Tools Mode) |
| q30_planning_tanglish | single-domain | 34,104 | 2 | 4 | 2,749 | 18,850 | 12,489 | None (Clean Tools Mode) |

## 3. Factual Grounding & Unverified Numbers

- Total Numbers Checked: 536
- Total Unverified Numbers: 29 (5.4%)

- **q02_overtime** (*"Which departments logged the highest overtime hours and what..."*): `4003531.96` — *"## Overtime Department-Wise Breakdown & Total Spend Analysis

---

### Executive Summary
Across both plants (IN-TN-01 & IN-KA-01), **58,433 total overtime hours** were logged over 23,700 shift records"*
- **q02_overtime** (*"Which departments logged the highest overtime hours and what..."*): `38794` — *"## Overtime Department-Wise Breakdown & Total Spend Analysis

---

### Executive Summary
Across both plants (IN-TN-01 & IN-KA-01), **58,433 total overtime hours** were logged over 23,700 shift records"*
- **q02_overtime** (*"Which departments logged the highest overtime hours and what..."*): `8841733.46` — *"## Overtime Department-Wise Breakdown & Total Spend Analysis

---

### Executive Summary
Across both plants (IN-TN-01 & IN-KA-01), **58,433 total overtime hours** were logged over 23,700 shift records"*
- **q02_overtime** (*"Which departments logged the highest overtime hours and what..."*): `100` — *"| Department | Overtime Hours | Overtime Cost (INR) | Share of Total OT |
|---|---|---|---|
| **Final Assembly** | **19,639** | **₹4,003,531.96** | **33.6%** |
| All Other Departments (combined) | 38,794 | ₹8,841,733.46 | 66.4% |
| **Factory Total** | **58,433** | **₹12,845,265.42** | **100%** |"*
- **q02_overtime** (*"Which departments logged the highest overtime hours and what..."*): `8658246.06` — *"## Overtime Department-Wise Breakdown & Total Spend Analysis

---

### Executive Summary
Across both plants (IN-TN-01 & IN-KA-01), **58,433 total overtime hours** were logged over 23,700 shift records"*
- **q02_overtime** (*"Which departments logged the highest overtime hours and what..."*): `4187019.36` — *"## Overtime Department-Wise Breakdown & Total Spend Analysis

---

### Executive Summary
Across both plants (IN-TN-01 & IN-KA-01), **58,433 total overtime hours** were logged over 23,700 shift records"*
- **q03_attrition** (*"What is the annual attrition rate and what are the top reaso..."*): `38.3` — *"#### Workforce Type Exit Distribution
| Category | Exits | Share |
|----------|-------|-------|
| Vendor/Contract Staff | 74 | 61.7% |
| Permanent Employees | 46 | 38.3% |"*
- **q04_vendor** (*"What is our current vendor contractor headcount share across..."*): `74` — *"- **74 contractors (11.4%)** are assigned but not currently active, indicating an attendance gap that warrants follow-up with the respective agencies."*
- **q04_vendor** (*"What is our current vendor contractor headcount share across..."*): `11.4` — *"- **74 contractors (11.4%)** are assigned but not currently active, indicating an attendance gap that warrants follow-up with the respective agencies."*
- **q07_cross_absenteeism_overtime** (*"Does high absenteeism in Shift C correlate with elevated ove..."*): `27377` — *"## Shift C: Absenteeism ↔ Overtime Correlation Analysis

### Yes — there is a clear and measurable correlation.

Shift C (Night 22:00–06:00) exhibits **high absenteeism** that is directly fuelling **e"*
- **q08_cross_vendor_attrition** (*"How does contractor reliance relate to employee attrition ve..."*): `38.3` — *"| Metric | Value | Insight |
|--------|-------|---------|
| Total Workforce | 1,700 | 1,053 permanent + 647 contracted |
| Contractor Reliance | **33.7%** | 1 in 3 shopfloor operators is agency-sourced |
| Total Exits | 120 (7.1% attrition rate) | — |
| Vendor/Contractor Exits | **74 (61.7% of all exits)** | Contractors exit at nearly **2× the rate** of permanent staff |
| Permanent Exits | 46 (38.3% of all exits) | Comparatively more stable |"*
- **q08_cross_vendor_attrition** (*"How does contractor reliance relate to employee attrition ve..."*): `51.7` — *"| Exit Reason | Count | Share | Contractor Link |
|-------------|-------|-------|----------------|
| 🔴 **Absconding (No Contact)** | 24 | 20.0% | Highest among contract workers with weak engagement loops and no structured onboarding |
| 🟠 **Better Salary Offer** | 18 | 15.0% | Contractors are more wage-elastic — easily poached by competing agencies/factories |
| **Early-Tenure Exits (<2 yrs)** | 20 | 16.7% | Contractor onboarding gaps lead to early disengagement and silent walkouts |
| **Regrettable Losses** | 62 | 51.7% | Over half of exits were skilled/hard-to-replace — a direct production continuity risk |"*
- **q10_cross_plants_comparison** (*"Compare Plant 1 Chennai and Plant 2 Bengaluru on production ..."*): `28` — *"Chennai is the larger facility (~28% more volume), but per-operator productivity and yield are virtually identical."*
- **q10_cross_plants_comparison** (*"Compare Plant 1 Chennai and Plant 2 Bengaluru on production ..."*): `45408` — *"## Plant Comparison: Chennai (IN-TN-01) vs Bengaluru (IN-KA-01)
### Production Volume & Attendance Reliability

---

### 📊 Production Volume

| Metric | Chennai (IN-TN-01) | Bengaluru (IN-KA-01) |
|--"*
- **q10_cross_plants_comparison** (*"Compare Plant 1 Chennai and Plant 2 Bengaluru on production ..."*): `81234` — *"## Plant Comparison: Chennai (IN-TN-01) vs Bengaluru (IN-KA-01)
### Production Volume & Attendance Reliability

---

### 📊 Production Volume

| Metric | Chennai (IN-TN-01) | Bengaluru (IN-KA-01) |
|--"*
- **q13_cross_ot_attrition** (*"Does continuous overtime lead to higher attrition rates in m..."*): `50` — *"| Metric | Final Assembly (D02) | Factory-Wide |
|---|---|---|
| **Share of Total OT Hours** | **33.6%** (19,639 hrs / ₹40.0L cost) | 58,433 hrs total |
| **Share of Total Exits** | **26.7%** (32 of 120 exits) | 7.1% attrition rate |
| **Top Chronic OT Worker** | Syed Ravi — **77.0 hrs / 35 shifts** (breaches 50 hr/mo limit) | 10 fatigue-risk employees flagged |
| **Leading Exit Reason** | Absconding (No Contact) — **20% of all exits** | Often a proxy for unmanaged burnout |
| **Workforce Type Most Affected** | Vendor/contract staff — **61.7% of all exits** | Also bear heaviest OT loads with least support |"*
- **q14_cross_shift_efficiency** (*"Which shift has the lowest attendance rate and does that shi..."*): `40.6` — *"| Metric | Shift A (Day) | Shift B (Evening) | Shift C (Night) ⚠️ |
|---|---|---|---|
| **Attendance Rate** | 69.4% | 69.1% | **67.7% (Lowest)** |
| **Absenteeism Rate** | 2.9% | 3.1% | **4.3% (Highest)** |
| **Downtime (Minutes)** | 164,134 (40.6%) | **171,778 (42.5% — Highest)** | 68,354 (16.9%) |
| **Production Achievement** | 100.0% | 100.4% | **97.2% (Lowest)** |
| **Output per Present Employee** | 120.6 units | 157.5 units | 133.4 units |"*
- **q14_cross_shift_efficiency** (*"Which shift has the lowest attendance rate and does that shi..."*): `42.5` — *"| Metric | Shift A (Day) | Shift B (Evening) | Shift C (Night) ⚠️ |
|---|---|---|---|
| **Attendance Rate** | 69.4% | 69.1% | **67.7% (Lowest)** |
| **Absenteeism Rate** | 2.9% | 3.1% | **4.3% (Highest)** |
| **Downtime (Minutes)** | 164,134 (40.6%) | **171,778 (42.5% — Highest)** | 68,354 (16.9%) |
| **Production Achievement** | 100.0% | 100.4% | **97.2% (Lowest)** |
| **Output per Present Employee** | 120.6 units | 157.5 units | 133.4 units |"*
- **q14_cross_shift_efficiency** (*"Which shift has the lowest attendance rate and does that shi..."*): `16.9` — *"| Metric | Shift A (Day) | Shift B (Evening) | Shift C (Night) ⚠️ |
|---|---|---|---|
| **Attendance Rate** | 69.4% | 69.1% | **67.7% (Lowest)** |
| **Absenteeism Rate** | 2.9% | 3.1% | **4.3% (Highest)** |
| **Downtime (Minutes)** | 164,134 (40.6%) | **171,778 (42.5% — Highest)** | 68,354 (16.9%) |
| **Production Achievement** | 100.0% | 100.4% | **97.2% (Lowest)** |
| **Output per Present Employee** | 120.6 units | 157.5 units | 133.4 units |"*
- **q16_cross_shortage_overtime** (*"Shift B shortage jaasthi iruka, is that why overtime hours i..."*): `13.17` — *"### ⏱️ Shift B Overtime Spike
- **6,092 OT hours** logged across 647 workers, costing **₹13.17 lakhs**
- **1,092 hours (17.9%) are purely absenteeism cover OT** — costing **₹2.33 lakhs** at the 2x premium rate
- **Final Assembly alone consumed 36% of all OT** (2,191 hours / ₹4.47 lakhs) — exactly where the Assembly Operator shortage is concentrated
- Average OT per worker: **9.4 hours/month**"*
- **q19_ambiguous_line_status** (*"Is everything running fine on the shop floor today?..."*): `30` — *"**Shift Staffing & Shortages** – Headcount availability vs 30-person baseline
5."*
- **q24_attrition_tanglish** (*"Why people leaving the company romba fast, what are top exit..."*): `38.3` — *"#### Workforce Type Breakdown
- **Vendor/Contract Exits**: 74 (61.7% of all departures)
- **Permanent Employee Exits**: 46 (38.3% of all departures)"*
- **q24_attrition_tanglish** (*"Why people leaving the company romba fast, what are top exit..."*): `78` — *"#### Top Exit Reasons / Drivers
| Rank | Exit Reason | Count | Share |
|---|---|---|---|
| 1 | **Absconding (No Contact)** | 24 | 20.0% |
| 2 | **Better Salary Offer** | 18 | 15.0% |
| — | Other reasons (contract completion, relocation, supervisor conflict, etc.) | 78 | 65.0% |"*
- **q24_attrition_tanglish** (*"Why people leaving the company romba fast, what are top exit..."*): `65.0` — *"#### Top Exit Reasons / Drivers
| Rank | Exit Reason | Count | Share |
|---|---|---|---|
| 1 | **Absconding (No Contact)** | 24 | 20.0% |
| 2 | **Better Salary Offer** | 18 | 15.0% |
| — | Other reasons (contract completion, relocation, supervisor conflict, etc.) | 78 | 65.0% |"*
- **q25_attrition_short** (*"Annual attrition rate?..."*): `38.3` — *"**Better Salary Offer** — 18 cases
- **Workforce Type Split:** Vendor/contract staff exits (**74 exits, 61.7%**) significantly outpace permanent staff exits (**46 exits, 38.3%**), indicating contractual churn dynamics as a major attrition lever."*
- **q26_vendor_tanglish** (*"Vendor contractor headcount evvalavu iruku across all agenci..."*): `74` — *"**Inactive/Unassigned Gap:** 74 contractors (647 assigned – 573 active) are currently not in active deployment across all agencies, indicating a natural buffer or attrition gap."*
- **q26_vendor_tanglish** (*"Vendor contractor headcount evvalavu iruku across all agenci..."*): `56.8` — *"**Concentration Risk:** The top 3 agencies (V05, V03, V01) together supply approximately 56.8% of all active contractors."*
- **q27_production_typo** (*"prodution target vs actual achievement for chennai plant..."*): `29505` — *"## Chennai Plant (IN-TN-01) — Production Target vs Actual Achievement

| Metric | Value |
|---|---|
| **Target Units** | 93,65,932 |
| **Actual Units** | 93,36,597 |
| **Variance** | -29,335 units |
|"*
- **q29_planning_shortage** (*"How many workers are we short in the night shift across asse..."*): `37` — *"By plant breakdown:
- IN-TN-01: 159 scheduled, 122 present — a gap of 37 workers (5 absent, 5 on leave, 12 late)."*

## 4. Top 3 Slowest Tool Executions

| Rank | Tool Name | Question ID | Duration (ms) | Output Size (Bytes) | Arguments |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | `analyze_skills` | q28_skill_short | **10,042.9 ms** | 1970 B | `{}` |
| 2 | `analyze_workforce_planning` | q09_cross_skills_planning | **9,841.5 ms** | 1534 B | `{"start_date": "2026-08-01", "end_date": "2026-08-01"}` |
| 3 | `analyze_skills` | q15_cross_vendor_skills | **9,418.4 ms** | 1970 B | `{}` |
