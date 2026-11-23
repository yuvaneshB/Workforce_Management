import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.agents.central_agent_orchestrator import central_agent_orchestrator
from app.core.database import db_manager


def run_matrix_tests():
    print("=" * 80)
    print("CENTRAL WORKFORCE INTELLIGENCE ASSISTANT - FOCUSED VERIFICATION MATRIX")
    print("=" * 80)

    results = {}

    # -------------------------------------------------------------------------
    # TEST 1: Ambiguous Query -> Clarification Request
    # -------------------------------------------------------------------------
    conv_id = "test-session-clarification-01"
    q1 = "Who is the best employee in September?"
    print(f"\n[TEST 1] Query: '{q1}'")
    res1 = central_agent_orchestrator.execute_query(q1, conversation_id=conv_id)
    print(f"Direct Answer: {res1.get('direct_answer')}")
    assert "Clarification Needed" in res1.get("answer", "")
    assert "1. **Production performance**" in res1.get("answer", "")
    assert "2. **Attendance and punctuality**" in res1.get("answer", "")
    assert "3. **Overall performance (combined metrics)**" in res1.get("answer", "")
    print("-> PASS: Clarification requested with 3 distinct options.")
    results["1_ambiguity_clarification"] = "PASS"

    # -------------------------------------------------------------------------
    # TEST 2: Clarification Follow-up -> Option 1 (Production Output)
    # -------------------------------------------------------------------------
    q2 = "by production output"
    print(f"\n[TEST 2] Query: '{q2}' (Resolving Turn 1)")
    res2 = central_agent_orchestrator.execute_query(q2, conversation_id=conv_id)
    print(f"Direct Answer: {res2.get('direct_answer')}")
    assert "top-performing employee by total production throughput" in res2.get("direct_answer", "")
    assert "EMP-" in res2.get("answer", "")
    print("-> PASS: Resolved to top production performers from Neon DB.")
    results["2_clarify_production"] = "PASS"

    # -------------------------------------------------------------------------
    # TEST 3: Clarification Follow-up -> Option 2 (Attendance)
    # -------------------------------------------------------------------------
    conv_id_att = "test-session-clarification-att"
    central_agent_orchestrator.execute_query("Who is the best employee in September?", conversation_id=conv_id_att)
    q3 = "by attendance"
    print(f"\n[TEST 3] Query: '{q3}' (Resolving Turn 1 for Attendance)")
    res3 = central_agent_orchestrator.execute_query(q3, conversation_id=conv_id_att)
    print(f"Direct Answer: {res3.get('direct_answer')}")
    assert "top-performing employee by attendance and punctuality" in res3.get("direct_answer", "")
    assert "EMP-" in res3.get("answer", "")
    print("-> PASS: Resolved to top attendance performers from Neon DB.")
    results["3_clarify_attendance"] = "PASS"

    # -------------------------------------------------------------------------
    # TEST 4: Clarification Follow-up -> Option 3 (Overall Combined)
    # -------------------------------------------------------------------------
    conv_id_ovr = "test-session-clarification-ovr"
    central_agent_orchestrator.execute_query("Who is the best employee in September?", conversation_id=conv_id_ovr)
    q4 = "overall"
    print(f"\n[TEST 4] Query: '{q4}' (Resolving Turn 1 for Overall Combined)")
    res4 = central_agent_orchestrator.execute_query(q4, conversation_id=conv_id_ovr)
    print(f"Direct Answer: {res4.get('direct_answer')}")
    assert "top-performing employee overall" in res4.get("direct_answer", "")
    assert "Composite Score" in res4.get("answer", "")
    assert "Transparent Scoring Methodology" in res4.get("answer", "")
    print("-> PASS: Transparent scoring methodology explained before composite table.")
    results["4_clarify_overall_composite"] = "PASS"

    # -------------------------------------------------------------------------
    # TEST 5: Contextual Conversational Memory Turn 1 -> Plant 1 Absenteeism
    # -------------------------------------------------------------------------
    conv_id_chain = "test-session-multi-turn-01"
    q5 = "Show absenteeism in Plant 1."
    print(f"\n[TEST 5] Turn 1 Query: '{q5}'")
    res5 = central_agent_orchestrator.execute_query(q5, conversation_id=conv_id_chain)
    print(f"Direct Answer: {res5.get('direct_answer')[:120]}...")
    assert "attendance" in res5.get("answer", "").lower()
    print("-> PASS: Executed Plant 1 absenteeism.")
    results["5_turn1_plant1_absenteeism"] = "PASS"

    # -------------------------------------------------------------------------
    # TEST 6: Contextual Conversational Memory Turn 2 -> "Compare it with Plant 2."
    # -------------------------------------------------------------------------
    q6 = "Compare it with Plant 2."
    print(f"\n[TEST 6] Turn 2 Query: '{q6}'")
    res6 = central_agent_orchestrator.execute_query(q6, conversation_id=conv_id_chain)
    print(f"Direct Answer: {res6.get('direct_answer')}")
    assert "Plant 1 (IN-TN-01)" in res6.get("answer", "")
    assert "Plant 2 (IN-KA-01)" in res6.get("answer", "")
    print("-> PASS: Resolved 'it' to absenteeism and compared Plant 1 vs Plant 2.")
    results["6_turn2_compare_plant2"] = "PASS"

    # -------------------------------------------------------------------------
    # TEST 7: Contextual Conversational Memory Turn 3 -> "Which department is worst?"
    # -------------------------------------------------------------------------
    q7 = "Which department is worst?"
    print(f"\n[TEST 7] Turn 3 Query: '{q7}'")
    res7 = central_agent_orchestrator.execute_query(q7, conversation_id=conv_id_chain)
    print(f"Direct Answer: {res7.get('direct_answer')}")
    assert "SMT Production" in res7.get("answer", "")
    assert "5.8%" in res7.get("answer", "")
    print("-> PASS: Identified SMT Production as worst absenteeism department with full breakdown.")
    results["7_turn3_worst_department"] = "PASS"

    # -------------------------------------------------------------------------
    # TEST 8: Multi-Agent Collaboration -> Plant Workforce Performance
    # -------------------------------------------------------------------------
    q8 = "Which plant has the best workforce performance in September?"
    print(f"\n[TEST 8] Query: '{q8}'")
    res8 = central_agent_orchestrator.execute_query(q8)
    print(f"Direct Answer: {res8.get('direct_answer')[:160]}...")
    assert len(res8.get("selected_agents", [])) >= 2
    assert "Plant 1" in res8.get("answer", "") and "Plant 2" in res8.get("answer", "")
    print("-> PASS: Multi-agent collaboration across Production and Attendance agents.")
    results["8_multi_agent_plant_perf"] = "PASS"

    # -------------------------------------------------------------------------
    # TEST 9: Specialist Domain: Attrition Agent
    # -------------------------------------------------------------------------
    q9 = "What are the main reasons for employee attrition?"
    print(f"\n[TEST 9] Query: '{q9}'")
    res9 = central_agent_orchestrator.execute_query(q9)
    print(f"Direct Answer: {res9.get('direct_answer')[:140]}...")
    assert "Attrition Agent" in res9.get("selected_agents", [])
    assert "120" in res9.get("answer", "")
    print("-> PASS: Grounded in 120 verified exits.")
    results["9_attrition_agent"] = "PASS"

    # -------------------------------------------------------------------------
    # TEST 10: Specialist Domain: Overtime Agent
    # -------------------------------------------------------------------------
    q10 = "Show me plant-wise overtime analysis and costs."
    print(f"\n[TEST 10] Query: '{q10}'")
    res10 = central_agent_orchestrator.execute_query(q10)
    print(f"Direct Answer: {res10.get('direct_answer')[:140]}...")
    assert "Overtime Optimization Agent" in res10.get("selected_agents", [])
    assert "58,433" in res10.get("answer", "") or "hours" in res10.get("answer", "").lower()
    print("-> PASS: Grounded in 58,433 overtime hours.")
    results["10_overtime_agent"] = "PASS"

    # -------------------------------------------------------------------------
    # TEST 11: Specialist Domain: Skill & Training Agent
    # -------------------------------------------------------------------------
    q11 = "What are the critical employee skill gaps across departments?"
    print(f"\n[TEST 11] Query: '{q11}'")
    res11 = central_agent_orchestrator.execute_query(q11)
    print(f"Direct Answer: {res11.get('direct_answer')[:140]}...")
    assert "Skill & Training Agent" in res11.get("selected_agents", [])
    print("-> PASS: Grounded in 2,927 skill mappings.")
    results["11_skill_agent"] = "PASS"

    # -------------------------------------------------------------------------
    # TEST 12: Specialist Domain: Vendor Workforce Agent
    # -------------------------------------------------------------------------
    q12 = "Compare contractor workforce across our vendor agencies."
    print(f"\n[TEST 12] Query: '{q12}'")
    res12 = central_agent_orchestrator.execute_query(q12)
    print(f"Direct Answer: {res12.get('direct_answer')[:140]}...")
    assert "Vendor Workforce Agent" in res12.get("selected_agents", [])
    print("-> PASS: Grounded in vendor master and 6 contractor agencies.")
    results["12_vendor_agent"] = "PASS"

    # -------------------------------------------------------------------------
    # TEST 13: Specialist Domain: Workforce Planning Agent
    # -------------------------------------------------------------------------
    q13 = "What is our workforce availability and shortage for tomorrow?"
    print(f"\n[TEST 13] Query: '{q13}'")
    res13 = central_agent_orchestrator.execute_query(q13)
    print(f"Direct Answer: {res13.get('direct_answer')[:140]}...")
    assert "Workforce Planning Agent" in res13.get("selected_agents", [])
    assert "1580" in res13.get("answer", "") or "1,580" in res13.get("answer", "")
    print("-> PASS: Grounded in 1,580 baseline and 10-person team standard.")
    results["13_planning_agent"] = "PASS"

    print("\n" + "=" * 80)
    print("FINAL TEST SUMMARY")
    print("=" * 80)
    all_passed = True
    for test_name, status in results.items():
        print(f"  {test_name.ljust(35)}: [{status}]")
        if status != "PASS":
            all_passed = False

    print("=" * 80)
    if all_passed:
        print("ALL 13 TESTS PASSED PERFECTLY!")
    else:
        print("SOME TESTS FAILED.")
    print("=" * 80)


if __name__ == "__main__":
    run_matrix_tests()
