# HW02 RAG companion

An interactive explainer for **94-844 Generative AI Lab, HW02 (Retrieval-Augmented Generation)** at Carnegie Mellon, Fall 2026.

**Open it:** https://rzrizaldy.github.io/hw02-rag-companion/

The site teaches the ideas behind the homework without giving away its results. Every demo runs on **Plaid House**, a tiny made-up residence guide (~950 words), so students can see every chunk at once and then repeat the idea on the real handbook in their own notebook.

- **The big picture:** an animated walk from document to chunks, vectors, store, search and judge.
- **Meaning as direction:** drag two document arrows and see when cosine, dot product and L2 disagree.
- **Chunking lab:** re-cut the guide and watch whether an answer stays whole.
- **Search:** ask anything. Your question is embedded in the browser with `all-MiniLM-L6-v2` (the notebook's model) and drawn as a dartboard with a top-k circle. "Mine" searches the chunks you made in the lab.
- **Precision and recall:** every chunk ranked, with P/R curves as k grows.
- **Question index** and **LLM judge**, explained as concepts.
- **Ask the TA:** the course FAQ plus short concept answers, searchable in your own words.

Data is built by `ta_run/export_companion_data.py` from `ta_run/companion_toy_guide.txt` and `ta_run/companion_faq.md`.

Static site, no build step. To run it locally: `python3 -m http.server 8742`, then open http://localhost:8742.
