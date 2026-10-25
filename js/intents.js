/* ============================================================
   Rule-based response paths for the terminal: short natural-
   language phrases map to existing commands, and one-word typos
   get a "did you mean". Anything these don't catch falls through
   to the (optional) in-browser model in ai.js.
   ============================================================ */
(() => {
  "use strict";

  const pick = list => list[Math.floor(Math.random() * list.length)];

  // [pattern, result]; result is { cmd } (run an existing command) or { text } (print html)
  const INTENTS = [
    [/^(h+i+|h+e+l+o+|h+e+[yi]+|yo+|sup|hola|howdy|hiya|good ?(morning\w*|afternoon|evening|night)|gm|morning\w*)(?![a-z])/, () => ({ text: pick([
      "hey 👋 type <span class='term-cmd'>help</span> to see what this shell can do.",
      "hello! try <span class='term-cmd'>whoami</span>, or just ask me something.",
      "hi there — <span class='term-cmd'>skills</span>, <span class='term-cmd'>experience</span>, or <span class='term-cmd'>contact</span>?"
    ]) })],
    [/\b(thanks?|thank you|thx|ty)\b/, () => ({ text: pick(["anytime.", "np 🙂", "glad it helped."]) })],
    [/\b(ily+|love (you|u)|luv (you|u)|i love (you|u))\b/, () => ({ text: pick([
      "aww 🥹 i'm a shell script with feelings. type <span class='term-cmd'>contact</span> if you want to tell the human.",
      "that's the nicest thing anyone's piped into stdin today."
    ]) })],
    [/\b(wh?ats? ?up+|wassup+|sup+|what'?s new)\b/, () => ({ text: pick([
      "not much, just parsing commands. you?",
      "idling at a prompt, waiting for someone interesting. hi 👋"
    ]) })],
    [/\bhow (are|r) (you|u|ya)\b|\bhru\b/, () => ({ text: "running smoothly, zero known regressions today. how about you?" })],
    [/\b(your|ur) name\b|\bwho are (you|u)\b|\bwhat are (you|u)\b/, () => ({ text: "i'm AetherShell-lite, the little terminal on Anant's portfolio. for the human behind it, try <span class='term-cmd'>whoami</span>." })],
    [/\b(lol|lmao|haha+|hehe+)\b/, () => ({ text: pick(["😄", "glad that landed.", "i'll take it."]) })],
    [/^(bye|goodbye|cya|see ya|quit|logout|logoff)\b/, () => ({ text: "you can leave, but the résumé stays. <span class='term-cmd'>resume</span>" })],
    [/\b(hire|hiring|recruit|available|opportunit|open to work)/, () => ({ cmd: "sudo hire-anant" })],
    [/\bamd\b/, () => ({ text: "Anant signed on as a Design Verification intern at AMD (NBIO / chiplet interconnect), Vancouver, May–Dec 2027. <span class='term-cmd'>experience</span> has the rest." })],
    [/\b(skills?|stack|tech|tools?|languages?|good at|know)\b/, () => ({ cmd: "skills" })],
    [/\b(experience|work history|jobs?|interns?|employ|career|work(ed)?)\b/, () => ({ cmd: "experience" })],
    [/\b(contact|e-?mail|reach|linkedin|github|socials?)\b/, () => ({ cmd: "contact" })],
    [/\b(r[eé]sum[eé]|cv)\b/, () => ({ cmd: "resume" })],
    [/\b(stats?|numbers?|metrics?|achievements?|accomplish\w*)\b/, () => ({ cmd: "stats" })],
    [/\b(who|about|yourself|anant|introduce)\b/, () => ({ cmd: "whoami" })],
    [/\b(help|commands?|what can (you|i) do)\b/, () => ({ cmd: "help" })]
  ];

  // Only short phrases are handled by rules; longer questions go to the model.
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
