# Mobile Number Validator Using DFA

A modern, mobile-inspired interactive web application that validates Indian 10-digit mobile numbers using **Deterministic Finite Automata (DFA)** theory.

Built strictly with:
- **HTML5** (Semantic structure & pure SVG state diagram)
- **CSS3** (Obsidian dark aesthetic, magenta/purple gradients, mobile capsule UI)
- **Vanilla JavaScript** (Automata simulation engine, Web Audio synthesizer, canvas particles)
- **Zero external frameworks or libraries** (No React, Vite, Node.js, Bootstrap, Tailwind, or CDNs)

---

## 👥 Credits
**Developed by Swapnali Pharande, Aditi Deshmukh, Manaswi Gaikwad, Vaishnavi Lohar**

---

## 📐 DFA Formal Definition

### Language
$$L = \{ w \in \{0,1,2,3,4,5,6,7,8,9\}^{10} \mid w[0] \in \{6,7,8,9\} \}$$

### Formal 5-Tuple: $M = (Q, \Sigma, \delta, q_0, F)$
1. **$Q$ (States)**:
   $$Q = \{ q_0, q_1, q_2, q_3, q_4, q_5, q_6, q_7, q_8, q_9, q_{10}, qD \}$$
   - $q_0$: Start state (0 digits consumed).
   - $q_1$: 1 valid prefix digit consumed ($\in \{6,7,8,9\}$).
   - $q_2 \dots q_9$: Intermediate states counting digits 2 through 9.
   - $q_{10}$: Final accepting state (exactly 10 valid digits consumed).
   - $qD$: Dead / Trap state for syntax or length violations.

2. **$\Sigma$ (Alphabet)**:
   $$\Sigma = \{ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 \}$$

3. **$\delta$ (Transition Function)**:
   - $\delta(q_0, a) = q_1$ for $a \in \{6, 7, 8, 9\}$
   - $\delta(q_0, a) = qD$ for $a \in \{0, 1, 2, 3, 4, 5\}$ or $a \notin \Sigma$
   - $\delta(q_i, a) = q_{i+1}$ for $i \in \{1, 2, \dots, 9\}$ and $a \in \Sigma$
   - $\delta(q_i, a) = qD$ for $i \in \{1, 2, \dots, 9\}$ and $a \notin \Sigma$
   - $\delta(q_{10}, a) = qD$ for any $a$ (extra digits exceed length 10)
   - $\delta(qD, a) = qD$ for any $a$ (trap loop)

4. **$q_0$ (Start State)**:
   $$q_0 \in Q$$

5. **$F$ (Accepting State)**:
   $$F = \{ q_{10} \} \subseteq Q$$

---

## 🚀 How to Run

Simply open `index.html` in any modern web browser:

```bash
# Windows
start index.html

# Mac
open index.html

# Linux
xdg-open index.html
```
