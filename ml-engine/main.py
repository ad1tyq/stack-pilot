import json
import os
import sys
from contextlib import asynccontextmanager
from typing import List, Optional

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from scipy.sparse import load_npz

# Add pipeline directory to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from pipeline.normalizer import TechNormalizer


class RecommendationRequest(BaseModel):
    selected_components: List[str]
    max_recommendations: Optional[int] = 5


class RecommendationItem(BaseModel):
    component: str
    score: float
    confidence: float
    rationale: str
    engine_source: str


class RecommendationResponse(BaseModel):
    selected: List[str]
    recommendations: List[RecommendationItem]


class HealthResponse(BaseModel):
    status: str
    version: str
    vocabulary_size: int
    rules_count: int


# In-memory artifact storage
VOCAB = {}
ITEM_TO_IDX = {}
IDX_TO_ITEM = {}
ITEM_SIMILARITY = None
ASSOCIATION_RULES = []
NORMALIZER = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global VOCAB, ITEM_TO_IDX, IDX_TO_ITEM, ITEM_SIMILARITY, ASSOCIATION_RULES, NORMALIZER

    ontology_path = os.path.join(BASE_DIR, "data", "tech_ontology.json")
    vocab_path = os.path.join(BASE_DIR, "models", "vocabulary.json")
    sim_path = os.path.join(BASE_DIR, "models", "item_similarity.npz")
    rules_path = os.path.join(BASE_DIR, "models", "association_rules.json")

    NORMALIZER = TechNormalizer(ontology_path)

    if not os.path.exists(vocab_path) or not os.path.exists(sim_path) or not os.path.exists(rules_path):
        raise RuntimeError(
            "Model artifacts missing. Run `python pipeline/train.py` before starting the server."
        )

    with open(vocab_path, "r", encoding="utf-8") as f:
        VOCAB = json.load(f)
        ITEM_TO_IDX = VOCAB["item_to_idx"]
        IDX_TO_ITEM = {int(k): v for k, v in VOCAB["idx_to_item"].items()}

    ITEM_SIMILARITY = load_npz(sim_path).toarray()

    with open(rules_path, "r", encoding="utf-8") as f:
        ASSOCIATION_RULES = json.load(f)

    print(f"StackPilot ML Engine initialized with {len(ITEM_TO_IDX)} vocab items and {len(ASSOCIATION_RULES)} rules.")
    yield


app = FastAPI(
    title="StackPilot ML Inference Engine",
    version="1.0.0",
    description="Multi-layer architectural dependency recommender using FP-Growth and Truncated SVD.",
    lifespan=lifespan,
)

# Enable CORS for Spring Boot backend and frontend dev servers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="UP",
        version="1.0.0",
        vocabulary_size=len(ITEM_TO_IDX),
        rules_count=len(ASSOCIATION_RULES),
    )


@app.post("/predict", response_model=RecommendationResponse)
def predict(request: RecommendationRequest):
    if not NORMALIZER:
        raise HTTPException(status_code=500, detail="Normalizer is not loaded")

    normalized_input = NORMALIZER.normalize(request.selected_components)
    if not normalized_input:
        return RecommendationResponse(selected=[], recommendations=[])

    candidates = {}  # component -> {score, confidence, rationale, source}
    input_set = set(normalized_input)

    # 1. Layer 1: Association Rule Matching (FP-Growth Multi-Item Antecedents)
    for rule in ASSOCIATION_RULES:
        antecedents = set(rule["antecedents"])
        if antecedents.issubset(input_set):
            for target in rule["consequents"]:
                if target not in input_set:
                    conf = rule["confidence"]
                    lift = rule["lift"]
                    antecedents_str = ", ".join(sorted(list(antecedents)))
                    rationale = (
                        f"Frequently paired with [{antecedents_str}] in production "
                        f"(Confidence: {int(conf * 100)}%, Lift: {lift:.1f}x)"
                    )
                    score = float(conf * 1.25)
                    if target not in candidates or score > candidates[target]["score"]:
                        candidates[target] = {
                            "score": score,
                            "confidence": float(conf),
                            "rationale": rationale,
                            "source": "Association Rule (FP-Growth)",
                        }

    # 2. Layer 2: Collaborative Filtering (Truncated SVD Latent Space Cosine Similarity)
    for item in normalized_input:
        if item in ITEM_TO_IDX:
            idx = ITEM_TO_IDX[item]
            sim_scores = ITEM_SIMILARITY[idx]
            for target_idx, sim in enumerate(sim_scores):
                target_item = IDX_TO_ITEM[target_idx]
                if target_item not in input_set:
                    scaled_sim = float(sim)
                    rationale = f"High latent architectural affinity with {item}"
                    if target_item not in candidates:
                        candidates[target_item] = {
                            "score": scaled_sim,
                            "confidence": max(0.0, min(0.99, scaled_sim)),
                            "rationale": rationale,
                            "source": "Collaborative Filtering (SVD Latent Space)",
                        }
                    else:
                        # Blended ensemble score
                        candidates[target_item]["score"] += scaled_sim * 0.45

    # 3. Layer 3: Domain Constraint & Exclusion Rules
    # Mutual exclusivity for relational DBMS
    if "postgresql" in input_set and "mysql" in candidates:
        del candidates["mysql"]
    if "mysql" in input_set and "postgresql" in candidates:
        del candidates["postgresql"]

    # Mutual exclusivity for migration tools
    if "alembic" in input_set and "flyway" in candidates:
        del candidates["flyway"]
    if "flyway" in input_set and "alembic" in candidates:
        del candidates["alembic"]

    # Framework exclusivity: don't suggest alternate backend core runtimes if one already chosen
    backend_frameworks = {"fastapi", "flask", "django", "spring-boot", "express", "nestjs"}
    active_frameworks = input_set.intersection(backend_frameworks)
    if active_frameworks:
        for fw in backend_frameworks:
            if fw in candidates:
                del candidates[fw]

    # Rank and format results
    sorted_candidates = sorted(candidates.items(), key=lambda x: x[1]["score"], reverse=True)
    top_results = []
    max_k = request.max_recommendations or 5

    for comp, meta in sorted_candidates[:max_k]:
        top_results.append(
            RecommendationItem(
                component=comp,
                score=round(meta["score"], 3),
                confidence=round(min(meta["confidence"], 0.99), 2),
                rationale=meta["rationale"],
                engine_source=meta["source"],
            )
        )

    return RecommendationResponse(selected=normalized_input, recommendations=top_results)
