/* Runs the model off the main thread so the page never freezes. */
import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1";

// 360M params, 386 MB at q4 (the 0.5B Qwen was 786 MB and ~4 GB resident)
const MODEL = "onnx-community/SmolLM2-360M-Instruct-ONNX";
let generator = null;

self.onmessage = async ({ data }) => {
  if (data.type === "load") {
    try {
      const files = {};
      generator = await pipeline("text-generation", MODEL, {
        device: "webgpu",
        // not q4f16: its 16-bit math produced gibberish on Intel Xe integrated GPUs
        dtype: "q4",
        progress_callback: p => {
          if (p.status !== "progress" || !p.total) return;
          files[p.file] = [p.loaded, p.total];
          const vals = Object.values(files);
          const loaded = vals.reduce((a, v) => a + v[0], 0);
          const total = vals.reduce((a, v) => a + v[1], 0);
          self.postMessage({ type: "progress", value: Math.min(99, Math.round((loaded / total) * 100)) });
        }
      });
      // the first generation compiles GPU shaders and can take a minute on
      // integrated GPUs; do it now so a visitor's first question is fast
      await generator([{ role: "user", content: "hi" }], { max_new_tokens: 2, do_sample: false });
      self.postMessage({ type: "ready" });
    } catch (err) {
      self.postMessage({ type: "error", message: String(err) });
    }
  } else if (data.type === "ask") {
    try {
      const out = await generator(data.messages, {
        max_new_tokens: 60,
        do_sample: false,
        repetition_penalty: 1.1
      });
      self.postMessage({ type: "answer", id: data.id, text: String(out[0].generated_text.at(-1).content).trim() });
    } catch (err) {
      self.postMessage({ type: "answer", id: data.id, error: String(err) });
    }
  }
};
