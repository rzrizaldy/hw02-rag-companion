# HW02 RAG companion

An interactive companion for **94-844 Generative AI Lab, HW02 (Retrieval-Augmented Generation)** at Carnegie Mellon, Fall 2026.

**Open it:** https://rzrizaldy.github.io/hw02-rag-companion/

What you can do:

- **Ask the handbook** in plain English. Your question is embedded in the browser with `all-MiniLM-L6-v2`, the same model as the notebook. Switch between three vector stores (50-word chunks, 4-sentence chunks, question index), change top-k, and view distances as cosine, dot, or squared L2.
- **Chunking lab:** re-cut the quiet-hours page and see where the answer lands.
- **Top-k ladder:** watch precision and recall change with k, using your own relevance labels or those from three LLM judges.
- **Question index, LLM judges, C.II table, cost calculator, report checklist.**
- **Ask the TA:** an FAQ you can search in your own words.

All numbers come from the TA's local run on 17 Nov 2026. Your Colab numbers can differ a little. The handbook text is CMU's public *The Word 2025–2026* student handbook.

Static site, no build step. To run it locally: `python3 -m http.server 8742`, then open http://localhost:8742.
