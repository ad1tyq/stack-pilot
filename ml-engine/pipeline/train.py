import json
import os
import sys
import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix, save_npz
from sklearn.decomposition import TruncatedSVD
from sklearn.metrics.pairwise import cosine_similarity
from mlxtend.frequent_patterns import fpgrowth, association_rules

# Ensure pipeline modules are importable
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from normalizer import TechNormalizer


def build_seed_dataset():
    """Seed corpus of production-representative software architecture dependency manifests."""
    return [
        # Python Modern Async Stacks
        ["fastapi", "postgresql", "alembic", "redis", "docker", "sentry"],
        ["fastapi", "postgresql", "celery", "redis", "docker", "prometheus"],
        ["fastapi", "postgresql", "alembic", "celery", "redis", "docker"],
        ["fastapi", "mongodb", "redis", "docker", "sentry"],
        ["fastapi", "kafka", "elasticsearch", "docker", "prometheus", "grafana"],
        ["fastapi", "postgresql", "redis", "stripe", "docker"],

        # Python Django / Flask Stacks
        ["django", "postgresql", "celery", "redis", "sentry", "docker"],
        ["django", "mysql", "celery", "rabbitmq", "docker"],
        ["django", "postgresql", "stripe", "celery", "redis"],
        ["flask", "postgresql", "celery", "redis", "alembic", "docker"],
        ["flask", "mysql", "redis", "docker"],

        # Node.js / TypeScript Stacks
        ["express", "mongodb", "redis", "bullmq", "docker", "sentry"],
        ["express", "postgresql", "prisma", "redis", "docker"],
        ["express", "postgresql", "redis", "stripe", "docker"],
        ["express", "kafka", "elasticsearch", "mongodb", "docker"],
        ["nestjs", "postgresql", "prisma", "redis", "docker", "prometheus", "grafana"],
        ["nestjs", "mongodb", "bullmq", "redis", "sentry", "docker"],
        ["nestjs", "postgresql", "redis", "stripe", "docker"],

        # Enterprise Java / Spring Boot Stacks
        ["spring-boot", "postgresql", "flyway", "redis", "docker", "prometheus", "grafana"],
        ["spring-boot", "mysql", "kafka", "redis", "docker", "elasticsearch"],
        ["spring-boot", "postgresql", "kafka", "docker", "prometheus"],
        ["spring-boot", "postgresql", "redis", "stripe", "docker"],
        ["spring-boot", "mysql", "rabbitmq", "docker", "sentry"],
        ["spring-boot", "postgresql", "flyway", "rabbitmq", "docker", "prometheus"]
    ]


def evaluate_leave_one_out(transactions, all_items, item_sim_matrix, item_to_idx, idx_to_item, k=3):
    """Computes academic Recommender evaluation metrics: Precision@K, Recall@K, and MRR (Mean Reciprocal Rank)."""
    precisions = []
    recalls = []
    reciprocal_ranks = []

    for trans in transactions:
        if len(trans) < 2:
            continue
        for target in trans:
            # Leave-one-out: user stack without target
            known_stack = [item for item in trans if item != target]
            known_indices = [item_to_idx[item] for item in known_stack if item in item_to_idx]
            if not known_indices:
                continue

            # Aggregate similarity scores across known stack items
            agg_scores = np.zeros(len(all_items))
            for idx in known_indices:
                agg_scores += item_sim_matrix[idx]

            # Mask out known items
            for idx in known_indices:
                agg_scores[idx] = -1.0

            # Get Top-K recommendations
            top_k_indices = np.argsort(agg_scores)[::-1][:k]
            top_k_items = [idx_to_item[i] for i in top_k_indices]

            # Precision & Recall
            hit = 1 if target in top_k_items else 0
            precisions.append(hit / k)
            recalls.append(hit / 1.0) # single target item left out

            # Reciprocal Rank
            if hit:
                rank = top_k_items.index(target) + 1
                reciprocal_ranks.append(1.0 / rank)
            else:
                reciprocal_ranks.append(0.0)

    mean_p = float(np.mean(precisions)) if precisions else 0.0
    mean_r = float(np.mean(recalls)) if recalls else 0.0
    mean_mrr = float(np.mean(reciprocal_ranks)) if reciprocal_ranks else 0.0

    return {
        f"precision@{k}": round(mean_p, 4),
        f"recall@{k}": round(mean_r, 4),
        f"mrr@{k}": round(mean_mrr, 4),
        "evaluation_strategy": f"Leave-One-Out Cross-Validation (K={k})"
    }


def train_models():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ontology_path = os.path.join(base_dir, "data", "tech_ontology.json")
    models_dir = os.path.join(base_dir, "models")
    os.makedirs(models_dir, exist_ok=True)

    normalizer = TechNormalizer(ontology_path)
    raw_data = build_seed_dataset()

    # 1. Normalize transactions
    transactions = [normalizer.normalize(repo) for repo in raw_data]

    # Save raw manifests copy for transparency
    manifests_path = os.path.join(base_dir, "data", "raw_manifests.json")
    with open(manifests_path, "w", encoding="utf-8") as f:
        json.dump(transactions, f, indent=2)

    # 2. Build Vocabulary & Binary Interaction Matrix
    all_items = sorted(list(set(item for sublist in transactions for item in sublist)))
    item_to_idx = {item: idx for idx, item in enumerate(all_items)}
    idx_to_item = {idx: item for idx, item in enumerate(all_items)}

    vocab_path = os.path.join(models_dir, "vocabulary.json")
    with open(vocab_path, "w", encoding="utf-8") as f:
        json.dump({"item_to_idx": item_to_idx, "idx_to_item": idx_to_item}, f, indent=2)

    rows = []
    cols = []
    for row_idx, trans in enumerate(transactions):
        for item in trans:
            rows.append(row_idx)
            cols.append(item_to_idx[item])

    data = np.ones(len(rows), dtype=int)
    matrix = csr_matrix((data, (rows, cols)), shape=(len(transactions), len(all_items)))

    # 3. Model A: Truncated SVD Latent Space & Item-Item Cosine Similarity
    n_components = min(8, len(all_items) - 1)
    svd = TruncatedSVD(n_components=n_components, random_state=42)
    latent_item_features = svd.fit_transform(matrix.T)  # (Items x Latent Factors)
    item_sim_matrix = cosine_similarity(latent_item_features)
    sim_path = os.path.join(models_dir, "item_similarity.npz")
    save_npz(sim_path, csr_matrix(item_sim_matrix))

    # 4. Model B: Association Rules Mining (FP-Growth)
    df_bool = pd.DataFrame(matrix.toarray(), columns=all_items).astype(bool)
    freq_itemsets = fpgrowth(df_bool, min_support=0.1, use_colnames=True)
    rules = association_rules(freq_itemsets, metric="confidence", min_threshold=0.3)

    rules_serializable = []
    for _, row in rules.iterrows():
        rules_serializable.append({
            "antecedents": sorted(list(row["antecedents"])),
            "consequents": sorted(list(row["consequents"])),
            "support": round(float(row["support"]), 4),
            "confidence": round(float(row["confidence"]), 4),
            "lift": round(float(row["lift"]), 4)
        })

    rules_path = os.path.join(models_dir, "association_rules.json")
    with open(rules_path, "w", encoding="utf-8") as f:
        json.dump(rules_serializable, f, indent=2)

    # 5. Offline Academic Evaluation (Precision@K, Recall@K, MRR)
    eval_metrics = evaluate_leave_one_out(transactions, all_items, item_sim_matrix, item_to_idx, idx_to_item, k=3)
    eval_path = os.path.join(models_dir, "evaluation_metrics.json")
    with open(eval_path, "w", encoding="utf-8") as f:
        json.dump(eval_metrics, f, indent=2)

    print("=" * 60)
    print(" StackPilot ML Pipeline Training Complete")
    print("=" * 60)
    print(f"Total Transactions Processed : {len(transactions)}")
    print(f"Vocabulary Size (Unique Items): {len(all_items)}")
    print(f"Latent SVD Components         : {n_components}")
    print(f"Association Rules Mined       : {len(rules_serializable)}")
    print(f"Evaluation Metrics (K=3)      : {json.dumps(eval_metrics, indent=2)}")
    print("=" * 60)


if __name__ == "__main__":
    train_models()
