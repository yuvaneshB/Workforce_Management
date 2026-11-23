import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.agents.central_agent_orchestrator import central_agent_orchestrator


def run_regression_suite():
    print("=" * 80)
    print("ROOT CAUSE FIX REGRESSION & VERIFICATION SUITE")
    print("=" * 80)

    # -------------------------------------------------------------------------
    # PART 1: THE EXACT BUG QUERY
    # "Which employee is best in September?"
    # -------------------------------------------------------------------------
    print("\n[PART 1: BUG REPRODUCTION & FIX CHECK]")
    q_bug = "Which employee is best in September?"
    conv_bug = "test-bug-reproduction-01"
    res_bug = central_agent_orchestrator.execute_query(q_bug, conversation_id=conv_bug)

    print(f"Query: '{q_bug}'")
    print(f"Direct Answer: {res_bug.get('direct_answer')}")
    print(f"Selected Agents: {res_bug.get('selected_agents')}")

    # Check 1: Must NOT be general attendance report
    assert "Factory floor attendance is verified" not in res_bug.get("answer", "")
    assert "SMT Production records the highest absenteeism hotspot" not in res_bug.get("direct_answer", "")

    # Check 2: Must require clarification with 3 distinct options
    assert "Clarification Needed" in res_bug.get("answer", "")
    assert "1. **Production performance**" in res_bug.get("answer", "")
    assert "2. **Attendance and punctuality**" in res_bug.get("answer", "")
    assert "3. **Overall performance (combined metrics)**" in res_bug.get("answer", "")
    print("-> PASS: 'Which employee is best in September?' correctly triggers 3-option clarification without returning attendance report.")

    # -------------------------------------------------------------------------
    # PART 2: THE 5 INDEPENDENT TARGET QUESTIONS FROM STEP 6
    # -------------------------------------------------------------------------
    print("\n[PART 2: STEP 6 FIVE TARGET QUESTIONS]")

    # Target 1: Which employee is best in September? (Checked in Part 1)
    print("\n1. 'Which employee is best in September?' -> Verified in Part 1 (PASS)")

    # Target 2: Which department has highest absenteeism?
    q_dept = "Which department has highest absenteeism?"
    res_dept = central_agent_orchestrator.execute_query(q_dept)
    print(f"\n2. Query: '{q_dept}'")
    print(f"Direct Answer: {res_dept.get('direct_answer')}")
    assert "SMT Production" in res_dept.get("direct_answer", "")
    assert "5.8%" in res_dept.get("direct_answer", "")
    print("-> PASS: Identified SMT Production with 5.8% absenteeism.")

    # Target 3: Who produced the highest output?
    q_out = "Who produced the highest output?"
    res_out = central_agent_orchestrator.execute_query(q_out)
    print(f"\n3. Query: '{q_out}'")
    print(f"Direct Answer: {res_out.get('direct_answer')}")
    assert "Kumar Prasad" in res_out.get("direct_answer", "")
    assert "EMP-10286" in res_out.get("direct_answer", "")
    assert "9,039 units" in res_out.get("direct_answer", "")
    print("-> PASS: Identified Kumar Prasad (EMP-10286) with 9,039 units.")

    # Target 4: Which plant has the highest overtime?
    q_ot = "Which plant has the highest overtime?"
    res_ot = central_agent_orchestrator.execute_query(q_ot)
    print(f"\n4. Query: '{q_ot}'")
    print(f"Direct Answer: {res_ot.get('direct_answer')}")
    assert "Plant 1" in res_ot.get("direct_answer", "") or "IN-TN-01" in res_ot.get("direct_answer", "")
    assert "32,185" in res_ot.get("direct_answer", "")
    print("-> PASS: Identified Plant 1 (Chennai - IN-TN-01) with 32,185.0 overtime hours.")

    # Target 5: Why are employees leaving?
    q_att = "Why are employees leaving?"
    res_att = central_agent_orchestrator.execute_query(q_att)
    print(f"\n5. Query: '{q_att}'")
    print(f"Direct Answer: {res_att.get('direct_answer')}")
    assert "Attrition Agent" in res_att.get("selected_agents", [])
    assert "120" in res_att.get("answer", "")
    print("-> PASS: Routed to Attrition Agent with 120 verified leavers and root causes.")

    # -------------------------------------------------------------------------
    # PART 3: CONSECUTIVE MULTI-TURN QUESTIONS IN SAME CONVERSATION
    # Test for Context Contamination
    # -------------------------------------------------------------------------
    print("\n[PART 3: CONTEXT CONTAMINATION REGRESSION]")
    conv_multi = "test-session-cross-contamination"

    # Turn 1: Attendance question
    q_t1 = "Show absenteeism in Plant 1."
    print(f"\nTurn 1 Query: '{q_t1}'")
    res_t1 = central_agent_orchestrator.execute_query(q_t1, conversation_id=conv_multi)
    print(f"Turn 1 Answer: {res_t1.get('direct_answer')[:80]}...")
    assert "Attendance Agent" in res_t1.get("selected_agents", [])

    # Turn 2: Employee performance question (MUST NOT BE CONTAMINATED by Plant 1 or Attendance)
    q_t2 = "Which employee is best in September?"
    print(f"\nTurn 2 Query: '{q_t2}'")
    res_t2 = central_agent_orchestrator.execute_query(q_t2, conversation_id=conv_multi)
    print(f"Turn 2 Answer: {res_t2.get('direct_answer')}")
    # Must NOT be an attendance report
    assert "Factory floor attendance is verified" not in res_t2.get("answer", "")
    assert "Clarification Needed" in res_t2.get("answer", "")
    print("-> PASS: Turn 2 asked for employee clarification without reusing Turn 1 attendance result.")

    # Turn 3: Overtime question (MUST NOT BE CONTAMINATED by Employee clarification or Attendance)
    q_t3 = "Which plant has the highest overtime?"
    print(f"\nTurn 3 Query: '{q_t3}'")
    res_t3 = central_agent_orchestrator.execute_query(q_t3, conversation_id=conv_multi)
    print(f"Turn 3 Answer: {res_t3.get('direct_answer')[:100]}...")
    assert "Plant 1" in res_t3.get("direct_answer", "") or "IN-TN-01" in res_t3.get("direct_answer", "")
    assert "32,185" in res_t3.get("direct_answer", "")
    print("-> PASS: Turn 3 answered overtime ranking without contamination from Turn 2 or Turn 1.")

    print("\n" + "=" * 80)
    print("ALL REGRESSION & ROOT CAUSE TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 80)


if __name__ == "__main__":
    run_regression_suite()

