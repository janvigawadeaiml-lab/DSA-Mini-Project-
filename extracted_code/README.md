# C++ Checkers Game AI (DSA Mini Project)

An interactive, high-performance C++ Checkers Game AI engine implemented using core **Data Structures and Algorithms (DSA)**.

---

## 🚀 Data Structures Applied

| Data Structure | Role & Implementation in Project |
| :--- | :--- |
| **Bitboards (`uint64_t`)** | 64-bit integer bitmasks used to track Red pieces, White pieces, and Kings on the 32 playable squares for ultra-fast evaluation. |
| **Hash Tables (`std::unordered_map`)** | Implements a **Transposition Table** combined with **Zobrist Hashing** to cache evaluated board states ($O(1)$ lookup) and eliminate redundant game tree searches. |
| **Dynamic Arrays (`std::vector`)** | Used in legal move generation and multi-jump capture sequence tracking. |
| **Game Tree & DFS Recursion** | Explored using the **Minimax** algorithm with **Alpha-Beta Pruning** to minimize minimax evaluation nodes and achieve high search depth. |

---

## 🛠️ Build and Run Instructions

### Prerequisites
* `g++` compiler supporting C++17 or later.
* CMake (optional for standard build).

### Compiling via g++
```bash
g++ -std=c++17 -O3 checkers_ai.cpp -o checkers_ai
./checkers_ai
```

---

## 🎮 How to Play
* The board uses **32 playable dark squares** indexed from **0 to 31**.
* **Red pieces (`r`/`R`)** are controlled by the AI.
* **White pieces (`w`/`W`)** are controlled by the human player.
* Captures are **mandatory** according to standard Checkers rules.
* Enter the numeric index corresponding to your preferred move when prompted.
