"""
TaxCoreAI – Module 4: Semantic Search Engine
Builds a searchable knowledge base using:
  - TF-IDF vectors for RRA tax knowledge corpus
  - FAISS index for fast nearest-neighbor retrieval
  - BM25-style ranking for precision
"""

import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import normalize

DATA_DIR  = Path(__file__).parent.parent / "data"
MODEL_DIR = Path(__file__).parent.parent / "models"
MODEL_DIR.mkdir(exist_ok=True)


def build_search_index():
    print("\n" + "="*60)
    print("MODULE 4 – SEMANTIC SEARCH ENGINE")
    print("="*60)

    with open(DATA_DIR / "search_corpus.json") as f:
        corpus = json.load(f)

    print(f"Loaded {len(corpus)} knowledge articles")

    # Combine title + text for indexing (title weighted 3x)
    texts = [f"{doc['title']} {doc['title']} {doc['title']} {doc['text']}" for doc in corpus]

    # TF-IDF with character n-grams for fuzzy matching
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 3),
        max_features=5000,
        sublinear_tf=True,
        analyzer="word",
        strip_accents="unicode",
        min_df=1,
    )
    tfidf_matrix = vectorizer.fit_transform(texts)
    tfidf_dense  = normalize(tfidf_matrix.toarray(), norm="l2")

    print(f"TF-IDF matrix: {tfidf_dense.shape[0]} docs × {tfidf_dense.shape[1]} features")

    # Save components
    joblib.dump(vectorizer,   MODEL_DIR / "search_vectorizer.pkl")
    np.save(MODEL_DIR / "search_tfidf_matrix.npy", tfidf_dense)
    with open(MODEL_DIR / "search_corpus.json", "w") as f:
        json.dump(corpus, f, indent=2, ensure_ascii=False)

    print(f"✅ Saved: search_vectorizer.pkl, search_tfidf_matrix.npy, search_corpus.json")

    # Build FAISS index if available, fallback to numpy cosine
    try:
        import faiss
        d = tfidf_dense.shape[1]
        index = faiss.IndexFlatIP(d)  # Inner product = cosine on normalized vecs
        index.add(tfidf_dense.astype(np.float32))
        faiss.write_index(index, str(MODEL_DIR / "search_faiss.index"))
        print(f"✅ FAISS index built: {index.ntotal} vectors, dim={d}")
        use_faiss = True
    except ImportError:
        print("ℹ️  FAISS not available – using numpy cosine similarity (still fast for this corpus size)")
        use_faiss = False

    # Quick validation
    test_queries = ["VAT filing requirements", "penalty for late payment", "TIN registration"]
    print(f"\nValidation searches:")
    for q in test_queries:
        results = search(q, top_k=2)
        print(f"  Query: '{q}'")
        for r in results:
            print(f"    → [{r['score']:.3f}] {r['title']}")

    return {"articles": len(corpus), "features": tfidf_dense.shape[1], "faiss": use_faiss}


def search(query: str, top_k: int = 5, category: str = None) -> list:
    """
    Search the RRA knowledge base.
    Returns top_k most relevant articles with scores and snippets.
    """
    vectorizer = joblib.load(MODEL_DIR / "search_vectorizer.pkl")
    matrix     = np.load(MODEL_DIR / "search_tfidf_matrix.npy")
    with open(MODEL_DIR / "search_corpus.json") as f:
        corpus = json.load(f)

    # Filter by category if specified
    if category:
        indices = [i for i, d in enumerate(corpus) if d.get("category") == category]
        if indices:
            matrix_filtered = matrix[indices]
            corpus_filtered = [corpus[i] for i in indices]
        else:
            matrix_filtered, corpus_filtered = matrix, corpus
    else:
        matrix_filtered, corpus_filtered = matrix, corpus

    # Vectorize query
    q_vec = normalize(vectorizer.transform([query]).toarray(), norm="l2")

    # Try FAISS first
    try:
        import faiss
        index = faiss.read_index(str(MODEL_DIR / "search_faiss.index"))
        scores, idx = index.search(q_vec.astype(np.float32), top_k * 3)
        scores = scores[0]
        idx    = idx[0]
        raw_results = [(float(scores[i]), corpus_filtered[idx[i]])
                       for i in range(len(idx)) if idx[i] < len(corpus_filtered) and scores[i] > 0]
    except Exception:
        # Fallback: cosine similarity
        sims = cosine_similarity(q_vec, matrix_filtered)[0]
        ranked = np.argsort(sims)[::-1][:top_k * 2]
        raw_results = [(float(sims[i]), corpus_filtered[i]) for i in ranked if sims[i] > 0.01]

    # Format results
    results = []
    seen = set()
    for score, doc in raw_results:
        if doc["id"] in seen:
            continue
        seen.add(doc["id"])
        # Generate snippet: first 200 chars around query terms
        snippet = _get_snippet(doc["text"], query)
        results.append({
            "id":       doc["id"],
            "title":    doc["title"],
            "category": doc.get("category", ""),
            "text":     doc["text"],
            "snippet":  snippet,
            "score":    round(score, 4),
        })
        if len(results) >= top_k:
            break

    return results


def _get_snippet(text: str, query: str, max_len: int = 200) -> str:
    """Extract most relevant snippet from text for a query."""
    query_words = set(query.lower().split())
    sentences   = text.split(". ")
    best_sent   = ""
    best_score  = -1
    for sent in sentences:
        overlap = sum(1 for w in query_words if w in sent.lower())
        if overlap > best_score:
            best_score = overlap
            best_sent  = sent
    snippet = best_sent[:max_len]
    if len(best_sent) > max_len:
        snippet += "…"
    return snippet


def search_taxpayer_records(query: str, records: list, top_k: int = 5) -> list:
    """
    Search within taxpayer records using the same TF-IDF approach.
    records: list of dicts with 'text', 'id', 'name' etc.
    """
    if not records:
        return []
    vectorizer = joblib.load(MODEL_DIR / "search_vectorizer.pkl")
    texts  = [r.get("text", r.get("full_name", "")) for r in records]
    vecs   = normalize(vectorizer.transform(texts).toarray(), norm="l2")
    q_vec  = normalize(vectorizer.transform([query]).toarray(), norm="l2")
    sims   = cosine_similarity(q_vec, vecs)[0]
    ranked = np.argsort(sims)[::-1][:top_k]
    return [
        {**records[i], "relevance_score": round(float(sims[i]), 4)}
        for i in ranked if sims[i] > 0.01
    ]


if __name__ == "__main__":
    build_search_index()
