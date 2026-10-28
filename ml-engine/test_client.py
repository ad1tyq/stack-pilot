"""Test client for StackPilot ML Inference Engine."""
import json
import requests

BASE_URL = "http://127.0.0.1:8000"


def test_predict(stack, label):
    print(f"\n--- Testing Stack: {label} {stack} ---")
    payload = {"selected_components": stack, "max_recommendations": 5}
    try:
        res = requests.post(f"{BASE_URL}/predict", json=payload, timeout=5)
        res.raise_for_status()
        data = res.json()
        print("Normalized Selected:", data["selected"])
        print("Recommendations:")
        for idx, rec in enumerate(data["recommendations"], 1):
            pct = int(rec["confidence"] * 100)
            print(f"  [{idx}] {rec['component'].upper()} ({pct}% confidence, score: {rec['score']})")
            print(f"      Rationale: {rec['rationale']}")
            print(f"      Source   : {rec['engine_source']}")
    except Exception as e:
        print(f"Error testing stack {stack}: {e}")


def main():
    try:
        health = requests.get(f"{BASE_URL}/health", timeout=5).json()
        print("Health Check:", health)
    except Exception as e:
        print("Health check failed:", e)
        return

    test_predict(["fastapi", "postgresql"], "Modern Python Web API")
    test_predict(["spring-boot", "postgresql"], "Enterprise Java")
    test_predict(["express", "mongodb"], "Node.js Document Stack")


if __name__ == "__main__":
    main()
