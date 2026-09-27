import requests
import json
import base64
import numpy as np
import cv2

BASE_URL = "http://127.0.0.1:8000"

def test_phase3_interview_flow():
    print("--- 1. Testing /api/interview/start ---")
    start_payload = {
        "role": "Full-Stack Engineer",
        "company_name": "Google",
        "round_type": "technical",
        "interviewer_persona": "friendly_bar_raiser",
        "total_planned_turns": 3
    }
    r = requests.post(f"{BASE_URL}/api/interview/start", json=start_payload)
    assert r.status_code == 200, f"Start failed: {r.text}"
    start_data = r.json()
    session_id = start_data["session_id"]
    print("Session ID:", session_id)
    print("Turn 1 Question:", start_data["question"])
    print("Guidance:", start_data["guidance"])

    print("\n--- 2. Testing /api/interview/analyze-pose ---")
    # Generate dummy frame
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.ellipse(img, (320, 200), (80, 110), 0, 0, 360, (180, 160, 140), -1)
    _, buffer = cv2.imencode('.jpg', img)
    b64_frame = base64.b64encode(buffer).decode('utf-8')
    
    r_pose = requests.post(f"{BASE_URL}/api/interview/analyze-pose", json={"frame_base64": b64_frame})
    assert r_pose.status_code == 200, f"Analyze pose failed: {r_pose.text}"
    pose_metrics = r_pose.json()["metrics"]
    print("Pose Metrics:", pose_metrics)

    print("\n--- 3. Testing /api/interview/respond (Turn 1) ---")
    respond_payload = {
        "session_id": session_id,
        "turn_index": 1,
        "answer_text": "In our distributed service, we faced high latency (p99 ~ 850ms) due to unindexed database joins. I migrated hot entity lookups to Redis with cache-aside and added composite indexes, reducing p99 response time to 42ms under 15,000 QPS.",
        "posture_metrics": pose_metrics
    }
    r_resp1 = requests.post(f"{BASE_URL}/api/interview/respond", json=respond_payload)
    assert r_resp1.status_code == 200, f"Turn 1 respond failed: {r_resp1.text}"
    t1_data = r_resp1.json()
    print("Turn 1 Feedback Score:", t1_data["feedback"]["turn_score"])
    print("Strengths:", t1_data["feedback"]["strengths"])
    print("Turn 2 Question:", t1_data["next_question"])

    print("\n--- 4. Testing /api/interview/respond (Turn 2) ---")
    respond_payload2 = {
        "session_id": session_id,
        "turn_index": 2,
        "answer_text": "To handle cache stampede and concurrent cache misses, we used distributed mutex locks via Redis Redlock and pre-warmed hot keys using background async workers before peak traffic hours.",
        "posture_metrics": pose_metrics
    }
    r_resp2 = requests.post(f"{BASE_URL}/api/interview/respond", json=respond_payload2)
    assert r_resp2.status_code == 200, f"Turn 2 respond failed: {r_resp2.text}"
    t2_data = r_resp2.json()
    print("Turn 2 Feedback Score:", t2_data["feedback"]["turn_score"])
    print("Turn 3 Question:", t2_data["next_question"])

    print("\n--- 5. Testing /api/interview/finish (LLM Council Deliberation) ---")
    r_finish = requests.post(f"{BASE_URL}/api/interview/finish/{session_id}")
    assert r_finish.status_code == 200, f"Finish failed: {r_finish.text}"
    verdict = r_finish.json()
    print("Overall Placement Score:", verdict["overall_score"])
    print("Hiring Recommendation:", verdict["hiring_recommendation"])
    print("Dimension Scores:", verdict["dimension_scores"])
    print("Council Deliberations Count:", len(verdict["council_deliberation"]))
    print("Executive Summary:", verdict["executive_summary"])

    print("\n--- 6. Testing /api/interview/sessions list ---")
    r_sessions = requests.get(f"{BASE_URL}/api/interview/sessions")
    assert r_sessions.status_code == 200, f"Sessions list failed: {r_sessions.text}"
    sessions = r_sessions.json()
    print("Total Recorded Sessions:", len(sessions))
    assert any(s["id"] == session_id for s in sessions), "Session was not persisted in SQLite!"

    print("\n[OK] ALL PHASE 3 BACKEND INTERVIEW TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_phase3_interview_flow()
