"""
Network topology router for NEXUS Network Intelligence API.
"""

from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Query, HTTPException

from api.schemas import EdgeModel, NodeModel, TopologyResponse
from simulator.graph_builder import build_demo_graph, build_experiment_graph

router = APIRouter()


@router.get(
    "/network/topology",
    response_model=TopologyResponse,
    summary="Get Network Topology",
    description="Retrieve the uninitialized baseline network topology ('demo' 8-node or 'experiment' 25-node).",
)
def get_network_topology(
    type: str = Query(
        default="demo",
        description="Topology type: 'demo' (8-node) or 'experiment' (25-node)",
    ),
    seed: int = Query(default=42, description="Random seed used when generating experiment topology"),
) -> TopologyResponse:
    """Return static topology structure with nodes and links."""
    clean_type = type.strip().lower()
    if clean_type == "demo":
        graph = build_demo_graph()
        src, dst = 0, 7
    elif clean_type == "experiment":
        graph = build_experiment_graph(num_nodes=25, seed=seed)
        src, dst = 0, 24
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid topology type '{type}'. Must be 'demo' or 'experiment'.",
        )

    nodes: list[NodeModel] = []
    for n in graph.nodes():
        role = "intermediate"
        if n == src:
            role = "source"
        elif n == dst:
            role = "destination"

        nodes.append(
            NodeModel(
                id=int(n),
                enabled=bool(graph.nodes[n].get("enabled", True)),
                role=role,
                incident_links=len(list(graph.neighbors(n))),
            )
        )

    edges: list[EdgeModel] = []
    for u, v, data in graph.edges(data=True):
        edges.append(
            EdgeModel(
                source=min(u, v),
                target=max(u, v),
                latency=round(float(data["latency"]), 2),
                packet_loss=round(float(data["packet_loss"]), 2),
                bandwidth=round(float(data["bandwidth"]), 2),
                congestion=round(float(data["congestion"]), 2),
                enabled=bool(data.get("enabled", True)),
                on_route=False,
            )
        )

    return TopologyResponse(
        topology_type=clean_type,
        num_nodes=graph.number_of_nodes(),
        num_edges=graph.number_of_edges(),
        nodes=nodes,
        edges=edges,
    )
