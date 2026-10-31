from langgraph.graph import END
from graph.state import GraphState


def route_next_agent(state: GraphState) -> str:
    """Dynamically route to the next agent in the plan, or END if finished."""

    if not state.success:
        return END

    plan = state.plan
    if not plan:
        return END

    completed = state.completed_tasks

    # If tasks list is empty or exhausted, but companies exist and research data is missing, search it up!
    if getattr(plan, "companies", None) and not state.research and "research_agent" not in completed:
        return "research_agent"

    if not plan.tasks:
        return END

    for task in plan.tasks:
        if task not in completed:
            return task

    return END


def route_after_guardrail(state: GraphState):

    if not state.success:
        return END

    if state.guardrail.category == "company_analysis":
        return "planner_agent"

    if state.guardrail.category == "general_finance":
        return "general_finance_agent"

    if state.guardrail.category == "irrelevant":
        return END

    return END
