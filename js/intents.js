/* ============================================================
   Rule-based response paths for the terminal: short natural-
   language phrases map to existing commands, and one-word typos
   get a "did you mean". Anything these don't catch prints
   "command not found".
   ============================================================ */
(() => {
  "use strict";

  const pick = list => list[Math.floor(Math.random() * list.length)];

  // [phrases, result]; result is { cmd } (run an existing command) or { text } (print html).
  // Strict: the WHOLE input must be one of the phrases (trailing ?/!/. allowed),
  // so a keyword buried in a longer sentence never triggers anything.
  const rule = (phrases, result) => [new RegExp(`^(?:${phrases})[?!.]*$`), result];
  const INTENTS = [
    rule("(?:h+i+|h+e+l+o+|h+e+[yi]+|yo+|sup|hola|howdy|hiya|good ?(?:morning|afternoon|evening|night)|gm|morning)(?: there| anant)?", () => ({ text: pick([
      "hey 👋 type <span class='term-cmd'>help</span> to see what this shell can do.",
      "hello! try <span class='term-cmd'>whoami</span>, or just ask me something.",
      "hi there — <span class='term-cmd'>skills</span>, <span class='term-cmd'>experience</span>, or <span class='term-cmd'>contact</span>?"
    ]) })),
    rule("thanks?|thank you|thx|ty", () => ({ text: pick(["anytime.", "np 🙂", "glad it helped."]) })),
    rule("hire|hire me|hiring|are you hiring|open to work", () => ({ cmd: "sudo hire-anant" })),
    rule("amd", () => ({ text: "Anant signed on as a Design Verification intern at AMD (NBIO / chiplet interconnect), Vancouver, May–Dec 2027. <span class='term-cmd'>experience</span> has the rest." })),
    rule("skill|tech stack|stack|languages", () => ({ cmd: "skills" })),
    rule("work history|work experience|jobs|career", () => ({ cmd: "experience" })),
    rule("email|e-mail|linkedin|github|socials", () => ({ cmd: "contact" })),
    rule("r[eé]sum[eé]|cv", () => ({ cmd: "resume" })),
    rule("stat|metrics|numbers", () => ({ cmd: "stats" })),
    rule("about|about me|about anant|who is anant", () => ({ cmd: "whoami" })),
    rule("commands|what can you do", () => ({ cmd: "help" }))
  ];

  // Only short phrases are handled by rules.
  const MAX_WORDS = 5;

  const match = key => {
    if (!key || key.split(" ").length > MAX_WORDS) return null;
    for (const [re, res] of INTENTS) if (re.test(key)) return res();
    return null;
  };

  const distance = (a, b) => {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
    return dp[a.length][b.length];
  };

  // single-token typos only ("skils" -> "skills")
  const nearest = (key, candidates) => {
    if (!key || key.includes(" ") || key.length < 3) return null;
    const limit = key.length <= 4 ? 1 : 2;
    let best = null, bestD = limit + 1;
    for (const c of candidates) {
      const d = distance(key, c);
      if (d < bestD) { best = c; bestD = d; }
    }
    return best;
  };

  window.akIntents = { match, nearest };
})();
